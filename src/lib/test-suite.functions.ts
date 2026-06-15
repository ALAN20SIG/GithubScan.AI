import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import type { TestSuite, SuiteKey, SuiteSection, SuiteCase } from "./codescan-types";

const SuiteInput = z.object({
  code: z.string().trim().min(1).max(80000),
  language: z.string().trim().min(1).max(40),
});

const MAX_CASES_PER_SECTION = 6;

const SYSTEM_PROMPT = `You are CodeScan AI's full test-suite generator.
Given source code, design a comprehensive test plan across SEVEN categories:
edge, unit, functional, api, ab, vulnerability, cicd.

Respond with ONLY a single JSON object (no markdown fences, no prose), shaped exactly:

{
  "runnable": true,
  "language": "JavaScript",
  "reason": null,
  "sections": [
    {
      "key": "edge",
      "summary": "one sentence describing what this category covers for this code",
      "cases": [
        {
          "name": "short test case name",
          "description": "how the test exercises the code",
          "validation": "how the result / endpoint / behaviour is validated (assertions, status codes, schema, metrics)",
          "executable": true,
          "setup": "plain runnable JS defining the code under test (only when executable)",
          "code": "JS that throws on failure, returns on pass (only when executable)"
        }
      ]
    }
  ],
  "evaluation": {
    "grade": "B+",
    "verdict": "1-2 sentence overall assessment of test coverage and code testability",
    "reasoning": "3-5 sentences explaining HOW you reached this grade: coverage across categories, executable vs informational balance, risks found, testability of the code, and what most influenced the grade",
    "recommendations": ["actionable improvement", "..."]
  }
}

Category meaning:
- edge: boundary conditions, empty/null, large values, tricky paths.
- unit: isolated function/class behaviour with deterministic assertions.
- functional: end-to-end behaviour of a feature/flow.
- api: endpoint contract, request/response validation, status codes, schema, auth.
- ab: A/B experiment design — variants, metrics, sample size, success criteria.
- vulnerability: security tests (injection, XSS, authz, secrets, unsafe deserialization).
- cicd: pipeline checks (build, lint, typecheck, test stage, deploy gates) the project should run.

Rules:
- Provide up to ${MAX_CASES_PER_SECTION} cases per section. Always include all 7 sections (use an empty cases array only if truly not applicable).
- "executable" is true ONLY for JavaScript/TypeScript cases that run in a plain JS sandbox with no DOM/network/filesystem. For those, provide "setup" (plain JS, no imports/exports/types) and "code" (throws on failure). Each case's "code" runs with its "setup" prepended in a fresh scope.
- For api, ab, vulnerability, cicd cases that cannot run in a JS sandbox, set "executable": false and OMIT setup/code, but still fill description + validation thoroughly.
- If the code is not JavaScript/TypeScript, still produce the full plan with informational (non-executable) cases and set top-level "runnable": false with a short "reason".
- Output valid JSON and nothing else.`;

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model response");
  return JSON.parse(raw.slice(start, end + 1));
}

const SECTION_LABELS: Record<SuiteKey, string> = {
  edge: "Edge cases",
  unit: "Unit",
  functional: "Functional",
  api: "API & endpoints",
  ab: "A/B testing",
  vulnerability: "Vulnerability",
  cicd: "CI/CD pipeline",
};

const SECTION_ORDER: SuiteKey[] = [
  "edge",
  "unit",
  "functional",
  "api",
  "ab",
  "vulnerability",
  "cicd",
];

export const generateTestSuite = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SuiteInput.parse(input))
  .handler(async ({ data }): Promise<TestSuite> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured (missing LOVABLE_API_KEY).");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    let result;
    try {
      result = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Language: ${data.language}\n\nCode:\n${data.code}` },
        ],
      });
    } catch (err) {
      const status =
        (err as { statusCode?: number; status?: number })?.statusCode ??
        (err as { status?: number })?.status;
      if (status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
      if (status === 402)
        throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error("Test-suite generation failed. Please try again.");
    }

    let parsed: {
      runnable?: boolean;
      language?: string;
      reason?: string | null;
      sections?: {
        key?: string;
        summary?: string;
        cases?: {
          name?: string;
          description?: string;
          validation?: string;
          executable?: boolean;
          setup?: string;
          code?: string;
        }[];
      }[];
      evaluation?: {
        grade?: string;
        verdict?: string;
        reasoning?: string;
        recommendations?: string[];
      };
    };
    try {
      parsed = extractJson(result.text) as typeof parsed;
    } catch {
      throw new Error("Could not parse the AI response. Please try again.");
    }

    type RawSection = NonNullable<typeof parsed.sections>[number];
    const language = parsed.language ?? data.language;
    const byKey = new Map<SuiteKey, RawSection>();
    for (const s of parsed.sections ?? []) {
      if (s.key && SECTION_ORDER.includes(s.key as SuiteKey)) {
        byKey.set(s.key as SuiteKey, s);
      }
    }

    const sections: SuiteSection[] = SECTION_ORDER.map((sk) => {
      const raw = byKey.get(sk);
      const rawCases = Array.isArray(raw?.cases)
        ? raw!.cases.slice(0, MAX_CASES_PER_SECTION)
        : [];
      const cases: SuiteCase[] = rawCases.map((c, i: number) => {
        const executable =
          c.executable === true &&
          typeof c.code === "string" &&
          c.code.trim().length > 0;
        return {
          id: `${sk}-${i}`,
          name: c.name?.trim() || "Unnamed test",
          description: c.description?.trim() || "",
          validation: c.validation?.trim() || "",
          executable,
          setup: executable ? (typeof c.setup === "string" ? c.setup : "") : undefined,
          code: executable ? c.code : undefined,
        };
      });
      return {
        key: sk,
        label: SECTION_LABELS[sk],
        summary: raw?.summary?.trim() || "",
        cases,
      };
    });

    return {
      runnable: parsed.runnable !== false,
      reason: parsed.reason ?? null,
      language,
      sections,
      evaluation: {
        grade: parsed.evaluation?.grade ?? "—",
        verdict: parsed.evaluation?.verdict ?? "",
        reasoning: parsed.evaluation?.reasoning?.trim() ?? "",
        recommendations: Array.isArray(parsed.evaluation?.recommendations)
          ? parsed.evaluation!.recommendations.filter((r) => typeof r === "string")
          : [],
      },
    };
  });
