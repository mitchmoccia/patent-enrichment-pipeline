"use client";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/auth-client";

export default function TwoFactorSignInPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await authClient.twoFactor.verifyTotp({ code });
    setLoading(false);
    if (err) {
      setError(err.message ?? "That code was not accepted");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-graphite-900">
          Authenticator code
        </h1>
        <p className="text-sm text-graphite-500">Enter the current code from your authenticator.</p>
      </div>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-graphite-200 bg-paper-raised p-6"
      >
        <div className="space-y-1">
          <label htmlFor="code" className="block text-sm font-medium text-graphite-700">
            Code
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="w-full rounded-md border border-graphite-200 px-3 py-2 text-graphite-900 outline-none focus:border-teal-accent"
          />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-teal-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Checking…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
