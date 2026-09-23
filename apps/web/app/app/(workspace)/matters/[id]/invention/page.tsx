import { getInvention } from "@patent/application";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";
import {
  acceptSuggestionAction,
  answerQuestionAction,
  extractInventionAction,
} from "../../../../invention-actions";

export const dynamic = "force-dynamic";

export default async function InventionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const ctx = await requireContext();
  const data = await getInvention(db(), ctx, id);
  if (!data) notFound();
  const latest = data.extractions[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/app/matters/${id}`}
          className="text-sm text-graphite-500 hover:text-teal-accent"
        >
          ← Back to matter
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-900">Invention</h1>
        <p className="text-sm text-graphite-500">Revision {data.revision}</p>
      </div>
      {notice ? (
        <p className="rounded-md border border-teal-accent-soft bg-teal-accent-soft px-3 py-2 text-sm text-teal-accent">
          {notice}
        </p>
      ) : null}
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Extraction</h2>
        <p className="mt-1 text-sm text-graphite-500">
          {latest
            ? `${latest.status} · ${latest.route}. ${latest.detail}`
            : "Nothing has been read from the record yet."}
        </p>
        <form action={extractInventionAction} className="mt-3">
          <input type="hidden" name="matterId" value={id} />
          <button
            type="submit"
            className="rounded-md bg-teal-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Read the record
          </button>
        </form>
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Supplied statements</h2>
        <ul className="mt-3 space-y-2">
          {data.elements.length === 0 ? (
            <li className="text-sm text-graphite-500">No supplied statement was copied.</li>
          ) : (
            data.elements.map((element) => (
              <li key={element.id} className="text-sm text-graphite-900">
                <span className="mr-2 rounded-full bg-graphite-50 px-2 py-0.5 text-xs text-graphite-500">
                  {element.classification}
                </span>
                {element.text}
              </li>
            ))
          )}
        </ul>
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Questions</h2>
        <ul className="mt-3 space-y-4">
          {data.questions.length === 0 ? (
            <li className="text-sm text-graphite-500">No open questions.</li>
          ) : (
            data.questions.map((question) => {
              const answer = data.answers.find((row) => row.questionId === question.id);
              return (
                <li key={question.id} className="rounded-md border border-graphite-200 p-3">
                  <p className="text-sm text-graphite-900">{question.text}</p>
                  <p className="mt-1 text-xs text-graphite-500">
                    Affects {question.affectedFeature}. {question.whyItMatters}
                  </p>
                  {answer ? (
                    <p className="mt-2 text-sm text-graphite-700">
                      Answered {answer.answeredAt.toISOString()} · revision{" "}
                      {answer.snapshotRevision}
                    </p>
                  ) : (
                    <form action={answerQuestionAction} className="mt-2 space-y-2">
                      <input type="hidden" name="matterId" value={id} />
                      <input type="hidden" name="questionId" value={question.id} />
                      <input type="hidden" name="expectedRevision" value={data.revision} />
                      <label htmlFor={`answer-${question.id}`} className="sr-only">
                        Answer
                      </label>
                      <textarea
                        id={`answer-${question.id}`}
                        name="answer"
                        required
                        rows={3}
                        className="w-full rounded-md border border-graphite-200 px-3 py-2 text-sm text-graphite-900 outline-none focus:border-teal-accent"
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-graphite-200 px-3 py-1.5 text-sm"
                      >
                        Record answer
                      </button>
                    </form>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Development tasks</h2>
        <ul className="mt-3 space-y-2">
          {data.tasks.length === 0 ? (
            <li className="text-sm text-graphite-500">No development task.</li>
          ) : (
            data.tasks.map((task) => (
              <li key={task.id} className="text-sm text-graphite-900">
                {task.text}
                <span className="mt-1 block text-xs text-graphite-500">{task.reason}</span>
              </li>
            ))
          )}
        </ul>
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Model suggestions</h2>
        <ul className="mt-3 space-y-3">
          {data.suggestions.length === 0 ? (
            <li className="text-sm text-graphite-500">No model suggestion.</li>
          ) : (
            data.suggestions.map((suggestion) => (
              <li key={suggestion.id} className="text-sm text-graphite-900">
                <span className="mr-2 text-xs text-graphite-500">
                  {suggestion.classification} · {suggestion.proposedByKind} ·{" "}
                  {suggestion.inventorship}
                </span>
                {suggestion.text}
                {suggestion.status === "accepted" ? (
                  <span className="mt-1 block text-xs text-graphite-500">
                    Accepted {suggestion.acceptedAt?.toISOString()}. No invention date is stored.
                  </span>
                ) : (
                  <form action={acceptSuggestionAction} className="mt-2">
                    <input type="hidden" name="matterId" value={id} />
                    <input type="hidden" name="suggestionId" value={suggestion.id} />
                    <input type="hidden" name="expectedRevision" value={data.revision} />
                    <button
                      type="submit"
                      className="rounded-md border border-graphite-200 px-3 py-1.5 text-sm"
                    >
                      Accept suggestion
                    </button>
                  </form>
                )}
              </li>
            ))
          )}
        </ul>
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Analysis</h2>
        <ul className="mt-3 space-y-1">
          {data.analyses.length === 0 ? (
            <li className="text-sm text-graphite-500">No analysis record.</li>
          ) : (
            data.analyses.map((analysis) => (
              <li key={analysis.id} className="text-sm text-graphite-700">
                {analysis.subject} · revision {analysis.snapshotRevision} · {analysis.status}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
