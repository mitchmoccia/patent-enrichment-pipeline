import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { sessionHasMfa } from "@/session";
import { MfaEnrollment } from "./enrollment";

export const dynamic = "force-dynamic";

export default async function MfaPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  if (await sessionHasMfa()) redirect("/app");
  return <MfaEnrollment />;
}
