import { getMatter } from "@patent/application";
import { GATE_CATALOG } from "@patent/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";

export const dynamic = "force-dynamic";

export default async function MatterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const data = await getMatter(db(), ctx, id);

  // RLS + ACL: a matter the caller cannot access resolves to null -> 404.
  if (!data) notFound();

  const { matter, assertions } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/app" className="text-sm text-graphite-500 hover:text-teal-accent">
          ← Back to matters
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-900">
          {matter.title}
        </h1>
        <p className="text-sm text-graphite-500">
          State: {matter.state} · Applicant mode: {matter.applicantMode} · Revision{" "}
          {matter.headRevision}
        </p>
      </div>

      {matter.goal ? (
        <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
          <h2 className="text-sm font-medium text-graphite-700">Goal</h2>
          <p className="mt-1 text-graphite-900">{matter.goal}</p>
        </section>
      ) : null}

      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Evidence — assertions</h2>
        <ul className="mt-3 space-y-3">
          {assertions.map((a) => (
            <li key={a.id} className="rounded-md border border-graphite-200 p-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-teal-accent-soft px-2 py-0.5 text-xs font-medium text-teal-accent">
                  {a.classification}
                </span>
                <span className="text-xs text-graphite-500">
                  {a.status} · from {a.proposedByKind}
                </span>
              </div>
              <p className="mt-2 text-graphite-900">{a.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-sm font-medium text-amber-900">What's next</h2>
        <p className="mt-1 text-sm text-amber-900">
          This matter is at <strong>intake</strong>. The pipeline that acts on your idea is being
          built slice by slice. The next capabilities are not yet available:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
          <li>
            <strong>Upload supporting artifacts</strong> and inspect extracted evidence (slice S02 —
            needs private object storage).
          </li>
          <li>
            <strong>Run an intake analysis</strong> that models the mechanism and asks you targeted
            questions (slice S04 — needs an approved model route).
          </li>
        </ul>
      </section>

      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Pipeline gates</h2>
        <p className="mt-1 text-xs text-graphite-500">
          Pre-filing readiness checks (G00–G13). All pending until their evaluators are implemented.
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {GATE_CATALOG.filter((g) => g.phase === "pre_filing").map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between rounded-md border border-graphite-200 px-3 py-2"
            >
              <span className="text-sm text-graphite-900">
                <span className="font-mono text-xs text-graphite-500">{g.id}</span> {g.label}
              </span>
              <span className="rounded-full bg-graphite-50 px-2 py-0.5 text-xs text-graphite-500">
                pending · {g.slice}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
