export type AppErrorCode =
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "POLICY_BLOCKED"
  | "REVISION_CONFLICT";

/** Application-layer error with a stable code the transport layer can map. */
export class AppError extends Error {
  readonly code: AppErrorCode;
  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}
