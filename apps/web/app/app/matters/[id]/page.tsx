import { getMatter } from "@patent/application";
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
    </div>
  );
}
