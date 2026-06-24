import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { modelSchema } from "./models";
import type { GeneratedTests } from "./codescan-types";

const TestInput = z.object({
  code: z.string().trim().min(1).max(80000),
  language: z.string().trim().min(1).max(40),
  model: modelSchema,
});

const MAX_TESTS = 14;

const SYSTEM_PROMPT = `You are CodeScan AI's edge-case test generator.
You are given source code (JavaScript or TypeScript). Generate edge-case tests that
exercise boundary conditions, empty/null inputs, large values, and tricky paths.

Respond with ONLY a single JSON object (no markdown fences, no prose) shaped exactly:

{
  "runnable": true,
  "language": "JavaScript",
  "reason": null,
  "setup": "runnable plain JavaScript that DEFINES the code under test in the current scope",
  "tests": [
    { "name": "returns 0 for empty array", "code": "const r = sum([]); if (r !== 0) throw new Error('expected 0, got ' + r);" }
  ]
}

Rules:
- Target ONLY JavaScript/TypeScript. If the code is another language or cannot be
  executed in a plain JS sandbox, set "runnable": false, give a short "reason", and
  return an empty "tests" array.
- "setup" MUST be plain runnable JavaScript: strip all TypeScript types, remove
  import/export/require statements, and inline any trivial dependencies or simple mocks
  so the functions/classes under test are callable. No DOM, no network, no filesystem.
- Each test "code" runs in a fresh scope that ALSO includes "setup" prepended, so all
  setup symbols are in scope. The test must THROW an Error when it fails and return
  normally when it passes. Tests may use "await".
- Write up to ${MAX_TESTS} focused tests. Prefer pure, deterministic assertions.
- Output valid JSON and nothing else.`;

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model response");
  return JSON.parse(raw.slice(start, end + 1));
}

export const generateEdgeCaseTests = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TestInput.parse(input))
  .handler(async ({ data }): Promise<GeneratedTests> => {
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
      if (status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error("Test generation failed. Please try again.");
    }

    let parsed: {
      runnable?: boolean;
      language?: string;
      reason?: string | null;
      setup?: string;
      tests?: { name?: string; code?: string }[];
    };
    try {
      parsed = extractJson(result.text) as typeof parsed;
    } catch {
      throw new Error("Could not parse the AI response. Please try again.");
    }

    const language = parsed.language ?? data.language;

    if (parsed.runnable === false) {
      return {
        runnable: false,
        reason: parsed.reason ?? "This code can't be executed in the JS/TS test sandbox.",
        language,
        setup: "",
        tests: [],
      };
    }

    const setup = typeof parsed.setup === "string" ? parsed.setup : "";
    const rawTests = Array.isArray(parsed.tests) ? parsed.tests.slice(0, MAX_TESTS) : [];
    const valid = rawTests.filter(
      (t): t is { name: string; code: string } =>
        typeof t?.code === "string" && t.code.trim().length > 0,
    );

    if (valid.length === 0) {
      return {
        runnable: false,
        reason: parsed.reason ?? "No runnable test cases could be generated for this code.",
        language,
        setup: "",
        tests: [],
      };
    }

    return {
      runnable: true,
      reason: null,
      language,
      setup,
      tests: valid.map((t) => ({ name: t.name || "unnamed test", code: t.code })),
    };
  });