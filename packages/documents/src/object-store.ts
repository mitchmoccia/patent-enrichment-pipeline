import { createHash, createHmac } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

export class StorageUnavailable extends Error {
  readonly code = "PROVIDER_UNAVAILABLE";
  constructor(message: string) {
    super(message);
    this.name = "StorageUnavailable";
  }
}

export interface StoredObject {
  version: string;
  /** Honest driver name. Local storage is never reported as S3. */
  driver: "s3" | "local-filesystem";
}

export interface ObjectStore {
  readonly driver: "s3" | "local-filesystem" | "unconfigured";
  describe(): { ready: boolean; message: string };
  put(key: string, bytes: Uint8Array, contentType: string): Promise<StoredObject>;
  get(key: string): Promise<Uint8Array | null>;
}

export function unconfiguredStore(message: string): ObjectStore {
  return {
    driver: "unconfigured",
    describe: () => ({ ready: false, message }),
    put: () => Promise.reject(new StorageUnavailable(message)),
    get: () => Promise.resolve(null),
  };
}

export function localObjectStore(rootDir: string): ObjectStore {
  const root = resolve(rootDir);
  return {
    driver: "local-filesystem",
    describe: () => ({
      ready: true,
      message: "Local filesystem object store. This is not S3 and is not encrypted with KMS.",
    }),
    async put(key, bytes) {
      const path = safePath(root, key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes);
      return { version: "local-1", driver: "local-filesystem" };
    },
    async get(key) {
      try {
        return new Uint8Array(await readFile(safePath(root, key)));
      } catch {
        return null;
      }
    },
  };
}

export interface S3Config {
  bucket?: string;
  region?: string;
  kmsKeyId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

export function s3ObjectStore(config: S3Config): ObjectStore {
  const ready = Boolean(
    config.bucket &&
      config.region &&
      config.kmsKeyId &&
      config.accessKeyId &&
      config.secretAccessKey,
  );
  const message = ready
    ? `S3 bucket ${config.bucket} in ${config.region} with a KMS key id configured. Live upload is not marked verified until a request succeeds.`
    : "S3 bucket, region, KMS key id, and access credentials are not all set. No object was uploaded.";
  return {
    driver: ready ? "s3" : "unconfigured",
    describe: () => ({ ready, message }),
    async put(key, bytes, contentType) {
      if (
        !ready ||
        !config.bucket ||
        !config.region ||
        !config.kmsKeyId ||
        !config.accessKeyId ||
        !config.secretAccessKey
      ) {
        throw new StorageUnavailable(message);
      }
      const version = await putS3Object({
        bucket: config.bucket,
        region: config.region,
        key,
        body: bytes,
        contentType,
        kmsKeyId: config.kmsKeyId,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        sessionToken: config.sessionToken,
      });
      return { version, driver: "s3" };
    },
    get: () => Promise.reject(new StorageUnavailable("S3 download is not enabled in this process")),
  };
}

export function resolveObjectStore(env: NodeJS.ProcessEnv): ObjectStore {
  const s3 = s3ObjectStore({
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    kmsKeyId: env.KMS_KEY_ID,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    sessionToken: env.AWS_SESSION_TOKEN,
  });
  if (s3.describe().ready) return s3;
  const localDir = env.OBJECT_STORE_LOCAL_DIR?.trim();
  if (localDir) return localObjectStore(localDir);
  return s3;
}

function safePath(root: string, key: string): string {
  if (key.includes("..") || key.startsWith("/") || key.includes("\\")) {
    throw new StorageUnavailable("object key is not allowed");
  }
  const path = resolve(root, key);
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`;
  if (path !== root && !path.startsWith(prefix)) {
    throw new StorageUnavailable("object key escapes the store root");
  }
  return path;
}

async function putS3Object(input: {
  bucket: string;
  region: string;
  key: string;
  body: Uint8Array;
  contentType: string;
  kmsKeyId: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}): Promise<string> {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const host = `${input.bucket}.s3.${input.region}.amazonaws.com`;
  const canonicalUri = `/${input.key.split("/").map(encodeURIComponent).join("/")}`;
  const payloadHash = createHash("sha256").update(input.body).digest("hex");
  const headers: Record<string, string> = {
    host,
    "content-type": input.contentType,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    "x-amz-server-side-encryption": "aws:kms",
    "x-amz-server-side-encryption-aws-kms-key-id": input.kmsKeyId,
  };
  if (input.sessionToken) headers["x-amz-security-token"] = input.sessionToken;
  const names = Object.keys(headers).sort();
  const canonicalHeaders = names.map((name) => `${name}:${headers[name]}\n`).join("");
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    names.join(";"),
    payloadHash,
  ].join("\n");
  const scope = `${dateStamp}/${input.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");
  const signature = createHmac("sha256", signingKey(input.secretAccessKey, dateStamp, input.region))
    .update(stringToSign)
    .digest("hex");
  const response = await fetch(`https://${host}${canonicalUri}`, {
    method: "PUT",
    headers: {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`,
    },
    body: Buffer.from(input.body),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240);
    throw new StorageUnavailable(
      `S3 upload failed (${response.status}). Nothing was marked clean. ${detail}`,
    );
  }
  return response.headers.get("x-amz-version-id") ?? "unversioned";
}

function signingKey(secret: string, date: string, region: string): Buffer {
  const dateKey = createHmac("sha256", `AWS4${secret}`).update(date).digest();
  const regionKey = createHmac("sha256", dateKey).update(region).digest();
  const serviceKey = createHmac("sha256", regionKey).update("s3").digest();
  return createHmac("sha256", serviceKey).update("aws4_request").digest();
}
