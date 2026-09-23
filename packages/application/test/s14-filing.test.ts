import { randomUUID } from "node:crypto";
import { createDb, type Database, schema } from "@patent/db";
import { eq } from "drizzle-orm";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type AuthorizedContext,
  addIdsCandidate,
  confirmDeadline,
  confirmFiled,
  createMatter,
  evaluateGates,
  getFiling,
  importOfficeAction,
  importReceipt,
  proposeDeadline,
  saveResponse,
} from "../src/index.js";

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DATABASE_MIGRATION_URL;
const run = appUrl && migUrl ? describe : describe.skip;

run("S14 filing", () => {
  let app: Database;
  let owner: Database;
  let appPool: pg.Pool;
  let ownerPool: pg.Pool;
  const orgA = `org_${randomUUID()}`;
  const orgB = `org_${randomUUID()}`;
  const userA = `user_${randomUUID()}`;
  const userB = `user_${randomUUID()}`;
  const ctxA: AuthorizedContext = { tenantId: orgA, userId: userA, actorKind: "person" };
  const modelA: AuthorizedContext = { tenantId: orgA, userId: userA, actorKind: "model" };
  const ctxB: AuthorizedContext = { tenantId: orgB, userId: userB, actorKind: "person" };
  let matterId = "";

  beforeAll(async () => {
    ({ db: app, pool: appPool } = createDb(appUrl as string));
    ({ db: owner, pool: ownerPool } = createDb(migUrl as string));
    await owner.insert(schema.organization).values([
      { id: orgA, name: "A" },
      { id: orgB, name: "B" },
    ]);
    await owner.insert(schema.user).values([
      { id: userA, name: "A", email: `${userA}@e.test` },
      { id: userB, name: "B", email: `${userB}@e.test` },
    ]);
    await owner.insert(schema.member).values([
      { id: randomUUID(), organizationId: orgA, userId: userA, role: "owner" },
      { id: randomUUID(), organizationId: orgB, userId: userB, role: "owner" },
    ]);
    matterId = (
      await createMatter(app, ctxA, { title: "Filing", idea: "A worker records a timeout." })
    ).id;
  });

  afterAll(async () => {
    await owner.delete(schema.matters).where(eq(schema.matters.tenantId, orgA));
    await owner.delete(schema.organization).where(eq(schema.organization.id, orgA));
    await owner.delete(schema.organization).where(eq(schema.organization.id, orgB));
    await owner.delete(schema.user).where(eq(schema.user.id, userA));
    await owner.delete(schema.user).where(eq(schema.user.id, userB));
    await appPool?.end();
    await ownerPool?.end();
  });

  it("does not treat a missing or mismatched receipt as a filing", async () => {
    await expect(
      confirmFiled(app, ctxA, {
        matterId,
        requested: "filed",
        viaDownload: false,
        viaCheckbox: false,
      }),
    ).rejects.toMatchObject({ message: "no receipt means filing is not verified" });
    const mismatched = await importReceipt(app, ctxA, {
      matterId,
      applicationNumber: "16/000,000",
      releasedDigest: "released",
      submittedDigest: "submitted",
    });
    expect(mismatched.receipt.reconciliation).toBe("reconciliation_issue");
    expect(mismatched.matterState).toBe("intake");
    await expect(
      confirmFiled(app, ctxA, {
        matterId,
        requested: "granted_recorded",
        viaDownload: true,
        viaCheckbox: true,
      }),
    ).rejects.toMatchObject({ code: "POLICY_BLOCKED" });
    await expect(
      confirmFiled(app, modelA, {
        matterId,
        requested: "filed",
        viaDownload: false,
        viaCheckbox: false,
      }),
    ).rejects.toMatchObject({ code: "POLICY_BLOCKED" });
    expect((await getFiling(app, ctxA, matterId))?.state).toBe("intake");
  });

  it("records a matched receipt, a sourced deadline, and blocks new matter", async () => {
    const matched = await importReceipt(app, ctxA, {
      matterId,
      applicationNumber: "16/000,001",
      releasedDigest: "same",
      submittedDigest: "same",
    });
    expect(matched.receipt.verified).toBe(true);
    expect(matched.matterState).toBe("intake");
    const filed = await confirmFiled(app, ctxA, {
      matterId,
      requested: "filed",
      viaDownload: false,
      viaCheckbox: false,
    });
    expect(filed.state).toBe("filed");
    const action = await importOfficeAction(app, ctxA, {
      matterId,
      sourceText: "Claim 1 is rejected. The application is granted.",
    });
    expect(action.matterState).toBe("filed");
    expect(action.action.claimNumbers).toEqual([1]);
    const deadline = await proposeDeadline(app, ctxA, {
      matterId,
      source: "imported office action",
      ruleContext: "37 CFR 1.134",
      proposedDue: "2026-12-01",
    });
    const confirmed = await confirmDeadline(app, ctxA, { matterId, deadlineId: deadline.id });
    expect(confirmed.confirmed).toBe(true);
    expect(confirmed.source).toBe("imported office action");
    expect(confirmed.ruleContext).toBe("37 CFR 1.134");
    await expect(
      saveResponse(app, ctxA, {
        matterId,
        text: "Add a recovery ledger.",
        supportNote: null,
        newlyInvented: true,
      }),
    ).rejects.toMatchObject({ message: "unsupported amendment" });
    const ids = await addIdsCandidate(app, ctxA, { matterId, label: "Timeout ledger article" });
    expect(ids.submitted).toBe(false);
    const gates = await evaluateGates(app, ctxA, matterId);
    expect(gates.find((gate) => gate.gateId === "G14")?.outcome).toBe("needs_review");
    expect(gates.find((gate) => gate.gateId === "G15")?.outcome).toBe("needs_review");
    expect((await getFiling(app, ctxA, matterId))?.state).toBe("filed");
    expect(await getFiling(app, ctxB, matterId)).toBeNull();
  });
});
