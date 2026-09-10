"use client";
import { createAuthClient } from "better-auth/react";

// Organizations/memberships are managed server-side (see @patent/application),
// so the browser client only needs core email/password auth.
export const authClient = createAuthClient();
