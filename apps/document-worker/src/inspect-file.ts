import { inspectUpload } from "@patent/documents";
import { QuarantineRejection, sha256Hex } from "@patent/security";

export interface WorkerInspection {
  sha256: string;
  scanStatus: "clean" | "rejected";
  text: string;
  note: string;
  executed: false;
}

/** Worker entry. Reads bytes and returns an inspection. It never executes the upload. */
export function inspectFile(
  filename: string,
  mediaType: string,
  bytes: Uint8Array,
): WorkerInspection {
  const sha256 = sha256Hex(bytes);
  try {
    const result = inspectUpload(filename, mediaType, bytes);
    return {
      sha256,
      scanStatus: "clean",
      text: result.text,
      note: result.note ?? "Extracted.",
      executed: false,
    };
  } catch (error) {
    if (error instanceof QuarantineRejection) {
      return {
        sha256,
        scanStatus: "rejected",
        text: "",
        note: `${error.code}: ${error.message}`,
        executed: false,
      };
    }
    throw error;
  }
}
