import { z } from "zod";

export interface SkillOption {
  id: string;
  label: string;
  description: string;
  /** Extra expert guidance injected into the AI system prompt. */
  guidance: string;
}

/**
 * Selectable "skill" profiles. A skill augments the model's base instructions
 * with a focused review methodology (it does not change the required JSON shape).
 */
export const SKILLS: SkillOption[] = [
  {
    id: "none",
    label: "Default",
    description: "Standard general-purpose review with no extra focus.",
    guidance: "",
  },
  {
    id: "code-review-and-quality",
    label: "Code Review & Quality",
    description: "Rigorous senior-engineer review focused on correctness, security and maintainability.",
    guidance: `Apply the "Code Review & Quality" skill. Review like a meticulous senior staff engineer.

Prioritize findings in this order:
1. Correctness & bugs — logic errors, race conditions, off-by-one, null/undefined handling, error handling, edge cases, incorrect async/await usage.
2. Security — injection, unsanitized input, secrets in code, auth/authorization gaps, unsafe deserialization, SSRF, insecure defaults.
3. Quality & maintainability — separation of concerns, naming, dead code, duplication, complexity, missing types, leaky abstractions, testability.
4. Suggestions — performance, readability and idiomatic improvements.

For every finding: be specific and actionable, cite the exact line/file, explain the concrete risk or impact, and give a fix the author can apply directly. Do not invent issues; if the code is clean, return an empty findings array. Grade strictly: reserve A-range grades for code with no correctness or security issues.`,
  },
  {
    id: "custom",
    label: "Custom skill",
    description: "Paste or upload your own SKILL.md-style review prompt.",
    guidance: "",
  },
];

export const DEFAULT_SKILL = "code-review-and-quality";
export const CUSTOM_SKILL = "custom";

const SKILL_IDS = SKILLS.map((s) => s.id) as [string, ...string[]];

/** Server-side validator: accepts a known skill id, defaults to the standard one. */
export const skillSchema = z
  .enum(SKILL_IDS)
  .optional()
  .default(DEFAULT_SKILL)
  .catch(DEFAULT_SKILL);

/** Server-side validator for a user-supplied custom skill prompt. */
export const customGuidanceSchema = z.string().max(20000).optional();

export function skillGuidance(id: string): string {
  return SKILLS.find((s) => s.id === id)?.guidance ?? "";
}

/**
 * Resolve the guidance text to inject, honoring a user-supplied custom prompt
 * when the "custom" skill is selected.
 */
export function resolveGuidance(id: string, custom?: string): string {
  if (id === CUSTOM_SKILL) return (custom ?? "").trim();
  return skillGuidance(id);
}

export function skillLabel(id: string): string {
  return SKILLS.find((s) => s.id === id)?.label ?? id;
}