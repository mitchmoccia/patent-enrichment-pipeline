import Link from "next/link";
import { requireContext } from "@/session";
import { createMatterAction } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function NewMatterPage() {
  await requireContext();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/app" className="text-sm text-graphite-500 hover:text-teal-accent">
          ← Back to matters
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-900">
          New private matter
        </h1>
        <p className="text-sm text-graphite-500">
          Your idea is stored as dated evidence (a supplied-fact assertion), not just a title.
        </p>
      </div>

      <form
        action={createMatterAction}
        className="space-y-5 rounded-lg border border-graphite-200 bg-paper-raised p-6"
      >
        <div className="space-y-1">
          <label htmlFor="title" className="block text-sm font-medium text-graphite-700">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={300}
            className="w-full rounded-md border border-graphite-200 px-3 py-2 text-graphite-900 outline-none focus:border-teal-accent"
            placeholder="e.g. Bounded spending authority for AI workers"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="idea" className="block text-sm font-medium text-graphite-700">
            Initial idea
          </label>
          <textarea
            id="idea"
            name="idea"
            required
            rows={5}
            maxLength={20000}
            className="w-full rounded-md border border-graphite-200 px-3 py-2 text-graphite-900 outline-none focus:border-teal-accent"
            placeholder="Describe the technical mechanism in plain language."
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="goal" className="block text-sm font-medium text-graphite-700">
            Goal <span className="text-graphite-400">(optional)</span>
          </label>
          <input
            id="goal"
            name="goal"
            maxLength={2000}
            className="w-full rounded-md border border-graphite-200 px-3 py-2 text-graphite-900 outline-none focus:border-teal-accent"
            placeholder="What outcome are you pursuing?"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="runBudgetMicrousd"
            className="block text-sm font-medium text-graphite-700"
          >
            Run budget (micro-USD) <span className="text-graphite-400">(optional)</span>
          </label>
          <input
            id="runBudgetMicrousd"
            name="runBudgetMicrousd"
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-full rounded-md border border-graphite-200 px-3 py-2 text-graphite-900 outline-none focus:border-teal-accent"
            placeholder="25000000"
          />
          <p className="text-xs text-graphite-500">
            Stored on the matter. Spend accounting starts when a run is launched.
          </p>
        </div>

        <fieldset className="space-y-3 rounded-md border border-graphite-200 p-4">
          <legend className="px-1 text-sm font-medium text-graphite-700">Processing policy</legend>
          <label className="flex items-center gap-2 text-sm text-graphite-700">
            <input type="checkbox" name="recordPolicy" value="yes" />
            Record a policy with this matter
          </label>
          <div className="space-y-1">
            <label htmlFor="allowedRegions" className="block text-sm text-graphite-700">
              Allowed regions
            </label>
            <input
              id="allowedRegions"
              name="allowedRegions"
              defaultValue="us"
              className="w-full rounded-md border border-graphite-200 px-3 py-2 text-graphite-900 outline-none focus:border-teal-accent"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-graphite-700">
            <input type="checkbox" name="confidentialEgressAllowed" value="yes" />
            Confidential egress allowed
          </label>
          <p className="text-xs text-graphite-500">
            Training use stays off. You are the approving person; this is not a counsel sign-off.
          </p>
        </fieldset>

        <div className="space-y-1">
          <label htmlFor="applicantMode" className="block text-sm font-medium text-graphite-700">
            Applicant mode
          </label>
          <select
            id="applicantMode"
            name="applicantMode"
            defaultValue="private_development"
            className="w-full rounded-md border border-graphite-200 bg-white px-3 py-2 text-graphite-900 outline-none focus:border-teal-accent"
          >
            <option value="private_development">Private development</option>
            <option value="individual_self_filer">Individual self-filer</option>
            <option value="practitioner_supervised">Practitioner supervised</option>
            <option value="entity_applicant">Entity applicant</option>
          </select>
        </div>

        <button
          type="submit"
          className="rounded-md bg-teal-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Create matter
        </button>
      </form>
    </div>
  );
}
