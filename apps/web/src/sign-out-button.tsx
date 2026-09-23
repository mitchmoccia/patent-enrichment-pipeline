"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.push("/sign-in");
        router.refresh();
      }}
      className="text-sm text-graphite-500 hover:text-teal-accent disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
