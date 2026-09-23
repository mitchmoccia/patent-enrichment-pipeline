"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await authClient.signUp.email({ name, email, password });
    setLoading(false);
    if (err) {
      setError(err.message ?? "Sign up failed");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-graphite-900">Create account</h1>
        <p className="text-sm text-graphite-500">A private workspace is created for you.</p>
      </div>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-graphite-200 bg-paper-raised p-6"
      >
        <Field
          label="Name"
          id="name"
          value={name}
          onChange={setName}
          type="text"
          autoComplete="name"
        />
        <Field
          label="Email"
          id="email"
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
        />
        <Field
          label="Password (min 8 characters)"
          id="password"
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete="new-password"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-teal-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="text-sm text-graphite-500">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-teal-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function Field(props: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={props.id} className="block text-sm font-medium text-graphite-700">
        {props.label}
      </label>
      <input
        id={props.id}
        type={props.type}
        required
        autoComplete={props.autoComplete}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-md border border-graphite-200 px-3 py-2 text-graphite-900 outline-none focus:border-teal-accent"
      />
    </div>
  );
}
