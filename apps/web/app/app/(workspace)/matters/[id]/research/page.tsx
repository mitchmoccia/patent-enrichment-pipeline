import { getResearch } from "@patent/application";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";
import { importReferenceAction, searchMatterAction } from "../../../../research-actions";

export const dynamic = "force-dynamic";

export default async function ResearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const ctx = await requireContext();
  const data = await getResearch(db(), ctx, id, {
    USPTO_API_KEY: process.env.USPTO_API_KEY,
    EPO_OPS_KEY: process.env.EPO_OPS_KEY,
  });
  if (!data) notFound();
  const latest = data.queries[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/app/matters/${id}`}
          className="text-sm text-graphite-500 hover:text-teal-accent"
        >
          ← Back to matter
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-900">Research</h1>
        <p className="text-sm text-graphite-500">
          Imported references are searched here. Patent-office calls stay off until an entitled
          endpoint is verified.
        </p>
      </div>
      {notice ? (
        <p className="rounded-md border border-teal-accent-soft bg-teal-accent-soft px-3 py-2 text-sm text-teal-accent">
          {notice}
        </p>
      ) : null}
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Adapters</h2>
        <ul className="mt-3 space-y-2">
          {data.providers.map((provider) => (
            <li key={provider.id} className="text-sm text-graphite-900">
              {provider.id}: {provider.status}. {provider.detail}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Query</h2>
        <form action={searchMatterAction} className="mt-3 flex flex-wrap gap-2">
          <input type="hidden" name="matterId" value={id} />
          <input
            name="query"
            required
            placeholder="Query"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Search imported records
          </button>
        </form>
        {latest ? (
          <p className="mt-3 text-sm text-graphite-700">
            Last query “{latest.query}”. Stop reason: {latest.stopReason}
          </p>
        ) : null}
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Imported references</h2>
        <ul className="mt-3 space-y-3">
          {data.references.length === 0 ? (
            <li className="text-sm text-graphite-500">No imported reference.</li>
          ) : (
            data.references.map((row) => (
              <li key={row.id} className="text-sm text-graphite-900">
                <span className="font-medium">{row.title}</span>
                <span className="mt-1 block text-graphite-500">
                  Disclosure {row.disclosureDate ?? "unknown"} · family date{" "}
                  {row.familyDate ?? "none"} · {row.passageView.status}
                </span>
                {row.passage ? <span className="mt-1 block">{row.passage}</span> : null}
              </li>
            ))
          )}
        </ul>
        <form action={importReferenceAction} className="mt-4 grid gap-2">
          <input type="hidden" name="matterId" value={id} />
          <input
            name="title"
            required
            placeholder="Title"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <input
            name="publicationNumber"
            placeholder="Publication number"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <input
            name="publicationDate"
            placeholder="Publication date"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <input
            name="familyDate"
            placeholder="Family date, not a disclosure date"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <textarea
            name="passage"
            placeholder="Supplied passage"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <textarea
            name="fullText"
            placeholder="Full text, only if you have it"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="w-fit rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Import reference
          </button>
        </form>
      </section>
    </div>
  );
}
