import { type Database, schema, withTenant } from "@patent/db";
import {
  entersSelectedDisclosure,
  experimentExecution,
  RuleError,
  rankAlternative,
} from "@patent/domain";
import { and, eq } from "drizzle-orm";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";
import { lockMatter, requireEditor } from "./run-shared";

function blocked(error: unknown): never {
  if (error instanceof RuleError) throw new AppError("POLICY_BLOCKED", error.message);
  throw error;
}

export async function proposeAlternative(
  db: Database,
  ctx: AuthorizedContext,
  input: {
    matterId: string;
    label: string;
    origin: "person" | "model";
    removesBenefit: string | null;
    explanation: string | null;
    partitionTolerant: boolean;
    consistencyAssumption: string | null;
    feasibility: "unknown" | "plausible" | "implausible";
  },
) {
  assertHumanActor(ctx);
  const label = input.label.trim();
  if (!label) throw new AppError("VALIDATION_FAILED", "an alternative needs a label");
  let ranked: ReturnType<typeof rankAlternative>;
  try {
    ranked = rankAlternative(input);
  } catch (error) {
    blocked(error);
  }
  const experiment = experimentExecution(Boolean(process.env.SANDBOX_ENDPOINT));
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.alternatives)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        label,
        origin: input.origin,
        removesBenefit: input.removesBenefit,
        explanation: input.explanation,
        partitionTolerant: input.partitionTolerant,
        consistencyAssumption: input.consistencyAssumption,
        feasibility: input.feasibility,
        rank: ranked.rank,
        rankReason: ranked.reason,
        inSelectedDisclosure: false,
        experimentStatus: experiment.status,
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "alternative was not recorded");
    return { ...row, experimentDetail: experiment.detail };
  });
}

export async function selectAlternative(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; alternativeId: string },
) {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .select()
      .from(schema.alternatives)
      .where(
        and(
          eq(schema.alternatives.id, input.alternativeId),
          eq(schema.alternatives.matterId, input.matterId),
        ),
      );
    if (!row) throw new AppError("NOT_FOUND", "alternative not found");
    if (!entersSelectedDisclosure(row.origin === "model" ? "model" : "person", true)) {
      throw new AppError(
        "POLICY_BLOCKED",
        "a model proposal does not enter the selected disclosure",
      );
    }
    await tx
      .update(schema.alternatives)
      .set({ inSelectedDisclosure: true })
      .where(eq(schema.alternatives.id, row.id));
    return { id: row.id, inSelectedDisclosure: true as const };
  });
}

export async function getAlternatives(db: Database, ctx: AuthorizedContext, matterId: string) {
  return withTenant(db, ctx, async (tx) => {
    const [matter] = await tx.select().from(schema.matters).where(eq(schema.matters.id, matterId));
    if (!matter) return null;
    const rows = await tx
      .select()
      .from(schema.alternatives)
      .where(eq(schema.alternatives.matterId, matterId));
    return {
      alternatives: rows,
      experiment: experimentExecution(Boolean(process.env.SANDBOX_ENDPOINT)),
    };
  });
}
