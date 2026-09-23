import { getGates } from "@patent/application";
import { GATE_CATALOG } from "@patent/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";
import {
  approveGateAction,
  evaluateGatesAction,
  releasePackageAction,
} from "../../../../gate-actions";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const data = await getGates(db(), await requireContext(), id);
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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-900">Review</h1>
        <p className="text-sm text-graphite-500">
          A model cannot approve a gate. This release{" "}
          {data.releaseCoversPackage
            ? "covers the current package."
            : "does not cover the current package."}
        </p>
      </div>
      {notice ? (
        <p className="rounded-md border border-teal-accent-soft bg-teal-accent-soft px-3 py-2 text-sm text-teal-accent">
          {notice}
        </p>
      ) : null}
      <form action={evaluateGatesAction}>
        <input type="hidden" name="matterId" value={id} />
        <button
          type="submit"
          className="rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          Run checks
        </button>
      </form>
      <ul className="space-y-3">
        {data.gates.map((gate) => {
          const label =
            GATE_CATALOG.find((entry) => entry.id === gate.gateId)?.label ?? gate.gateId;
          return (
            <li
              key={gate.gateId}
              className="rounded-lg border border-graphite-200 bg-paper-raised p-4 text-sm"
            >
              <span className="font-mono text-xs text-graphite-500">{gate.gateId}</span>{" "}
              <span className="font-medium">{label}</span>
              <span className="ml-2 rounded-full bg-graphite-50 px-2 py-0.5 text-xs text-graphite-500">
                {gate.outcome}
              </span>
              <span className="mt-1 block text-graphite-500">{gate.explanation}</span>
              {gate.outcome === "needs_review" ? (
                <form action={approveGateAction} className="mt-2">
                  <input type="hidden" name="matterId" value={id} />
                  <input type="hidden" name="gateId" value={gate.gateId} />
                  <button
                    type="submit"
                    className="rounded-md border border-graphite-200 px-3 py-1 text-sm"
                  >
                    Approve as a person
                  </button>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
      <form action={releasePackageAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="matterId" value={id} />
        <select name="capacity" className="rounded-md border border-graphite-200 px-2 py-1 text-sm">
          <option value="inventor">inventor</option>
          <option value="individual_applicant">individual applicant</option>
          <option value="technical_reviewer">technical reviewer</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          Release this package
        </button>
      </form>
    </div>
  );
}
