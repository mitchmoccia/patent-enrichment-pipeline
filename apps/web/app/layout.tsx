import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Patent Enrichment Platform",
  description:
    "Evidence-centered patent development workspace for US software and computer-implemented utility inventions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-graphite-200 bg-paper-raised">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-semibold tracking-tight text-graphite-900">
              Patent Enrichment Platform
            </Link>
            <nav className="flex items-center gap-6 text-sm text-graphite-700">
              <Link href="/" className="hover:text-teal-accent">
                Overview
              </Link>
              <Link href="/status" className="hover:text-teal-accent">
                Integration status
              </Link>
              <Link href="/app" className="hover:text-teal-accent">
                Workspace
              </Link>
              <Link
                href="/sign-in"
                className="rounded-md bg-teal-accent px-3 py-1.5 font-medium text-white hover:opacity-90"
              >
                Sign in
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        <footer className="mx-auto max-w-5xl px-6 py-10 text-xs text-graphite-500">
          Private development workspace. Not a legal service. Unconfigured integrations stay
          unavailable until a credential is present and verified.
        </footer>
      </body>
    </html>
  );
}
