import { recordPolicyAction, revokeMemberAction, updateGoalAction } from "../../../matter-actions";

interface MemberRow {
  principalId: string;
  role: string;
}

export function GoalEditor(props: { matterId: string; goal: string | null; revision: number }) {
  return (
    <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
      <h2 className="text-sm font-medium text-graphite-700">Goal</h2>
      <form action={updateGoalAction} className="mt-3 space-y-3">
        <input type="hidden" name="matterId" value={props.matterId} />
        <input type="hidden" name="expectedRevision" value={props.revision} />
        <label htmlFor="goal" className="sr-only">
          Goal
        </label>
        <textarea
          id="goal"
          name="goal"
          required
          rows={3}
          maxLength={2000}
          defaultValue={props.goal ?? ""}
          className="w-full rounded-md border border-graphite-200 px-3 py-2 text-graphite-900 outline-none focus:border-teal-accent"
        />
        <button
          type="submit"
          className="rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          Save goal
        </button>
      </form>
    </section>
  );
}

export function MembersPanel(props: { matterId: string; members: MemberRow[] }) {
  return (
    <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
      <h2 className="text-sm font-medium text-graphite-700">People with access</h2>
      <ul className="mt-3 space-y-2">
        {props.members.map((member) => (
          <li key={member.principalId} className="flex items-center justify-between gap-3 text-sm">
            <span className="font-mono text-xs text-graphite-700">{member.principalId}</span>
            <span className="text-graphite-500">{member.role}</span>
          </li>
        ))}
      </ul>
      <form action={revokeMemberAction} className="mt-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="matterId" value={props.matterId} />
        <div className="space-y-1">
          <label htmlFor="principalId" className="block text-xs text-graphite-500">
            Revoke principal
          </label>
          <input
            id="principalId"
            name="principalId"
            required
            className="rounded-md border border-graphite-200 px-3 py-1.5 text-sm text-graphite-900 outline-none focus:border-teal-accent"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-graphite-200 px-3 py-1.5 text-sm text-graphite-900 hover:border-teal-accent"
        >
          Revoke access
        </button>
      </form>
    </section>
  );
}

export function PolicyPanel(props: {
  matterId: string;
  revision: number;
  budget: string | null;
  trainingUseAllowed: boolean | null;
}) {
  return (
    <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
      <h2 className="text-sm font-medium text-graphite-700">Processing policy and run budget</h2>
      <p className="mt-1 text-sm text-graphite-500">
        Budget: {props.budget ?? "not set"} micro-USD. Training use:{" "}
        {props.trainingUseAllowed === false ? "off" : "not recorded"}.
      </p>
      <form action={recordPolicyAction} className="mt-3 space-y-3">
        <input type="hidden" name="matterId" value={props.matterId} />
        <input type="hidden" name="expectedRevision" value={props.revision} />
        <div className="space-y-1">
          <label htmlFor="budgetCapMicrousd" className="block text-xs text-graphite-500">
            Budget cap (micro-USD)
          </label>
          <input
            id="budgetCapMicrousd"
            name="budgetCapMicrousd"
            required
            defaultValue={props.budget ?? ""}
            pattern="[0-9]+"
            className="w-full rounded-md border border-graphite-200 px-3 py-1.5 text-sm outline-none focus:border-teal-accent"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="allowedRegions" className="block text-xs text-graphite-500">
            Allowed regions
          </label>
          <input
            id="allowedRegions"
            name="allowedRegions"
            defaultValue="us"
            className="w-full rounded-md border border-graphite-200 px-3 py-1.5 text-sm outline-none focus:border-teal-accent"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-graphite-200 px-3 py-1.5 text-sm hover:border-teal-accent"
        >
          Record policy
        </button>
      </form>
    </section>
  );
}
