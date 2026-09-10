import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-teal-accent">
          Slice S00 — development shell
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-graphite-900">
          Evidence-centered patent development
        </h1>
        <p className="max-w-2xl text-graphite-700">
          This is the reproducible application shell for the Patent Enrichment Platform. The full
          build is delivered as ordered slices (S00–S17) defined in{" "}
          <code className="rounded bg-graphite-50 px-1 py-0.5 text-sm">
            docs/handoff/BUILD_SLICES.md
          </code>
          . No matter data, model route, patent search, or filing capability is active yet — each
          integration is introduced and verified in its own slice.
        </p>
      </section>

      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-6">
        <h2 className="text-lg font-semibold text-graphite-900">What exists at S00</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-graphite-700">
          <li>Reproducible pinned toolchain (Next.js, React, TypeScript, Tailwind).</li>
          <li>Package boundaries: a shared contracts package and the web application.</li>
          <li>Environment validation with a placeholder-only example file.</li>
          <li>
            An honest{" "}
            <Link href="/status" className="font-medium text-teal-accent hover:underline">
              integration status page
            </Link>{" "}
            listing every external dependency and whether it is configured.
          </li>
        </ul>
      </section>

      <p className="text-sm text-graphite-500">
        Status vocabulary is deliberate: an upload is not a search, an export is not a filing, and a
        filing is not a grant.
      </p>
    </div>
  );
}
