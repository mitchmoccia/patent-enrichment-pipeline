import { getPriorArt } from "@patent/application";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";
import {
  addLimitationAction,
  recordEligibilityAction,
  recordFindingAction,
} from "../../../../prior-art-actions";

export const dynamic = "force-dynamic";

export default async function PriorArtPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const data = await getPriorArt(db(), await requireContext(), id);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/app/matters/${id}`}
          className="text-sm text-graphite-500 hover:text-teal-accent"
        >
          ← Back to matter
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-900">Prior art</h1>
        <p className="text-sm text-graphite-500">
          Anticipation, obviousness, and technical similarity stay separate. Relevance is not legal
          prior-art status. No success probability is stored.
        </p>
      </div>
      {notice ? (
        <p className="rounded-md border border-teal-accent-soft bg-teal-accent-soft px-3 py-2 text-sm text-teal-accent">
          {notice}
        </p>
      ) : null}
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Limitations</h2>
        <ul className="mt-3 space-y-2">
          {data.limitations.map((row) => (
            <li key={row.id} className="text-sm text-graphite-900">
              {row.text}
            </li>
          ))}
        </ul>
        <form action={addLimitationAction} className="mt-3 flex gap-2">
          <input type="hidden" name="matterId" value={id} />
          <input
            name="text"
            required
            placeholder="Limitation"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Add
          </button>
        </form>
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Findings</h2>
        <ul className="mt-3 space-y-3">
          {data.findings.map((finding) => {
            const limitation = data.limitations.find((row) => row.id === finding.limitationId);
            return (
              <li key={finding.id} className="text-sm text-graphite-900">
                <span className="font-medium">{finding.kind}</span> · {finding.legalStatus}
                {finding.reason ? ` · ${finding.reason}` : ""} · relevance {finding.relevance}
                <span className="mt-1 block text-graphite-500">Limitation: {limitation?.text}</span>
                <span className="mt-1 block">Quote: {finding.quote}</span>
              </li>
            );
          })}
        </ul>
        <form action={recordFindingAction} className="mt-3 grid gap-2">
          <input type="hidden" name="matterId" value={id} />
          <select
            name="limitationId"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          >
            {data.limitations.map((row) => (
              <option key={row.id} value={row.id}>
                {row.text}
              </option>
            ))}
          </select>
          <select name="kind" className="rounded-md border border-graphite-200 px-2 py-1 text-sm">
            <option value="anticipation">anticipation</option>
            <option value="obviousness">obviousness</option>
            <option value="technical_similarity">technical similarity</option>
          </select>
          <select
            name="referenceId"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          >
            {data.references.map((row) => (
              <option key={row.id} value={row.id}>
                {row.title}
              </option>
            ))}
          </select>
          <textarea
            name="quote"
            required
            placeholder="Quote from the reference"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <input
            name="motivation"
            placeholder="Combination motivation, if any"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="w-fit rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Record finding
          </button>
        </form>
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Eligibility</h2>
        <ul className="mt-3 space-y-2">
          {data.eligibility.map((row) => (
            <li key={row.id} className="text-sm text-graphite-900">
              {row.legalStatus}
              {row.reason ? ` · ${row.reason}` : ""} · {row.answer}
            </li>
          ))}
        </ul>
        <form action={recordEligibilityAction} className="mt-3 grid gap-2">
          <input type="hidden" name="matterId" value={id} />
          <select
            name="limitationId"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          >
            {data.limitations.map((row) => (
              <option key={row.id} value={row.id}>
                {row.text}
              </option>
            ))}
          </select>
          <textarea
            name="answer"
            required
            placeholder="Answer naming the limitation"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="w-fit rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Record eligibility answer
          </button>
        </form>
      </section>
    </div>
  );
}
