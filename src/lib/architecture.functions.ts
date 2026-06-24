import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { modelSchema } from "./models";
import type {
  ArchEdge,
  ArchIssue,
  ArchNode,
  ArchNodeType,
  ArchitectureResult,
  Severity,
} from "./codescan-types";

const ArchInput = z.object({
  code: z.string().trim().min(1).max(90000),
  language: z.string().trim().min(1).max(40),
  tree: z.string().trim().max(20000).optional(),
  model: modelSchema,
});

const NODE_TYPES: ArchNodeType[] = [
  "client",
  "service",
  "api",
  "database",
  "external",
  "queue",
  "storage",
  "other",
];

const SYSTEM_PROMPT = `You are CodeScan AI's software architecture analyst.
Given source code (and optionally a repository file tree), reconstruct the system
architecture: the main components, how data flows between them, and the potential
issues / failure points that could occur in this design.

Respond with ONLY a single JSON object (no markdown fences, no prose), shaped exactly:

{
  "language": "TypeScript",
  "overview": "2-3 sentences describing the overall architecture and how it works.",
  "layers": ["Client", "API", "Services", "Data"],
  "nodes": [
    { "id": "web", "label": "Web App", "type": "client", "layer": 0, "description": "React SPA" },
    { "id": "api", "label": "REST API", "type": "api", "layer": 1, "description": "Express server" },
    { "id": "db", "label": "PostgreSQL", "type": "database", "layer": 3, "description": "Primary store" }
  ],
  "edges": [
    { "from": "web", "to": "api", "label": "HTTPS / JSON" },
    { "from": "api", "to": "db", "label": "SQL" }
  ],
  "issues": [
    {
      "severity": "critical",
      "area": "Data layer",
      "title": "No connection pooling",
      "description": "Each request opens a new DB connection, exhausting the pool under load.",
      "recommendation": "Introduce a pooled client and reuse connections."
    }
  ],
  "grade": "B"
}

Rules:
- "type" MUST be one of: client, service, api, database, external, queue, storage, other.
- "layer" is a 0-based integer matching the index in "layers" (0 = entry/top).
- Every edge "from"/"to" MUST reference an existing node "id".
- "issues" describes potential problems that could occur: scalability, coupling,
  single points of failure, security, data consistency, error handling, deployment.
- "severity" MUST be one of: critical, warning, info.
- "grade" is a school-style letter grade for the architecture (A+ ... F).
- Provide 3-10 nodes and the most important edges. Keep it accurate to the code.
- Output valid JSON and nothing else.`;

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model response");
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeType(t: unknown): ArchNodeType {
  return NODE_TYPES.includes(t as ArchNodeType) ? (t as ArchNodeType) : "other";
}

function normalizeSeverity(s: unknown): Severity {
  return s === "critical" || s === "warning" ? s : "info";
}

export const analyzeArchitecture = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ArchInput.parse(input))
  .handler(async ({ data }): Promise<ArchitectureResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured (missing LOVABLE_API_KEY).");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const userContent = `Language: ${data.language}
${data.tree ? `\nFILE TREE:\n${data.tree}\n` : ""}
CODE:
${data.code}`;

    let result;
    try {
      result = await generateText({
        model: gateway(data.model),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      });
    } catch (err) {
      const status =
        (err as { statusCode?: number; status?: number })?.statusCode ??
        (err as { status?: number })?.status;
      if (status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
      if (status === 402)
        throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error("Architecture analysis failed. Please try again.");
    }

    let parsed: {
      language?: string;
      overview?: string;
      layers?: string[];
      nodes?: { id?: string; label?: string; type?: string; layer?: number; description?: string }[];
      edges?: { from?: string; to?: string; label?: string }[];
      issues?: {
        severity?: string;
        area?: string;
        title?: string;
        description?: string;
        recommendation?: string;
      }[];
      grade?: string;
    };
    try {
      parsed = extractJson(result.text) as typeof parsed;
    } catch {
      throw new Error("Could not parse the AI response. Please try again.");
    }

    const layers = Array.isArray(parsed.layers)
      ? parsed.layers.filter((l) => typeof l === "string")
      : [];

    const nodes: ArchNode[] = (Array.isArray(parsed.nodes) ? parsed.nodes : [])
      .filter((n) => typeof n?.id === "string" && n.id.trim().length > 0)
      .map((n) => ({
        id: n.id!.trim(),
        label: n.label?.trim() || n.id!.trim(),
        type: normalizeType(n.type),
        layer:
          typeof n.layer === "number" && n.layer >= 0
            ? Math.min(Math.floor(n.layer), Math.max(layers.length - 1, 0))
            : 0,
        description: n.description?.trim() || "",
      }));

    const ids = new Set(nodes.map((n) => n.id));
    const edges: ArchEdge[] = (Array.isArray(parsed.edges) ? parsed.edges : [])
      .filter(
        (e) =>
          typeof e?.from === "string" &&
          typeof e?.to === "string" &&
          ids.has(e.from) &&
          ids.has(e.to),
      )
      .map((e) => ({ from: e.from!, to: e.to!, label: e.label?.trim() || "" }));

    const issues: ArchIssue[] = (Array.isArray(parsed.issues) ? parsed.issues : [])
      .filter((i) => typeof i?.title === "string" && i.title.trim().length > 0)
      .map((i) => ({
        severity: normalizeSeverity(i.severity),
        area: i.area?.trim() || "General",
        title: i.title!.trim(),
        description: i.description?.trim() || "",
        recommendation: i.recommendation?.trim() || "",
      }));

    return {
      language: parsed.language ?? data.language,
      overview: parsed.overview?.trim() || "",
      layers: layers.length > 0 ? layers : ["System"],
      nodes,
      edges,
      issues,
      grade: parsed.grade ?? "—",
    };
  });