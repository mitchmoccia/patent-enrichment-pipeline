import { getFiling } from "@patent/application";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";
import {
  addIdsAction,
  confirmDeadlineAction,
  confirmFiledAction,
  importOfficeActionAction,
  importReceiptAction,
  proposeDeadlineAction,
  saveResponseAction,
} from "../../../../filing-actions";

export const dynamic = "force-dynamic";

export default async function FilingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const data = await getFiling(db(), await requireContext(), id);
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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-900">Filing</h1>
        <p className="text-sm text-graphite-500">
          Official submission stays manual. Matter state is {data.state}. A download, a checkbox, or
          a model statement does not record filed or granted.
        </p>
      </div>
      {notice ? (
        <p className="rounded-md border border-teal-accent-soft bg-teal-accent-soft px-3 py-2 text-sm text-teal-accent">
          {notice}
        </p>
      ) : null}
      <section className="space-y-2 text-sm text-graphite-900">
        {data.receipts.map((receipt) => (
          <p key={receipt.id}>
            Receipt {receipt.reconciliation}. Verified: {receipt.verified ? "yes" : "no"}.
          </p>
        ))}
        {data.deadlines.map((deadline) => (
          <p key={deadline.id}>
            {deadline.proposedDue} · {deadline.source} · {deadline.ruleContext} ·{" "}
            {deadline.confirmed ? "confirmed" : "proposed"}
          </p>
        ))}
      </section>
      <form action={importReceiptAction} className="grid gap-2">
        <input type="hidden" name="matterId" value={id} />
        <input
          name="applicationNumber"
          placeholder="Application number"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <input
          name="releasedDigest"
          required
          placeholder="Released package digest"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <input
          name="submittedDigest"
          required
          placeholder="Submitted file digest"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          className="w-fit rounded-md bg-teal-accent px-3 py-1.5 text-sm text-paper"
        >
          Import receipt
        </button>
      </form>
      <form action={confirmFiledAction}>
        <input type="hidden" name="matterId" value={id} />
        <button type="submit" className="rounded-md border border-graphite-200 px-3 py-1.5 text-sm">
          Record filed from a matched receipt
        </button>
      </form>
      <form action={importOfficeActionAction} className="grid gap-2">
        <input type="hidden" name="matterId" value={id} />
        <textarea
          name="sourceText"
          required
          placeholder="Office action text"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          className="w-fit rounded-md border border-graphite-200 px-3 py-1.5 text-sm"
        >
          Import office action
        </button>
      </form>
      <form action={proposeDeadlineAction} className="grid gap-2">
        <input type="hidden" name="matterId" value={id} />
        <input
          name="source"
          required
          placeholder="Source"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <input
          name="ruleContext"
          required
          placeholder="Rule"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <input
          name="proposedDue"
          required
          placeholder="Proposed due date"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          className="w-fit rounded-md border border-graphite-200 px-3 py-1.5 text-sm"
        >
          Propose deadline
        </button>
      </form>
      {data.deadlines
        .filter((deadline) => !deadline.confirmed)
        .map((deadline) => (
          <form key={deadline.id} action={confirmDeadlineAction}>
            <input type="hidden" name="matterId" value={id} />
            <input type="hidden" name="deadlineId" value={deadline.id} />
            <button type="submit" className="text-sm text-teal-accent">
              Confirm {deadline.proposedDue}
            </button>
          </form>
        ))}
      <form action={saveResponseAction} className="grid gap-2">
        <input type="hidden" name="matterId" value={id} />
        <textarea
          name="text"
          required
          placeholder="Response text"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <input
          name="supportNote"
          placeholder="Original support"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-graphite-700">
          <input type="checkbox" name="newlyInvented" />
          This feature was not in the original application
        </label>
        <button
          type="submit"
          className="w-fit rounded-md border border-graphite-200 px-3 py-1.5 text-sm"
        >
          Save response
        </button>
      </form>
      <form action={addIdsAction} className="grid gap-2">
        <input type="hidden" name="matterId" value={id} />
        <input
          name="label"
          required
          placeholder="IDS candidate"
          className="rounded-md border border-graphite-200 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          className="w-fit rounded-md border border-graphite-200 px-3 py-1.5 text-sm"
        >
          Add IDS candidate
        </button>
      </form>
    </div>
  );
}
