import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { modelSchema } from "./models";
import { resolveGuidance, skillSchema, customGuidanceSchema } from "./skills";
import type { ReviewResult } from "./codescan-types";

const ReviewInput = z.object({
  code: z.string().trim().min(1, "Code cannot be empty").max(60000),
  language: z.string().trim().min(1).max(40),
  model: modelSchema,
  skill: skillSchema,
  customGuidance: customGuidanceSchema,
});

const SYSTEM_PROMPT = `You are CodeScan AI, an expert code reviewer.
Analyze the provided source code and respond with ONLY a single JSON object (no markdown fences, no prose) with this exact shape:

{
  "language": "javascript",
  "grade": "B+",
  "summary": "Overall solid code, but has one critical security issue.",
  "findings": [
    {
      "category": "security",
      "severity": "critical",
      "title": "SQL injection vulnerability",
      "description": "User input is passed directly into the query without sanitization.",
      "line": 42,
      "suggestion": "Use parameterized queries or an ORM."
    }
  ]
}

Rules:
- "category" MUST be one of: "bugs", "security", "quality", "suggestions".
- "severity" MUST be one of: "critical", "warning", "info".
- "grade" is a school-style letter grade (A+, A, A-, B+, B, ..., F).
- "line" is the relevant 1-based line number, or null if not applicable.
- "summary" is one or two concise sentences.
- Return an empty "findings" array if the code is clean.
- Output valid JSON and nothing else.`;

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model response");
  return JSON.parse(raw.slice(start, end + 1));
}

export const reviewCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ReviewInput.parse(input))
  .handler(async ({ data }): Promise<ReviewResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured (missing LOVABLE_API_KEY).");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const guidance = resolveGuidance(data.skill, data.customGuidance);
    const systemPrompt = guidance ? `${SYSTEM_PROMPT}\n\n${guidance}` : SYSTEM_PROMPT;

    let result;
    try {
      result = await generateText({
        model: gateway(data.model),
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Language: ${data.language}\n\nCode:\n${data.code}`,
          },
        ],
      });
    } catch (err) {
      const status = (err as { statusCode?: number; status?: number })?.statusCode ??
        (err as { status?: number })?.status;
      if (status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
      if (status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error("The AI review failed. Please try again.");
    }

    let parsed: ReviewResult;
    try {
      parsed = extractJson(result.text) as ReviewResult;
    } catch {
      throw new Error("Could not parse the AI response. Please try again.");
    }

    return {
      language: parsed.language ?? data.language,
      grade: parsed.grade ?? "—",
      summary: parsed.summary ?? "",
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
    };
  });