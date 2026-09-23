import { getCommercial } from "@patent/application";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";
import { recordCommercialAction } from "../../../../commercial-actions";

export const dynamic = "force-dynamic";

export default async function CommercialPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const data = await getCommercial(db(), await requireContext(), id);
  if (!data) notFound();
  const assessment = data.assessment;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/app/matters/${id}`}
          className="text-sm text-graphite-500 hover:text-teal-accent"
        >
          ← Back to matter
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-900">Commercial</h1>
        <p className="text-sm text-graphite-500">
          A stop or defer decision is a complete assessment. It does not remove engineering work.
          Claim drafts on this matter: {data.claimCount}.
        </p>
      </div>
      {notice ? (
        <p className="rounded-md border border-teal-accent-soft bg-teal-accent-soft px-3 py-2 text-sm text-teal-accent">
          {notice}
        </p>
      ) : null}
      {assessment ? (
        <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5 text-sm text-graphite-900">
          <p>
            {assessment.strategy} · {assessment.decision}
          </p>
          <p className="mt-2">
            Product cashflow: {assessment.productCashflowMicrousd ?? "unknown"} micro-USD.
            Incremental patent value: unknown.
          </p>
          <p className="mt-2 text-graphite-500">Unknown: {assessment.unknowns.join(", ")}</p>
        </section>
      ) : null}
      <form
        action={recordCommercialAction}
        className="grid gap-2 rounded-lg border border-graphite-200 bg-paper-raised p-5"
      >
        <input type="hidden" name="matterId" value={id} />
        <input
          name="buyer"
          placeholder="Buyer hypothesis"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <input
          name="substitute"
          placeholder="Current substitute"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <input
          name="evidenceRequest"
          placeholder="Evidence still needed"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <select name="strategy" className="rounded-md border border-graphite-200 px-2 py-1 text-sm">
          <option value="operating">operating product</option>
          <option value="licensing_or_sale">licensing or sale</option>
          <option value="defensive">defensive portfolio</option>
        </select>
        <select name="decision" className="rounded-md border border-graphite-200 px-2 py-1 text-sm">
          <option value="proceed">proceed</option>
          <option value="revise">revise</option>
          <option value="defer">defer</option>
          <option value="stop">stop</option>
        </select>
        <input
          name="productRevenueMicrousd"
          placeholder="Product revenue micro-USD"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <input
          name="productCostMicrousd"
          placeholder="Product cost micro-USD"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <input
          name="patentCostMicrousd"
          placeholder="Patent cost micro-USD"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <input
          name="marketSizeMicrousd"
          placeholder="Market size is not accepted as a fact"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <input
          name="licensingProbability"
          placeholder="A licensing probability is rejected"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          className="w-fit rounded-md bg-teal-accent px-3 py-1.5 text-sm text-paper"
        >
          Record assessment
        </button>
      </form>
    </div>
  );
}
