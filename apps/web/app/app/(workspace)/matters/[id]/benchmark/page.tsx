import { type BenchmarkReport, getBenchmark } from "@patent/application";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";
import { recordBenchmarkAction } from "../../../../benchmark-actions";

export const dynamic = "force-dynamic";

export default async function BenchmarkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const data = await getBenchmark(db(), await requireContext(), id);
  if (!data) notFound();
  const report = data.report as BenchmarkReport;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/app/matters/${id}`}
          className="text-sm text-graphite-500 hover:text-teal-accent"
        >
          ← Back to matter
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-900">Benchmark</h1>
        <p className="text-sm text-graphite-500">
          Practitioners who annotated: {report.practitioners}. This page does not certify
          patentability, enforceability, or attorney-level quality. No deployment URL is published.
        </p>
      </div>
      {notice ? (
        <p className="rounded-md border border-teal-accent-soft bg-teal-accent-soft px-3 py-2 text-sm text-teal-accent">
          {notice}
        </p>
      ) : null}
      <ul className="space-y-1 text-sm text-graphite-900">
        {report.checks.map((check) => (
          <li key={check.id}>
            {check.id}: {check.caught ? "caught" : "missed"}
          </li>
        ))}
      </ul>
      <ul className="list-disc space-y-1 pl-5 text-sm text-graphite-900">
        {report.limitations.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <form action={recordBenchmarkAction}>
        <input type="hidden" name="matterId" value={id} />
        <button type="submit" className="rounded-md bg-teal-accent px-3 py-1.5 text-sm text-paper">
          Store this report
        </button>
      </form>
    </div>
  );
}
