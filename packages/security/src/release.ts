export function instructionEffect(_text: string) {
  return { network: false as const, policy: false as const, export: false as const };
}

export function workerTarget(url: string): { allowed: false; reason: string } {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return { allowed: false, reason: "only configured object storage is readable" };
    }
  } catch {
    return { allowed: false, reason: "unparseable target" };
  }
  return { allowed: false, reason: "workers cannot fetch an arbitrary object" };
}
