import { routeHandlerRevokeMember } from "@patent/application";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { getContext, sessionHasMfa } from "@/session";

export const dynamic = "force-dynamic";

/**
 * Route Handler revocation. Authorization is this handler's own call to
 * routeHandlerRevokeMember, which re-reads the matter under RLS. It does not
 * trust a proxy header.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = await getContext();
  if (!ctx) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "sign in required" },
      { status: 401 },
    );
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { principalId?: string } | null;
  const principalId = body?.principalId?.trim() ?? "";
  if (!principalId) {
    return NextResponse.json(
      { code: "VALIDATION_FAILED", message: "principalId is required" },
      { status: 400 },
    );
  }
  const result = await routeHandlerRevokeMember(db(), ctx, {
    matterId: id,
    principalId,
    mfaEnabled: await sessionHasMfa(),
  });
  return NextResponse.json(result.body, { status: result.status });
}
