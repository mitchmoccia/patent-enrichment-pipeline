import type { MatterEventView, RunView } from "@patent/application";
import {
  advanceRunAction,
  cancelRunAction,
  pauseRunAction,
  resumeRunAction,
  startRunAction,
} from "../../../run-actions";
import { RunEvents } from "./run-events";

function outputText(output: Record<string, unknown> | null): string {
  if (!output) return "No output yet.";
  const outcome = typeof output.outcome === "string" ? output.outcome : "";
  const detail = typeof output.detail === "string" ? output.detail : "";
  const source = typeof output.source === "string" ? output.source : "";
  return (
    [outcome, source, detail].filter((part) => part.length > 0).join(" — ") || "Output recorded."
  );
}

export function RunPanel(props: { matterId: string; runs: RunView[]; events: MatterEventView[] }) {
  return (
    <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
      <h2 className="text-sm font-medium text-graphite-700">Runs</h2>
      <p className="mt-1 text-sm text-graphite-500">
        A run stays on the server when the browser closes. Unknown provider costs stay listed and
        block new spend until they are reconciled.
      </p>
      <form action={startRunAction} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="matterId" value={props.matterId} />
        <div className="space-y-1">
          <label htmlFor="idempotencyKey" className="block text-xs text-graphite-500">
            Start key
          </label>
          <input
            id="idempotencyKey"
            name="idempotencyKey"
            required
            maxLength={200}
            className="rounded-md border border-graphite-200 px-3 py-1.5 text-sm text-graphite-900 outline-none focus:border-teal-accent"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          Start run
        </button>
      </form>
      <ul className="mt-4 space-y-4">
        {props.runs.length === 0 ? (
          <li className="text-sm text-graphite-500">No runs yet.</li>
        ) : (
          props.runs.map((run) => (
            <li key={run.id} className="rounded-md border border-graphite-200 p-3">
              <p className="text-sm text-graphite-900">
                {run.status} · fence {run.fenceToken}
              </p>
              <ul className="mt-2 space-y-1">
                {run.stages.map((stage) => (
                  <li key={stage.name} className="text-xs text-graphite-700">
                    {stage.name}: {stage.status}. {outputText(stage.output)}
                  </li>
                ))}
              </ul>
              <ul className="mt-2 space-y-1">
                {run.reservations.length === 0 ? (
                  <li className="text-xs text-graphite-500">No reservations.</li>
                ) : (
                  run.reservations.map((row) => (
                    <li key={row.operationId} className="text-xs text-graphite-700">
                      {row.operationId}: {row.status}
                      {row.known
                        ? ` · ${row.amountMicrousd ?? "0"} micro-USD`
                        : " · unknown amount, still blocking spend"}
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={advanceRunAction}>
                  <input type="hidden" name="matterId" value={props.matterId} />
                  <input type="hidden" name="runId" value={run.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-graphite-200 px-2 py-1 text-xs"
                  >
                    Advance
                  </button>
                </form>
                <form action={pauseRunAction}>
                  <input type="hidden" name="matterId" value={props.matterId} />
                  <input type="hidden" name="runId" value={run.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-graphite-200 px-2 py-1 text-xs"
                  >
                    Pause
                  </button>
                </form>
                <form action={resumeRunAction}>
                  <input type="hidden" name="matterId" value={props.matterId} />
                  <input type="hidden" name="runId" value={run.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-graphite-200 px-2 py-1 text-xs"
                  >
                    Resume
                  </button>
                </form>
                <form action={cancelRunAction}>
                  <input type="hidden" name="matterId" value={props.matterId} />
                  <input type="hidden" name="runId" value={run.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-graphite-200 px-2 py-1 text-xs"
                  >
                    Cancel
                  </button>
                </form>
              </div>
            </li>
          ))
        )}
      </ul>
      <RunEvents matterId={props.matterId} initial={props.events} />
    </section>
  );
}
