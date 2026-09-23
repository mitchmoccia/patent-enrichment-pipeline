import { readFileSync } from "node:fs";
import { inspectFile } from "./inspect-file";

const filename = process.argv[2];
const mediaType = process.argv[3] ?? "application/octet-stream";
if (!filename) {
  console.error("usage: document-worker <file> [media-type]");
  process.exit(1);
}
const bytes = new Uint8Array(readFileSync(filename));
const result = inspectFile(filename, mediaType, bytes);
console.log(JSON.stringify(result));
