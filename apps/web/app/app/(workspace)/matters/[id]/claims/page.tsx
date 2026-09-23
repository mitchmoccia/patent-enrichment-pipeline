import { getClaims } from "@patent/application";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";
import { patchClaimAction, saveClaimAction } from "../../../../claim-actions";

export const dynamic = "force-dynamic";

export default async function ClaimsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const data = await getClaims(db(), await requireContext(), id);
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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-900">Claims</h1>
        <p className="text-sm text-graphite-500">
          A dependent claim keeps its parent category. Changing AND to OR, or deleting a condition,
          marks support stale.
        </p>
      </div>
      {notice ? (
        <p className="rounded-md border border-teal-accent-soft bg-teal-accent-soft px-3 py-2 text-sm text-teal-accent">
          {notice}
        </p>
      ) : null}
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Drafts</h2>
        <ul className="mt-3 space-y-4">
          {data.claims.map((claim) => (
            <li key={claim.id} className="text-sm text-graphite-900">
              <span className="font-medium">
                {claim.category} · {claim.connective}
              </span>{" "}
              · revision {claim.revision} · support {claim.supportStatus}
              <ul className="mt-1 list-disc pl-5">
                {claim.limitations.map((item) => (
                  <li key={item.id}>
                    {item.text}
                    {item.actor ? ` · ${item.actor}` : ""}
                  </li>
                ))}
              </ul>
              <form action={patchClaimAction} className="mt-2 flex gap-2">
                <input type="hidden" name="matterId" value={id} />
                <input type="hidden" name="claimId" value={claim.id} />
                <input type="hidden" name="expectedRevision" value={claim.revision} />
                <select
                  name="connective"
                  defaultValue={claim.connective}
                  className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
                >
                  <option value="and">and</option>
                  <option value="or">or</option>
                </select>
                <button
                  type="submit"
                  className="rounded-md border border-graphite-200 px-3 py-1 text-sm"
                >
                  Update connective
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={saveClaimAction} className="mt-4 grid gap-2">
          <input type="hidden" name="matterId" value={id} />
          <select
            name="category"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          >
            <option value="method">method</option>
            <option value="system">system</option>
          </select>
          <select
            name="dependsOn"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          >
            <option value="">independent</option>
            {data.claims.map((claim) => (
              <option key={claim.id} value={claim.id}>
                depends on {claim.category}
              </option>
            ))}
          </select>
          <select
            name="connective"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          >
            <option value="and">and</option>
            <option value="or">or</option>
          </select>
          <input
            name="limitation"
            required
            placeholder="Limitation"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <input
            name="actor"
            placeholder="Actor"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="w-fit rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Add claim
          </button>
        </form>
      </section>
    </div>
  );
}
