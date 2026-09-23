import { getRights } from "@patent/application";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";
import {
  addChronologyAction,
  addContributionAction,
  addEmbodimentAction,
  assignFilingAction,
  chooseSelfFilerAction,
  promoteRuleAction,
  selectRuleAction,
} from "../../../../rights-actions";

export const dynamic = "force-dynamic";

export default async function RightsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const ctx = await requireContext();
  const data = await getRights(db(), ctx, id);
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
          Rights and chronology
        </h1>
        <p className="text-sm text-graphite-500">
          Applicant mode: {data.applicantMode} · Revision {data.revision}
        </p>
      </div>
      {notice ? (
        <p className="rounded-md border border-teal-accent-soft bg-teal-accent-soft px-3 py-2 text-sm text-teal-accent">
          {notice}
        </p>
      ) : null}
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Contributions</h2>
        <p className="mt-1 text-sm text-graphite-500">
          Inventor, applicant, owner, and assignment obligation stay separate. None of them resolves
          legal inventorship.
        </p>
        <ul className="mt-3 space-y-2">
          {data.contributions.length === 0 ? (
            <li className="text-sm text-graphite-500">No contribution recorded.</li>
          ) : (
            data.contributions.map((row) => (
              <li key={row.id} className="text-sm text-graphite-900">
                {row.role}: {row.personLabel} · inventorship {row.legalInventorship}
              </li>
            ))
          )}
        </ul>
        <form action={addContributionAction} className="mt-3 flex flex-wrap gap-2">
          <input type="hidden" name="matterId" value={id} />
          <select name="role" className="rounded-md border border-graphite-200 px-2 py-1 text-sm">
            <option value="inventor">inventor</option>
            <option value="applicant">applicant</option>
            <option value="owner">owner</option>
            <option value="assignment_obligation">assignment obligation</option>
          </select>
          <input
            name="personLabel"
            required
            placeholder="Person"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <input
            name="account"
            required
            placeholder="Account"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Record
          </button>
        </form>
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Chronology</h2>
        <ul className="mt-3 space-y-2">
          {data.events.length === 0 ? (
            <li className="text-sm text-graphite-500">No disclosure, sale, or filing event.</li>
          ) : (
            data.events.map((row) => (
              <li key={row.id} className="text-sm text-graphite-900">
                {row.kind} · {row.precision}
                {row.eventDate ? ` · ${row.eventDate}` : " · date unknown"} · {row.note}
              </li>
            ))
          )}
        </ul>
        <form action={addChronologyAction} className="mt-3 flex flex-wrap gap-2">
          <input type="hidden" name="matterId" value={id} />
          <select name="kind" className="rounded-md border border-graphite-200 px-2 py-1 text-sm">
            <option value="disclosure">disclosure</option>
            <option value="sale">sale</option>
            <option value="filing">filing</option>
          </select>
          <select
            name="precision"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          >
            <option value="day">day</option>
            <option value="month">month</option>
            <option value="year">year</option>
            <option value="unknown">unknown</option>
          </select>
          <input
            name="eventDate"
            placeholder="YYYY-MM-DD"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <input
            name="note"
            required
            placeholder="Note"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Add event
          </button>
        </form>
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Embodiments</h2>
        <ul className="mt-3 space-y-3">
          {data.embodiments.map((row) => (
            <li key={row.id} className="text-sm text-graphite-900">
              {row.label} developed {row.developedOn}
              {row.filingOn ? ` · filing ${row.filingOn}` : " · no filing date"}
              <form action={assignFilingAction} className="mt-2 flex gap-2">
                <input type="hidden" name="matterId" value={id} />
                <input type="hidden" name="embodimentId" value={row.id} />
                <input
                  name="filingOn"
                  required
                  placeholder="Filing YYYY-MM-DD"
                  className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md border border-graphite-200 px-3 py-1 text-sm"
                >
                  Assign filing date
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addEmbodimentAction} className="mt-3 flex flex-wrap gap-2">
          <input type="hidden" name="matterId" value={id} />
          <input
            name="label"
            required
            placeholder="Label"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <input
            name="developedOn"
            required
            placeholder="Developed YYYY-MM-DD"
            className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Add embodiment
          </button>
        </form>
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Legal sources</h2>
        <p className="mt-1 text-sm text-graphite-500">
          The register is seeded. Counsel has not approved it. A reviewer promotion is not a
          signature and does not make superseded guidance current.
        </p>
        <ul className="mt-3 space-y-3">
          {data.sources.map((source) => (
            <li key={source.sourceKey} className="text-sm text-graphite-900">
              <span className="font-medium">{source.title}</span>
              <span className="mt-1 block text-graphite-500">{source.alert}</span>
              <form action={selectRuleAction} className="mt-2 inline">
                <input type="hidden" name="matterId" value={id} />
                <input type="hidden" name="sourceKey" value={source.sourceKey} />
                <button
                  type="submit"
                  className="mr-2 rounded-md border border-graphite-200 px-3 py-1 text-sm"
                >
                  Select as current
                </button>
              </form>
              <form action={promoteRuleAction} className="inline">
                <input type="hidden" name="matterId" value={id} />
                <input type="hidden" name="sourceKey" value={source.sourceKey} />
                <button
                  type="submit"
                  className="rounded-md border border-graphite-200 px-3 py-1 text-sm"
                >
                  Reviewer promotion
                </button>
              </form>
            </li>
          ))}
        </ul>
        {data.rules.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {data.rules.map((rule) => (
              <li key={rule.id} className="text-sm text-graphite-700">
                Selected {rule.title}: {rule.alert}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Self-filer release</h2>
        <p className="mt-1 text-sm text-graphite-500">
          {data.release
            ? `Recorded label: ${data.release.label}`
            : "No release chosen. An entity applicant cannot take the individual self-filer label."}
        </p>
        <form action={chooseSelfFilerAction} className="mt-3">
          <input type="hidden" name="matterId" value={id} />
          <button
            type="submit"
            className="rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Choose self-filer
          </button>
        </form>
      </section>
    </div>
  );
}
