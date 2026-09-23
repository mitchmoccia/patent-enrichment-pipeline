import { listMatters } from "@patent/application";
import Link from "next/link";
import { db } from "@/db";
import { requireContext } from "@/session";
import { SignOutButton } from "@/sign-out-button";

export const dynamic = "force-dynamic";

const STATE_LABEL: Record<string, string> = {
  intake: "Intake",
  developing: "Developing",
  researching: "Researching",
  drafting: "Drafting",
  review_required: "Review required",
  package_prepared: "Package prepared",
  released: "Released",
};

export default async function AppHome() {
  const ctx = await requireContext();
  const matters = await listMatters(db(), ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-graphite-900">Your matters</h1>
          <p className="text-sm text-graphite-500">
            Private to your workspace. Tenant isolation is enforced by row-level security.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/app/matters/new"
            className="rounded-md bg-teal-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            New matter
          </Link>
          <SignOutButton />
        </div>
      </div>

      {matters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-graphite-200 bg-paper-raised p-10 text-center">
          <p className="text-graphite-700">No matters yet.</p>
          <Link
            href="/app/matters/new"
            className="mt-2 inline-block text-sm font-medium text-teal-accent hover:underline"
          >
            Create your first private matter
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-graphite-200 overflow-hidden rounded-lg border border-graphite-200 bg-paper-raised">
          {matters.map((m) => (
            <li key={m.id}>
              <Link href={`/app/matters/${m.id}`} className="block px-5 py-4 hover:bg-graphite-50">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-graphite-900">{m.title}</span>
                  <span className="rounded-full bg-graphite-50 px-2.5 py-0.5 text-xs text-graphite-500">
                    {STATE_LABEL[m.state] ?? m.state}
                  </span>
                </div>
                {m.goal ? <p className="mt-1 text-sm text-graphite-500">{m.goal}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
