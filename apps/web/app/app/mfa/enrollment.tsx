"use client";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/auth-client";

export function MfaEnrollment() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startEnrollment(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error: err } = await authClient.twoFactor.enable({ password, method: "totp" });
    setLoading(false);
    if (err || !data || data.method !== "totp") {
      setError(err?.message ?? "Could not start enrollment");
      return;
    }
    setTotpUri(data.totpURI);
    setBackupCodes(data.backupCodes);
  }

  async function confirmCode(event: FormEvent) {
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
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-graphite-900">
          Second factor required
        </h1>
        <p className="text-sm text-graphite-500">
          Matter changes stay closed until you verify an authenticator code. Store the backup codes
          somewhere you control. They are shown only now.
        </p>
      </div>
      {totpUri ? (
        <form
          onSubmit={confirmCode}
          className="space-y-4 rounded-lg border border-graphite-200 bg-paper-raised p-6"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium text-graphite-700">Authenticator URI</p>
            <p className="break-all rounded-md border border-graphite-200 bg-paper p-3 font-mono text-xs text-graphite-900">
              {totpUri}
            </p>
          </div>
          {backupCodes.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((backup) => (
                <li key={backup} className="rounded-md border border-graphite-200 px-2 py-1">
                  {backup}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="space-y-1">
            <label htmlFor="code" className="block text-sm font-medium text-graphite-700">
              6-digit code
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
            className="rounded-md bg-teal-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Checking…" : "Verify and continue"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={startEnrollment}
          className="space-y-4 rounded-lg border border-graphite-200 bg-paper-raised p-6"
        >
          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-graphite-700">
              Confirm your password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-graphite-200 px-3 py-2 text-graphite-900 outline-none focus:border-teal-accent"
            />
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-teal-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Starting…" : "Create authenticator setup"}
          </button>
        </form>
      )}
    </div>
  );
}
