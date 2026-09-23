import { getSpecification } from "@patent/application";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";
import {
  saveFigureAction,
  saveSectionAction,
  saveTermAction,
} from "../../../../specification-actions";

export const dynamic = "force-dynamic";

export default async function SpecificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const data = await getSpecification(db(), await requireContext(), id);
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
          Specification
        </h1>
        <p className="text-sm text-graphite-500">
          Abstract, description, and claims are edited as sections. Example language stays
          hypothetical. A description edit marks claim support stale.
        </p>
      </div>
      {notice ? (
        <p className="rounded-md border border-teal-accent-soft bg-teal-accent-soft px-3 py-2 text-sm text-teal-accent">
          {notice}
        </p>
      ) : null}
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Sections</h2>
        <ul className="mt-3 space-y-2">
          {data.sections.map((section) => (
            <li key={section.id} className="text-sm text-graphite-900">
              <span className="font-medium">{section.kind}</span> · revision {section.revision}
              {section.hypothetical ? " · hypothetical" : ""}
              <span className="mt-1 block">{section.text}</span>
            </li>
          ))}
        </ul>
        <form action={saveSectionAction} className="mt-3 grid gap-2">
          <input type="hidden" name="matterId" value={id} />
          <select name="kind" className="rounded-md border border-graphite-200 px-2 py-1 text-sm">
            <option value="abstract">abstract</option>
            <option value="description">description</option>
            <option value="claims">claims</option>
          </select>
          <textarea
            name="text"
            required
            placeholder="Section text"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <input
            name="evidenceNote"
            placeholder="Experiment evidence for a numerical claim"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-graphite-700">
            <input type="checkbox" name="hypothetical" />
            Mark as hypothetical
          </label>
          <button
            type="submit"
            className="w-fit rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Save section
          </button>
        </form>
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Figures</h2>
        <ul className="mt-3 space-y-2">
          {data.figures.map((figure) => (
            <li key={figure.id} className="text-sm text-graphite-900">
              Figure {figure.numeral}: {figure.label}. {figure.description}
            </li>
          ))}
        </ul>
        <form action={saveFigureAction} className="mt-3 flex flex-wrap gap-2">
          <input type="hidden" name="matterId" value={id} />
          <input
            name="numeral"
            required
            placeholder="Numeral"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <input
            name="label"
            required
            placeholder="Label"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <input
            name="description"
            required
            placeholder="Description"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Add figure
          </button>
        </form>
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Terminology</h2>
        <ul className="mt-3 space-y-2">
          {data.terms.map((term) => (
            <li key={term.id} className="text-sm text-graphite-900">
              {term.term}: {term.definition}
            </li>
          ))}
        </ul>
        <form action={saveTermAction} className="mt-3 flex flex-wrap gap-2">
          <input type="hidden" name="matterId" value={id} />
          <input
            name="term"
            required
            placeholder="Term"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <input
            name="definition"
            required
            placeholder="Definition"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Add term
          </button>
        </form>
      </section>
    </div>
  );
}
