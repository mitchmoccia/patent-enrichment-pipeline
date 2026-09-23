import { getAlternatives } from "@patent/application";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";
import { proposeAlternativeAction, selectAlternativeAction } from "../../../../alternative-actions";

export const dynamic = "force-dynamic";

export default async function AlternativesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const data = await getAlternatives(db(), await requireContext(), id);
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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-900">
          Alternatives
        </h1>
        <p className="text-sm text-graphite-500">
          Feasibility is separate from any legal conclusion. {data.experiment.detail} A model
          proposal stays out of the selected disclosure.
        </p>
      </div>
      {notice ? (
        <p className="rounded-md border border-teal-accent-soft bg-teal-accent-soft px-3 py-2 text-sm text-teal-accent">
          {notice}
        </p>
      ) : null}
      <ul className="space-y-3">
        {data.alternatives.map((row) => (
          <li
            key={row.id}
            className="rounded-lg border border-graphite-200 bg-paper-raised p-4 text-sm"
          >
            <span className="font-medium">{row.label}</span> · {row.origin} · {row.rank} ·
            feasibility {row.feasibility}
            <span className="mt-1 block text-graphite-500">{row.rankReason}</span>
            <span className="mt-1 block text-graphite-500">
              {row.inSelectedDisclosure
                ? "In the selected disclosure."
                : "Not in the selected disclosure."}
            </span>
            {row.origin === "person" && !row.inSelectedDisclosure ? (
              <form action={selectAlternativeAction} className="mt-2">
                <input type="hidden" name="matterId" value={id} />
                <input type="hidden" name="alternativeId" value={row.id} />
                <button
                  type="submit"
                  className="rounded-md border border-graphite-200 px-3 py-1 text-sm"
                >
                  Select for disclosure
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      <form
        action={proposeAlternativeAction}
        className="grid gap-2 rounded-lg border border-graphite-200 bg-paper-raised p-5"
      >
        <input type="hidden" name="matterId" value={id} />
        <input
          name="label"
          required
          placeholder="Label"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <select name="origin" className="rounded-md border border-graphite-200 px-2 py-1 text-sm">
          <option value="person">person</option>
          <option value="model">model</option>
        </select>
        <input
          name="removesBenefit"
          placeholder="Essential benefit removed, if any"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <textarea
          name="explanation"
          placeholder="Explanation"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-graphite-700">
          <input type="checkbox" name="partitionTolerant" />
          Partition tolerant
        </label>
        <input
          name="consistencyAssumption"
          placeholder="Consistency assumption"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          className="w-fit rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          Record alternative
        </button>
      </form>
    </div>
  );
}
