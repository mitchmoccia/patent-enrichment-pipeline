import { AppError, listMatterEvents } from "@patent/application";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { getContext, sessionHasMfa } from "@/session";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!(await sessionHasMfa()))
    return NextResponse.json({ error: "POLICY_BLOCKED" }, { status: 403 });
  const { id } = await context.params;
  const after = Number(new URL(request.url).searchParams.get("after") ?? "0");
  if (!Number.isInteger(after) || after < 0) {
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  }
  try {
    const events = await listMatterEvents(db(), ctx, id, after);
    return NextResponse.json({ events });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.code }, { status: 400 });
    }
    throw error;
  }
}
