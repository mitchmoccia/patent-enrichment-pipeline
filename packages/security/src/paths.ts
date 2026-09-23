import { QuarantineRejection } from "./hash";

const MACRO_MARKERS = ["vbaproject.bin", "vbadat", "/macros/", "macroenabled"];

/** Reject archive paths that escape the extraction root or carry macros. */
export function assertArchivePath(path: string): void {
  const normalized = path.replaceAll("\\", "/");
  if (normalized.length === 0 || normalized.includes("\0")) {
    throw new QuarantineRejection("UNSAFE_PATH", "archive entry name is empty or contains NUL");
  }
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
    throw new QuarantineRejection("UNSAFE_PATH", `archive entry is absolute: ${path}`);
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => segment === ".." || segment === ".")) {
    throw new QuarantineRejection("UNSAFE_PATH", `archive entry escapes the root: ${path}`);
  }
  const lower = normalized.toLowerCase();
  if (MACRO_MARKERS.some((marker) => lower.includes(marker))) {
    throw new QuarantineRejection("MACRO_CONTENT", `archive contains macro content: ${path}`);
  }
}
