import "server-only";
import { createDb, schema } from "@patent/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

const { db } = createDb(process.env.DATABASE_URL ?? "");

/**
 * Better Auth owns authentication (user/session/account/verification).
 * Organizations (tenants) and memberships are managed by @patent/application so
 * matter authorization stays application-owned, as the architecture requires.
 */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // Development pilot: email delivery is not configured yet.
    requireEmailVerification: false,
  },
  plugins: [nextCookies()],
});
