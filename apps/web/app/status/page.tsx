import { type ConfigurationStatus, computeIntegrationStatus } from "@patent/contracts";
import { getEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ConfigurationStatus, string> = {
  unconfigured: "Unconfigured",
  partially_configured: "Partially configured",
  configured: "Configured",
};

function statusClasses(status: ConfigurationStatus): string {
  switch (status) {
    case "configured":
      return "bg-teal-accent-soft text-teal-accent";
    case "partially_configured":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-graphite-50 text-graphite-500";
  }
}

export default function StatusPage() {
  const integrations = computeIntegrationStatus(getEnv());
  const configured = integrations.filter((i) => i.status === "configured").length;
  const verified = integrations.filter((i) => i.verified).length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-graphite-900">
          Integration status
        </h1>
        <p className="max-w-2xl text-sm text-graphite-700">
          Readiness is tracked as configured (required environment present) and verified (proven
          with a live test in its slice). At S00 nothing is verified. An unconfigured adapter is an
          honest limitation — never a silent fallback to fabricated results.
        </p>
        <p className="text-sm text-graphite-500">
          {configured} of {integrations.length} configured · {verified} verified
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-graphite-200 bg-paper-raised">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-graphite-200 text-xs uppercase tracking-wide text-graphite-500">
              <th className="px-4 py-3 font-medium">Integration</th>
              <th className="px-4 py-3 font-medium">Slice</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Verified</th>
              <th className="px-4 py-3 font-medium">Missing configuration</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((integration) => (
              <tr key={integration.id} className="border-b border-graphite-200 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-graphite-900">{integration.label}</div>
                  <div className="text-xs text-graphite-500">{integration.description}</div>
                </td>
                <td className="px-4 py-3 text-graphite-700">{integration.slice}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses(integration.status)}`}
                  >
                    {STATUS_LABEL[integration.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-graphite-700">
                  {integration.verified ? "Yes" : "No"}
                </td>
                <td className="px-4 py-3">
                  {integration.missingEnv.length === 0 ? (
                    <span className="text-graphite-500">—</span>
                  ) : (
                    <code className="text-xs text-graphite-700">
                      {integration.missingEnv.join(", ")}
                    </code>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
