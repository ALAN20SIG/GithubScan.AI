import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { modelSchema } from "./models";
import type {
  PipelineResult,
  PipelineStage,
  PipelineStageKey,
  StageStatus,
} from "./codescan-types";

const PipelineInput = z.object({
  code: z.string().trim().min(1).max(80000),
  language: z.string().trim().min(1).max(40),
  model: modelSchema,
});

const STAGE_ORDER: PipelineStageKey[] = [
  "lint",
  "unit",
  "integration",
  "build",
  "deploy",
];

const STAGE_LABELS: Record<PipelineStageKey, string> = {
  lint: "Lint",
  unit: "Unit tests",
  integration: "Integration tests",
  build: "Build",
  deploy: "Deploy",
};

const SYSTEM_PROMPT = `You are CodeScan AI's CI/CD pipeline simulator.
Given source code, simulate running a realistic CI/CD pipeline with these ordered stages:
lint, unit, integration, build, deploy.

Simulate outcomes by statically analyzing the code: infer likely lint problems,
test failures, integration risks, build/compile errors, and deploy readiness.
A failed earlier stage typically causes later stages to be "skipped" (fail-fast).

Respond with ONLY a single JSON object (no markdown fences, no prose), shaped exactly:

{
  "language": "JavaScript",
  "stages": [
    {
      "key": "lint",
      "status": "passed",
      "durationSec": 3.2,
      "summary": "one concise sentence on what happened",
      "logs": ["$ eslint .", "✓ 0 problems"],
      "issues": ["any problems that affected the result"]
    }
  ],
  "grade": "B+",
  "verdict": "1-2 sentence overall CI assessment"
}

Rules:
- "status" MUST be one of: "passed", "failed", "skipped".
- Apply fail-fast: once a stage fails, downstream stages should usually be "skipped".
- Provide all five stages in order: lint, unit, integration, build, deploy.
- "logs" are short shell-style lines (2-6 per stage). "issues" is empty when none.
- "durationSec" is a realistic positive number.
- "grade" is a school-style letter grade reflecting overall pipeline health.
- Output valid JSON and nothing else.`;

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model response");
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeStatus(s: unknown): StageStatus {
  return s === "failed" || s === "skipped" ? s : "passed";
}

export const runPipeline = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PipelineInput.parse(input))
  .handler(async ({ data }): Promise<PipelineResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured (missing LOVABLE_API_KEY).");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    let result;
    try {
      result = await generateText({
        model: gateway(data.model),
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
      throw new Error("Pipeline simulation failed. Please try again.");
    }

    let parsed: {
      language?: string;
      stages?: {
        key?: string;
        status?: string;
        durationSec?: number;
        summary?: string;
        logs?: string[];
        issues?: string[];
      }[];
      grade?: string;
      verdict?: string;
    };
    try {
      parsed = extractJson(result.text) as typeof parsed;
    } catch {
      throw new Error("Could not parse the AI response. Please try again.");
    }

    const byKey = new Map<PipelineStageKey, NonNullable<typeof parsed.stages>[number]>();
    for (const s of parsed.stages ?? []) {
      if (s.key && STAGE_ORDER.includes(s.key as PipelineStageKey)) {
        byKey.set(s.key as PipelineStageKey, s);
      }
    }

    const stages: PipelineStage[] = STAGE_ORDER.map((sk) => {
      const raw = byKey.get(sk);
      return {
        key: sk,
        label: STAGE_LABELS[sk],
        status: normalizeStatus(raw?.status),
        durationSec:
          typeof raw?.durationSec === "number" && raw.durationSec >= 0
            ? Math.round(raw.durationSec * 10) / 10
            : 0,
        summary: raw?.summary?.trim() || "",
        logs: Array.isArray(raw?.logs)
          ? raw!.logs.filter((l) => typeof l === "string").slice(0, 12)
          : [],
        issues: Array.isArray(raw?.issues)
          ? raw!.issues.filter((i) => typeof i === "string").slice(0, 12)
          : [],
      };
    });

    const passed = stages.filter((s) => s.status === "passed").length;
    const failed = stages.filter((s) => s.status === "failed").length;
    const skipped = stages.filter((s) => s.status === "skipped").length;

    return {
      language: parsed.language ?? data.language,
      stages,
      passed,
      failed,
      skipped,
      grade: parsed.grade ?? "—",
      success: failed === 0 && skipped === 0,
      verdict: parsed.verdict?.trim() || "",
    };
  });
