import { randomUUID } from "node:crypto";
import { type Database, schema } from "@patent/db";
import { eq } from "drizzle-orm";
import type { AuthorizedContext } from "./context.js";

/**
 * Resolve the authorization context for an authenticated user. For the S01
 * pilot each user gets a personal organization (tenant) on first login; the
 * user is its owner member. Later slices add multi-org membership and invites.
 */
export async function resolvePersonalContext(
  db: Database,
  userId: string,
  displayName?: string,
): Promise<AuthorizedContext> {
  const existing = await db
    .select({ organizationId: schema.member.organizationId })
    .from(schema.member)
    .where(eq(schema.member.userId, userId))
    .limit(1);

  const found = existing[0];
  if (found) return { tenantId: found.organizationId, userId };

  const orgId = randomUUID();
  await db.insert(schema.organization).values({
    id: orgId,
    name: displayName ? `${displayName}'s Workspace` : "Workspace",
    slug: `w-${orgId.slice(0, 8)}`,
  });
  await db.insert(schema.member).values({
    id: randomUUID(),
    organizationId: orgId,
    userId,
    role: "owner",
  });
  return { tenantId: orgId, userId };
}
