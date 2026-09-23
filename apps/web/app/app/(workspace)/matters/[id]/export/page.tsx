import { getExport } from "@patent/application";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";
import { buildExportAction } from "../../../../export-actions";

export const dynamic = "force-dynamic";

export default async function ExportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const data = await getExport(db(), await requireContext(), id);
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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-900">Export</h1>
        <p className="text-sm text-graphite-500">
          The download is a review package. It is not a USPTO portal rendering, and the form stays
          unexecuted. Matter state is {data.matterState}.
        </p>
      </div>
      {notice ? (
        <p className="rounded-md border border-teal-accent-soft bg-teal-accent-soft px-3 py-2 text-sm text-teal-accent">
          {notice}
        </p>
      ) : null}
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Package</h2>
        <p className="mt-2 text-sm text-graphite-900">Status: {data.status}</p>
        {data.status === "current" ? (
          <ul className="mt-3 space-y-2">
            {data.files.map((file) => (
              <li key={file.name} className="text-sm text-graphite-900">
                <span className="font-medium">{file.name}</span>
                <span className="mt-1 block break-all text-graphite-500">{file.sha256}</span>
                <span className="mt-1 block whitespace-pre-wrap">{file.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-graphite-500">
            {data.status === "expired"
              ? "This link has expired. Build a new package."
              : data.status === "stale"
                ? "The specification changed. The previous manifest no longer matches."
                : "No package has been built."}
          </p>
        )}
        <p className="mt-3 text-sm text-graphite-500">
          PDF page rendering is unavailable. document.xml is text markup, not a zipped DOCX.
        </p>
        <form action={buildExportAction} className="mt-3">
          <input type="hidden" name="matterId" value={id} />
          <button
            type="submit"
            className="rounded-md bg-teal-accent px-3 py-1.5 text-sm text-paper"
          >
            Build package
          </button>
        </form>
      </section>
    </div>
  );
}
