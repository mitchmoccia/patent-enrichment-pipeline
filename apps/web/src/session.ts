import "server-only";
import { type AuthorizedContext, resolvePersonalContext } from "@patent/application";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";

/** The authenticated session's context, or null if not signed in. */
export async function getContext(): Promise<AuthorizedContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return resolvePersonalContext(db(), session.user.id, session.user.name ?? undefined);
}

/** Require an authenticated context; redirect to sign-in otherwise. */
export async function requireContext(): Promise<AuthorizedContext> {
  const ctx = await getContext();
  if (!ctx) redirect("/sign-in");
  return ctx;
}
