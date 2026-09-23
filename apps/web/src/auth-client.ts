"use client";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Organizations/memberships are managed server-side (see @patent/application).
// The browser client handles email/password plus TOTP enrollment and sign-in.
export const authClient = createAuthClient({
  plugins: [
    twoFactorClient({
      twoFactorPage: "/sign-in/two-factor",
    }),
  ],
});
