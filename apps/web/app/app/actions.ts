"use server";
import { createMatter } from "@patent/application";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";

const MODES = [
  "private_development",
  "individual_self_filer",
  "practitioner_supervised",
  "entity_applicant",
] as const;
type Mode = (typeof MODES)[number];

export async function createMatterAction(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const rawMode = String(formData.get("applicantMode") ?? "private_development");
  const applicantMode: Mode = (MODES as readonly string[]).includes(rawMode)
    ? (rawMode as Mode)
    : "private_development";

  const { id } = await createMatter(db(), ctx, {
    title: String(formData.get("title") ?? "").trim(),
    idea: String(formData.get("idea") ?? "").trim(),
    goal: String(formData.get("goal") ?? "").trim() || undefined,
    applicantMode,
  });
  redirect(`/app/matters/${id}`);
}
