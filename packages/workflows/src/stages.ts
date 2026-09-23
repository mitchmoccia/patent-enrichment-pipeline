export const stageGraph = ["ingest", "analyze"] as const;

export type StageName = (typeof stageGraph)[number];

/** The next stage after `current`. Null means the graph for this snapshot is finished. */
export function nextStage(current: StageName | null): StageName | null {
  if (current === null) return stageGraph[0] ?? null;
  const index = stageGraph.indexOf(current);
  if (index < 0) return null;
  return stageGraph[index + 1] ?? null;
}
