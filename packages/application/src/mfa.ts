import { AppError } from "./errors";

/**
 * Workspace mutations require a verified second factor. Enrollment itself is
 * the only path that runs before this check.
 */
export function assertMfaEnrolled(twoFactorEnabled: boolean): void {
  if (!twoFactorEnabled) {
    throw new AppError("POLICY_BLOCKED", "enroll a second factor before changing a matter");
  }
}
