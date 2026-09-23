import { getSecurity } from "@patent/application";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";
import { recordSecurityAction } from "../../../../security-actions";

export const dynamic = "force-dynamic";

export default async function SecurityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const data = await getSecurity(db(), await requireContext(), id);
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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-900">Security</h1>
        <p className="text-sm text-graphite-500">
          Another tenant cannot read this matter. Artifact instructions do not change network policy
          or enable an export. The readback below is not a production disaster-recovery
          certification.
        </p>
      </div>
      {notice ? (
        <p className="rounded-md border border-teal-accent-soft bg-teal-accent-soft px-3 py-2 text-sm text-teal-accent">
          {notice}
        </p>
      ) : null}
      <section>
        <h2 className="text-sm font-medium text-graphite-700">Unresolved</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-graphite-900">
          {data.unresolved.map((risk) => (
            <li key={risk}>{risk}</li>
          ))}
        </ul>
      </section>
      <p className="text-sm text-graphite-500">Observations: {data.observations.length}</p>
      <form action={recordSecurityAction}>
        <input type="hidden" name="matterId" value={id} />
        <button type="submit" className="rounded-md bg-teal-accent px-3 py-1.5 text-sm text-paper">
          Record logical readback
        </button>
      </form>
    </div>
  );
}
