import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { currentTotp, rememberTotpSecret, secretFromUri } from "./totp";

interface Fixture {
  fixtureId: string;
  input: {
    idea: string;
    goal: string;
    artifacts: { id: string; text: string }[];
  };
}

const fixture = JSON.parse(
  readFileSync(
    new URL("../../../docs/handoff/fixtures/agent-spending-authority.json", import.meta.url),
    "utf8",
  ),
) as Fixture;

const statement = fixture.input.artifacts[0];
const question = fixture.input.artifacts[1];
if (!statement || !question) throw new Error("fixture artifacts are missing");

const answer = "Known unknown: Actual recovery state machine.";
const successorGoal = `${fixture.input.goal} Known unknown: Actual recovery state machine.`;

async function enterCode(page: Page, secret: string, button: string): Promise<void> {
  await page.locator("#code").fill(await currentTotp(secret));
  await page.getByRole("button", { name: button }).click();
}

async function uploadArtifact(page: Page, name: string, text: string): Promise<void> {
  await page.locator("#file").setInputFiles({
    name,
    mimeType: "text/plain",
    buffer: Buffer.from(text, "utf8"),
  });
  await page.getByRole("button", { name: "Upload" }).click();
  await page.waitForURL(/\/app\/matters\/[^/]+\/evidence\//);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("Local development filesystem. This is not S3.")).toBeVisible();
  await expect(page.getByText(/SHA-256 [a-f0-9]{64}/)).toBeVisible();
  await expect(page.locator("pre")).toHaveText(text);
  await page.getByRole("link", { name: "← Back to matter" }).click();
}

test("signed-in synthetic matter journey", async ({ page }) => {
  const email = `journey-${randomUUID()}@example.com`;
  const password = `Journey-${randomBytes(18).toString("base64url")}`;

  await page.goto("/sign-up");
  await page.locator("#name").fill("Synthetic journey");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/app/mfa");

  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Create authenticator setup" }).click();
  await expect(page.getByText("Authenticator URI")).toBeVisible();
  const secret = secretFromUri(await page.locator("p.break-all").innerText());
  rememberTotpSecret(secret);
  await enterCode(page, secret, "Verify and continue");
  await page.waitForURL(/\/app\/?$/);
  await expect(page.getByRole("heading", { name: "Your matters" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/sign-in");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/sign-in/two-factor");
  await enterCode(page, secret, "Continue");
  await page.waitForURL(/\/app\/?$/);

  await page.getByRole("link", { name: "New matter" }).click();
  await page.locator("#title").fill(fixture.fixtureId);
  await page.locator("#idea").fill(fixture.input.idea);
  await page.locator("#goal").fill(fixture.input.goal);
  await page.locator("#runBudgetMicrousd").fill("25000000");
  await page.locator("input[name=recordPolicy]").check();
  await expect(page.locator("#applicantMode")).toHaveValue("private_development");
  await page.getByRole("button", { name: "Create matter" }).click();
  await page.waitForURL(/\/app\/matters\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: fixture.fixtureId })).toBeVisible();
  await expect(page.getByText("Applicant mode: private_development")).toBeVisible();
  await expect(page.getByText("State: intake")).toBeVisible();
  await expect(page.getByText("Revision 0")).toBeVisible();
  await expect(page.getByText(fixture.input.idea)).toBeVisible();

  if (!statement.text || !question.text) throw new Error("fixture artifact text is missing");
  await uploadArtifact(page, `${statement.id}.txt`, statement.text);
  await uploadArtifact(page, `${question.id}.txt`, question.text);

  await page.getByRole("link", { name: "Invention workspace" }).click();
  await page.getByRole("button", { name: "Read the record" }).click();
  await expect(
    page.getByText(
      "provider_unavailable · not_configured. No model route produced an extraction. Questions are gaps in the supplied record.",
    ),
  ).toBeVisible();
  const card = page.locator("li", { hasText: question.text });
  await card.locator("textarea[name=answer]").fill(answer);
  await card.getByRole("button", { name: "Record answer" }).click();
  await expect(card.getByText(/Answered /)).toBeVisible();

  await page.getByRole("link", { name: "← Back to matter" }).click();
  const before = Number((await page.getByText(/Revision \d+/).innerText()).match(/\d+/)?.[0]);
  await page.locator("#goal").fill(successorGoal);
  await page.getByRole("button", { name: "Save goal" }).click();
  await expect(page.getByText(`Goal saved at revision ${before + 1}`)).toBeVisible();
  await expect(
    page.getByText(`Applicant mode: private_development · Revision ${before + 1}`),
  ).toBeVisible();
  await expect(page.locator("#goal")).toHaveValue(successorGoal);

  await page.getByRole("link", { name: "Research" }).click();
  await expect(page.getByText(/uspto: not_configured\./)).toBeVisible();
  await expect(page.getByText(/epo_ops: not_configured\./)).toBeVisible();
  await page.locator("input[name=query]").fill("shared spending allowance");
  await page.getByRole("button", { name: "Search imported records" }).click();
  await expect(
    page.getByText(
      /Stop reason: External patent offices were not called\. Their endpoint contracts are not verified, so a missing or rejected key is not zero matches\./,
    ),
  ).toBeVisible();
  await expect(page.getByText("No imported reference.")).toBeVisible();

  await page.getByRole("link", { name: "← Back to matter" }).click();
  await page.getByRole("link", { name: "Claims" }).click();
  await page.locator("select[name=category]").selectOption("method");
  await page
    .locator("form")
    .filter({ hasText: "Add claim" })
    .locator("select[name=connective]")
    .selectOption("and");
  await page.locator("input[name=limitation]").fill("records a timeout");
  await page.locator("input[name=actor]").fill("worker");
  await page.getByRole("button", { name: "Add claim" }).click();
  await expect(page.getByText("records a timeout · worker")).toBeVisible();

  await page.getByRole("link", { name: "← Back to matter" }).click();
  await page.getByRole("link", { name: "Specification" }).click();
  await page.locator("input[name=numeral]").fill("1");
  await page.locator("input[name=label]").fill("ledger");
  await page.locator("input[name=description]").fill("A ledger of timeouts.");
  await page.getByRole("button", { name: "Add figure" }).click();
  await expect(page.getByText("Figure 1: ledger. A ledger of timeouts.")).toBeVisible();

  await page.locator("select[name=kind]").selectOption("abstract");
  await page
    .locator("textarea[name=text]")
    .fill("A shared spending allowance is recorded for workers that can duplicate process state.");
  await page.getByRole("button", { name: "Save section" }).click();
  await expect(
    page.getByText(
      "A shared spending allowance is recorded for workers that can duplicate process state.",
    ),
  ).toBeVisible();

  await page.locator("select[name=kind]").selectOption("description");
  await page.locator("textarea[name=text]").fill("Figure 1 shows a ledger.");
  await page.getByRole("button", { name: "Save section" }).click();
  await expect(page.getByText("Figure 1 shows a ledger.")).toBeVisible();

  await page.locator("select[name=kind]").selectOption("claims");
  await page.locator("textarea[name=text]").fill("1. A method that records a timeout.");
  await page.locator("input[name=evidenceNote]").fill("The worker recorded the timeout count.");
  await page.getByRole("button", { name: "Save section" }).click();
  await expect(page.getByText("1. A method that records a timeout.")).toBeVisible();

  await page.getByRole("link", { name: "← Back to matter" }).click();
  await page.getByRole("link", { name: "Review" }).click();
  await page.getByRole("button", { name: "Run checks" }).click();
  await expect(page.getByText("A model cannot approve a gate.")).toBeVisible();
  await expect(page.getByText(/needs_review|fail/).first()).toBeVisible();

  await page.getByRole("link", { name: "← Back to matter" }).click();
  await page.getByRole("link", { name: "Export" }).click();
  await page.getByRole("button", { name: "Build package" }).click();
  await expect(page.getByText("Status: current")).toBeVisible();
  await expect(page.getByText("Matter state is intake")).toBeVisible();
  await expect(page.getByText("PDF page rendering is unavailable.")).toBeVisible();
  const formFile = page.locator("li", { hasText: "form.txt" });
  await expect(formFile).toContainText("UNEXECUTED");
  await expect(page.getByText("word/document.xml")).toBeVisible();
  const released = (await formFile.locator("span.break-all").innerText()).trim();
  expect(released).toMatch(/^[a-f0-9]{64}$/);

  await page.getByRole("link", { name: "← Back to matter" }).click();
  await page.getByRole("link", { name: "Filing" }).click();
  await page.locator("input[name=applicationNumber]").fill("SAMPLE-NOT-A-FILING");
  await page.locator("input[name=releasedDigest]").fill(released);
  await page.locator("input[name=submittedDigest]").fill("0".repeat(64));
  await page.getByRole("button", { name: "Import receipt" }).click();
  await expect(
    page.getByText("Receipt reconciliation_issue. Matter state remains intake."),
  ).toBeVisible();
  await expect(page.getByText("Verified: no.")).toBeVisible();
  await page.locator("textarea[name=sourceText]").fill("Claim 1 is rejected.");
  await page.getByRole("button", { name: "Import office action" }).click();
  await expect(page.getByText("Office action stored. Matter state remains intake.")).toBeVisible();
  await expect(page.getByText("Matter state is intake.")).toBeVisible();
});
