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
            <nav className="flex gap-6 text-sm text-graphite-700">
              <Link href="/" className="hover:text-teal-accent">
                Overview
              </Link>
              <Link href="/status" className="hover:text-teal-accent">
                Integration status
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        <footer className="mx-auto max-w-5xl px-6 py-10 text-xs text-graphite-500">
          Development shell (slice S00). Not a legal service. No filing, search, or model
          integration is active until explicitly configured and verified.
        </footer>
      </body>
    </html>
  );
}
