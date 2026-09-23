import { getOperations } from "@patent/application";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";
import { approveWatchAction } from "../../../../operations-actions";

export const dynamic = "force-dynamic";

export default async function OperationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const data = await getOperations(db(), await requireContext(), id);
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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-900">Operations</h1>
        <p className="text-sm text-graphite-500">
          Stripe entitlements are {data.health.stripe.status}. No paid account is created here.
          Analytics accepts provider, gate, and matter-state names only.
        </p>
      </div>
      {notice ? (
        <p className="rounded-md border border-teal-accent-soft bg-teal-accent-soft px-3 py-2 text-sm text-teal-accent">
          {notice}
        </p>
      ) : null}
      <ul className="space-y-1 text-sm text-graphite-900">
        {data.health.providers.map((provider) => (
          <li key={provider.name}>
            {provider.name}: {provider.status}
          </li>
        ))}
      </ul>
      <ul className="space-y-1 text-sm text-graphite-900">
        {data.plans.map((plan) => (
          <li key={plan.id}>
            {plan.source} · {plan.cadence} · budget {plan.budgetMicrousd} · demand letters off
          </li>
        ))}
      </ul>
      <form action={approveWatchAction} className="grid gap-2">
        <input type="hidden" name="matterId" value={id} />
        <input
          name="source"
          required
          placeholder="Public source"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <input
          name="cadence"
          required
          placeholder="Cadence"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <input
          name="budgetMicrousd"
          required
          placeholder="Budget micro-USD"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-graphite-700">
          <input type="checkbox" name="approved" />I approve this watch plan
        </label>
        <button
          type="submit"
          className="w-fit rounded-md bg-teal-accent px-3 py-1.5 text-sm text-paper"
        >
          Save watch plan
        </button>
      </form>
    </div>
  );
}
