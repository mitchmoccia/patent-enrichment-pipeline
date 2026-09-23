import { AppError, ingestUploadedArtifact } from "@patent/application";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { getContext, sessionHasMfa } from "@/session";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = await getContext();
  if (!ctx) return NextResponse.redirect(new URL("/sign-in", request.url), 303);
  if (!(await sessionHasMfa())) return NextResponse.redirect(new URL("/app/mfa", request.url), 303);
  const { id } = await context.params;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.redirect(notice(request, id, "Choose a file to upload."), 303);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const claimed = String(form.get("claimedSha256") ?? "").trim();
  try {
    const result = await ingestUploadedArtifact(
      db(),
      ctx,
      {
        matterId: id,
        filename: file.name || "upload",
        mediaType: file.type || "application/octet-stream",
        bytes,
        claimedSha256: claimed || undefined,
      },
      process.env,
    );
    const target = new URL(`/app/matters/${id}/evidence/${result.id}`, request.url);
    return NextResponse.redirect(target, 303);
  } catch (error) {
    if (error instanceof AppError)
      return NextResponse.redirect(notice(request, id, error.message), 303);
    throw error;
  }
}

function notice(request: Request, matterId: string, message: string): URL {
  const url = new URL(`/app/matters/${matterId}`, request.url);
  url.searchParams.set("notice", message);
  return url;
}
