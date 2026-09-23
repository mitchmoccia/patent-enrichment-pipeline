import { getArtifact } from "@patent/application";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";

export const dynamic = "force-dynamic";

const DRIVER_LABEL: Record<string, string> = {
  "local-filesystem": "Local development filesystem. This is not S3.",
  s3: "Private S3 object.",
  none: "Not stored.",
};

export default async function EvidencePage({
  params,
}: {
  params: Promise<{ id: string; artifactId: string }>;
}) {
  const { id, artifactId } = await params;
  const ctx = await requireContext();
  const data = await getArtifact(db(), ctx, artifactId);
  if (!data || data.artifact.matterId !== id) notFound();
  const { artifact, spans } = data;
  const rejected = artifact.scanStatus === "rejected";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/app/matters/${id}`}
        className="text-sm text-graphite-500 hover:text-teal-accent"
      >
        ← Back to matter
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-graphite-900">
          {artifact.originalName}
        </h1>
        <p className="text-sm text-graphite-500">
          {artifact.scanStatus} · {artifact.mediaType} · {artifact.sizeBytes} bytes
        </p>
      </div>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Storage</h2>
        <p className="mt-1 text-sm text-graphite-900">
          {DRIVER_LABEL[artifact.storageDriver] ?? artifact.storageDriver}
        </p>
        <p className="mt-2 break-all font-mono text-xs text-graphite-500">
          SHA-256 {artifact.sha256}
        </p>
        {artifact.scanDetail ? (
          <p className="mt-2 text-sm text-graphite-700">{artifact.scanDetail}</p>
        ) : null}
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">
          {rejected ? "Extraction" : "Extracted text"}
        </h2>
        {artifact.extractedText ? (
          <pre className="mt-3 whitespace-pre-wrap font-sans text-graphite-900">
            {artifact.extractedText}
          </pre>
        ) : (
          <p className="mt-2 text-sm text-graphite-700">
            {rejected
              ? "No text was accepted from this file."
              : "No text was extracted. Nothing was invented."}
          </p>
        )}
      </section>
      <section className="rounded-lg border border-graphite-200 bg-paper-raised p-5">
        <h2 className="text-sm font-medium text-graphite-700">Source spans</h2>
        {spans.length === 0 ? (
          <p className="mt-2 text-sm text-graphite-500">No spans.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {spans.map((span) => (
              <li key={span.id} className="rounded-md border border-graphite-200 p-3">
                <p className="font-mono text-xs text-graphite-500">
                  {span.extractionQuality} · {JSON.stringify(span.locator)}
                </p>
                {span.excerpt ? <p className="mt-2 text-graphite-900">{span.excerpt}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
