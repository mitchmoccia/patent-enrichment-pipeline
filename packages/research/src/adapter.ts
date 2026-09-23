export interface SourceHealth {
  id: "user_import" | "uspto" | "epo_ops";
  status: "ready" | "not_configured" | "credentials_rejected" | "endpoint_unverified";
  matchCount: number | null;
  detail: string;
}

export interface ResearchEnv {
  USPTO_API_KEY?: string;
  EPO_OPS_KEY?: string;
}

/** A rejected credential is never reported as an empty result list. */
export function classifyProviderOutcome(input: {
  httpStatus: number;
  bodyMatchCount: number | null;
}): { status: "credentials_rejected" | "source_unavailable" | "ok"; matchCount: number | null } {
  if (input.httpStatus === 401 || input.httpStatus === 403) {
    return { status: "credentials_rejected", matchCount: null };
  }
  if (input.httpStatus >= 400) {
    return { status: "source_unavailable", matchCount: null };
  }
  return { status: "ok", matchCount: input.bodyMatchCount };
}

/**
 * USPTO and EPO OPS are not called. Their exact endpoint contracts are not
 * verified here, so a present key still does not become a search.
 */
export function adapterHealth(env: ResearchEnv): SourceHealth[] {
  return [
    {
      id: "user_import",
      status: "ready",
      matchCount: null,
      detail: "User-imported references are searched in this matter.",
    },
    office("uspto", env.USPTO_API_KEY, "USPTO Open Data Portal"),
    office("epo_ops", env.EPO_OPS_KEY, "EPO Open Patent Services"),
  ];
}

function office(id: "uspto" | "epo_ops", key: string | undefined, label: string): SourceHealth {
  if (!key) {
    return {
      id,
      status: "not_configured",
      matchCount: null,
      detail: `${label} is not configured. This is not zero matches.`,
    };
  }
  return {
    id,
    status: "endpoint_unverified",
    matchCount: null,
    detail: `${label} has a key, but the entitled endpoint is not verified, so no request was sent.`,
  };
}

export function disclosureDate(record: {
  publicationDate: string | null;
  familyDate: string | null;
}): string | null {
  return record.publicationDate;
}

export function passageOf(record: {
  fullText: string | null;
  fullTextStatus: "available" | "unavailable";
}): { text: string | null; status: "available" | "full_text_unavailable" } {
  if (record.fullTextStatus !== "available" || !record.fullText) {
    return { text: null, status: "full_text_unavailable" };
  }
  return { text: record.fullText, status: "available" };
}

export function rankImports<T extends { title: string; passage: string | null }>(
  query: string,
  rows: readonly T[],
): (T & { score: number })[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
  return rows
    .map((row) => {
      const haystack = `${row.title} ${row.passage ?? ""}`.toLowerCase();
      const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
      return { ...row, score };
    })
    .filter((row) => row.score > 0)
    .sort((left, right) => right.score - left.score);
}
