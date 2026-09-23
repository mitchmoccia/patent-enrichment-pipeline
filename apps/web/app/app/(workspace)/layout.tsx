import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Matter workspace stays closed until the signed-in person verifies TOTP. */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  if (session.user.twoFactorEnabled !== true) redirect("/app/mfa");
  return children;
}
