import { getMatter, listArtifacts, listMatterEvents, listMatterRuns } from "@patent/application";
import { GATE_CATALOG } from "@patent/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";
import { GoalEditor, MembersPanel, PolicyPanel } from "./controls";
import { RunPanel } from "./run-panel";

export const dynamic = "force-dynamic";

export default async function MatterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const ctx = await requireContext();
  const data = await getMatter(db(), ctx, id);

  // RLS + ACL: a matter the caller cannot access resolves to null -> 404.
  if (!data) notFound();

  const { matter, assertions, members } = data;
  const artifacts = await listArtifacts(db(), ctx, id);
  const runs = await listMatterRuns(db(), ctx, id);
  const events = await listMatterEvents(db(), ctx, id, 0);
  const policy = matter.processingPolicy as { trainingUseAllowed?: boolean } | null;

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
        <p className="mt-2 flex gap-4">
          <Link
            href={`/app/matters/${matter.id}/invention`}
            className="text-sm text-teal-accent hover:underline"
          >
            Invention workspace
          </Link>
          <Link
            href={`/app/matters/${matter.id}/rights`}
            className="text-sm text-teal-accent hover:underline"
          >
            Rights and chronology
          </Link>
          <Link
            href={`/app/matters/${matter.id}/research`}
            className="text-sm text-teal-accent hover:underline"
          >
            Research
          </Link>
        </p>
      </div>

      {notice ? (
        <p className="rounded-md border border-teal-accent-soft bg-teal-accent-soft px-3 py-2 text-sm text-teal-accent">
          {notice}
        </p>
      ) : null}

      <GoalEditor matterId={matter.id} goal={matter.goal} revision={matter.headRevision} />
      <PolicyPanel
        matterId={matter.id}
        revision={matter.headRevision}
        budget={matter.runBudgetMicrousd}
        trainingUseAllowed={policy?.trainingUseAllowed ?? null}
      />
      <RunPanel matterId={matter.id} runs={runs} events={events} />
      <MembersPanel
        matterId={matter.id}
        members={members.map((member) => ({
          principalId: member.principalId,
          role: member.role,
        }))}
      />

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

      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Upload evidence</h2>
        <p className="mt-1 text-sm text-graphite-500">
          Original bytes are stored only after the hash and quarantine checks pass. S3 is used when
          it is configured. Otherwise a local directory is labeled as local, or the upload is
          refused.
        </p>
        <form
          action={`/api/matters/${matter.id}/artifacts`}
          method="post"
          encType="multipart/form-data"
          className="mt-3 flex flex-wrap items-center gap-3"
        >
          <label htmlFor="file" className="sr-only">
            File
          </label>
          <input id="file" name="file" type="file" required className="text-sm text-graphite-700" />
          <button
            type="submit"
            className="rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Upload
          </button>
        </form>
        <ul className="mt-4 space-y-2">
          {artifacts.length === 0 ? (
            <li className="text-sm text-graphite-500">No artifacts yet.</li>
          ) : (
            artifacts.map((artifact) => (
              <li key={artifact.id}>
                <Link
                  href={`/app/matters/${matter.id}/evidence/${artifact.id}`}
                  className="text-sm text-teal-accent hover:underline"
                >
                  {artifact.originalName}
                </Link>
                <span className="ml-2 text-xs text-graphite-500">
                  {artifact.scanStatus} · {artifact.storageDriver}
                </span>
              </li>
            ))
          )}
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
