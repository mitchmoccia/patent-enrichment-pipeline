import { inflateRawSync } from "node:zlib";
import { QuarantineRejection } from "./hash";
import { assertArchivePath } from "./paths";

export interface ZipLimits {
  maxEntries: number;
  maxUncompressedBytes: number;
  maxRatio: number;
}

export interface ZipEntry {
  path: string;
  bytes: Uint8Array;
}

const DEFAULT_LIMITS: ZipLimits = {
  maxEntries: 200,
  maxUncompressedBytes: 8 * 1024 * 1024,
  maxRatio: 100,
};

function u16(buf: Uint8Array, offset: number): number {
  return (buf[offset] ?? 0) | ((buf[offset + 1] ?? 0) << 8);
}

function u32(buf: Uint8Array, offset: number): number {
  return (
    ((buf[offset] ?? 0) |
      ((buf[offset + 1] ?? 0) << 8) |
      ((buf[offset + 2] ?? 0) << 16) |
      ((buf[offset + 3] ?? 0) << 24)) >>>
    0
  );
}

function findEocd(buf: Uint8Array): number {
  const min = Math.max(0, buf.length - (22 + 65535));
  for (let i = buf.length - 22; i >= min; i -= 1) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
      return i;
    }
  }
  throw new QuarantineRejection("MALFORMED_ARCHIVE", "ZIP end-of-directory record is missing");
}

function inflate(method: number, compressed: Uint8Array, expected: number): Uint8Array {
  if (method === 0) return compressed;
  if (method !== 8) {
    throw new QuarantineRejection("UNSUPPORTED_ARCHIVE", `ZIP method ${method} is not accepted`);
  }
  const out = inflateRawSync(compressed);
  if (out.length !== expected) {
    throw new QuarantineRejection(
      "EXCESSIVE_DECOMPRESSION",
      "inflated size does not match the archive",
    );
  }
  return out;
}

/** Read a ZIP in memory. Unsafe paths, macros, and bombs throw before any write. */
export function readZip(bytes: Uint8Array, limits: ZipLimits = DEFAULT_LIMITS): ZipEntry[] {
  const eocd = findEocd(bytes);
  const entries = u16(bytes, eocd + 10);
  const cdOffset = u32(bytes, eocd + 16);
  if (entries > limits.maxEntries) {
    throw new QuarantineRejection("EXCESSIVE_DECOMPRESSION", "archive has too many entries");
  }
  const out: ZipEntry[] = [];
  let cursor = cdOffset;
  let total = 0;
  for (let n = 0; n < entries; n += 1) {
    if (u32(bytes, cursor) !== 0x02014b50) {
      throw new QuarantineRejection("MALFORMED_ARCHIVE", "central directory entry is truncated");
    }
    const method = u16(bytes, cursor + 10);
    const compressedSize = u32(bytes, cursor + 20);
    const uncompressedSize = u32(bytes, cursor + 24);
    const nameLen = u16(bytes, cursor + 28);
    const extraLen = u16(bytes, cursor + 30);
    const commentLen = u16(bytes, cursor + 32);
    const localOffset = u32(bytes, cursor + 42);
    const path = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLen));
    cursor += 46 + nameLen + extraLen + commentLen;
    if (path.endsWith("/")) continue;
    assertArchivePath(path);
    if (uncompressedSize > limits.maxUncompressedBytes) {
      throw new QuarantineRejection(
        "EXCESSIVE_DECOMPRESSION",
        "archive entry declares an oversized payload",
      );
    }
    if (compressedSize === 0 && uncompressedSize > 0) {
      throw new QuarantineRejection(
        "EXCESSIVE_DECOMPRESSION",
        "archive entry declares data with no compressed size",
      );
    }
    if (compressedSize > 0 && uncompressedSize / compressedSize > limits.maxRatio) {
      throw new QuarantineRejection(
        "EXCESSIVE_DECOMPRESSION",
        "archive compression ratio exceeds the limit",
      );
    }
    total += uncompressedSize;
    if (total > limits.maxUncompressedBytes) {
      throw new QuarantineRejection(
        "EXCESSIVE_DECOMPRESSION",
        "archive uncompressed total exceeds the limit",
      );
    }
    const localNameLen = u16(bytes, localOffset + 26);
    const localExtraLen = u16(bytes, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    if (compressed.length !== compressedSize) {
      throw new QuarantineRejection("MALFORMED_ARCHIVE", "compressed bytes are truncated");
    }
    out.push({ path, bytes: inflate(method, compressed, uncompressedSize) });
  }
  return out;
}
