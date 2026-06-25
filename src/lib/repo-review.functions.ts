import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { modelSchema } from "./models";
import { resolveGuidance, skillSchema, customGuidanceSchema } from "./skills";
import type { ReviewResult, RepoStructure } from "./codescan-types";

const RepoInput = z.object({
  url: z.string().trim().min(1).max(2048),
  branch: z.string().trim().max(120).optional(),
  model: modelSchema,
  skill: skillSchema,
  customGuidance: customGuidanceSchema,
});

const EXT_TO_LANG: Record<string, string> = {
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  py: "Python",
  go: "Go",
  rs: "Rust",
  java: "Java",
  cpp: "C++",
  cc: "C++",
  cxx: "C++",
  c: "C",
  h: "C",
  hpp: "C++",
  rb: "Ruby",
  php: "PHP",
  cs: "C#",
  swift: "Swift",
  kt: "Kotlin",
};

const SOURCE_EXT = new Set(Object.keys(EXT_TO_LANG));
const PRIORITY = ["index", "main", "app", "server", "router", "route", "api", "config"];

const MAX_TREE = 400;
const MAX_KEY_FILES = 6;
const MAX_TOTAL_BYTES = 55_000;
const MAX_FILE_BYTES = 25_000;

const SYSTEM_PROMPT = `You are CodeScan AI, an expert code reviewer analyzing a GitHub repository.
You are given the repository's file tree plus the contents of a few KEY source files.
Respond with ONLY a single JSON object (no markdown fences, no prose) with this exact shape:

{
  "language": "TypeScript",
  "grade": "B+",
  "summary": "Two or three sentences on overall architecture, structure quality and key risks.",
  "findings": [
    {
      "category": "security",
      "severity": "critical",
      "title": "SQL injection in db helper",
      "description": "User input is concatenated into a query in src/db.ts.",
      "line": 42,
      "suggestion": "Use parameterized queries."
    }
  ]
}

Rules:
- "category" MUST be one of: "bugs", "security", "quality", "suggestions".
- "severity" MUST be one of: "critical", "warning", "info".
- Evaluate architecture and structure (folder layout, separation of concerns) under "quality".
- Reference file paths in titles/descriptions where helpful.
- "grade" is a school-style letter grade (A+, A, A-, B+, ..., F).
- "line" is a 1-based line number within the referenced file, or null.
- Return an empty "findings" array if nothing notable.
- Output valid JSON and nothing else.`;

function parseRepoUrl(input: string): { owner: string; repo: string; branch?: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }
  if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") return null;
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  // owner/repo/tree/<branch>/...
  let branch: string | undefined;
  if (parts[2] === "tree" && parts[3]) branch = parts[3];
  return { owner, repo, branch };
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model response");
  return JSON.parse(raw.slice(start, end + 1));
}

function langOf(path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return SOURCE_EXT.has(ext) ? EXT_TO_LANG[ext] : null;
}

function scoreFile(path: string, size: number): number {
  const name = path.split("/").pop()?.toLowerCase() ?? "";
  const base = name.replace(/\.[^.]+$/, "");
  let score = 0;
  if (PRIORITY.some((p) => base === p || base.startsWith(p))) score += 100;
  // Prefer shallow files and reasonably sized files.
  score -= path.split("/").length * 3;
  if (size > 200 && size < 12_000) score += 20;
  if (size >= MAX_FILE_BYTES) score -= 50;
  return score;
}

export const reviewRepo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RepoInput.parse(input))
  .handler(async ({ data }): Promise<ReviewResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured (missing LOVABLE_API_KEY).");

    const parsedUrl = parseRepoUrl(data.url);
    if (!parsedUrl) {
      throw new Error("Enter a valid public GitHub repo URL (e.g. https://github.com/owner/repo).");
    }
    const { owner, repo } = parsedUrl;
    const ghHeaders = { "User-Agent": "CodeScan-AI", Accept: "application/vnd.github+json" };

    // Resolve branch.
    let branch = (data.branch || parsedUrl.branch || "").trim();
    if (!branch) {
      try {
        const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: ghHeaders });
        if (metaRes.status === 404) throw new Error("Repository not found. Make sure it is public.");
        if (metaRes.status === 403) throw new Error("GitHub rate limit reached. Please try again later.");
        if (!metaRes.ok) throw new Error(`GitHub returned an error (${metaRes.status}).`);
        const meta = (await metaRes.json()) as { default_branch?: string };
        branch = meta.default_branch || "main";
      } catch (e) {
        if (e instanceof Error) throw e;
        throw new Error("Could not reach GitHub. Please try again.");
      }
    }

    // Fetch full tree.
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      { headers: ghHeaders },
    );
    if (treeRes.status === 404) throw new Error(`Branch "${branch}" or repo not found.`);
    if (treeRes.status === 403) throw new Error("GitHub rate limit reached. Please try again later.");
    if (!treeRes.ok) throw new Error(`GitHub returned an error (${treeRes.status}).`);

    const treeJson = (await treeRes.json()) as {
      truncated?: boolean;
      tree?: { path: string; type: string; size?: number }[];
    };
    const blobs = (treeJson.tree ?? []).filter((n) => n.type === "blob");
    if (blobs.length === 0) throw new Error("No files found in this repo/branch.");

    // Language counts over source files.
    const langCounts = new Map<string, number>();
    const sourceBlobs: { path: string; size: number }[] = [];
    for (const b of blobs) {
      const lang = langOf(b.path);
      if (!lang) continue;
      langCounts.set(lang, (langCounts.get(lang) ?? 0) + 1);
      sourceBlobs.push({ path: b.path, size: b.size ?? 0 });
    }
    const languages = [...langCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    if (sourceBlobs.length === 0) throw new Error("No recognized source files to review in this repo.");

    // Pick key files.
    const ranked = [...sourceBlobs].sort((a, b) => scoreFile(b.path, b.size) - scoreFile(a.path, a.size));
    const picked: { path: string; size: number }[] = [];
    let total = 0;
    for (const f of ranked) {
      if (picked.length >= MAX_KEY_FILES) break;
      const cap = Math.min(f.size || MAX_FILE_BYTES, MAX_FILE_BYTES);
      if (total + cap > MAX_TOTAL_BYTES) continue;
      picked.push(f);
      total += cap;
    }

    // Fetch picked file contents.
    const fileBlocks: string[] = [];
    const filesReviewed: string[] = [];
    for (const f of picked) {
      try {
        const rawRes = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${f.path
            .split("/")
            .map(encodeURIComponent)
            .join("/")}`,
          { headers: { "User-Agent": "CodeScan-AI" } },
        );
        if (!rawRes.ok) continue;
        let content = await rawRes.text();
        if (content.length > MAX_FILE_BYTES) content = content.slice(0, MAX_FILE_BYTES) + "\n/* …truncated… */";
        if (!content.trim()) continue;
        filesReviewed.push(f.path);
        fileBlocks.push(`--- FILE: ${f.path} ---\n${content}`);
      } catch {
        /* skip unreachable file */
      }
    }

    const tree = blobs.slice(0, MAX_TREE).map((b) => b.path);
    const treeNote =
      treeJson.truncated || blobs.length > MAX_TREE
        ? `\n(…${blobs.length - tree.length} more files not listed…)`
        : "";

    const structure: RepoStructure = {
      repo: `${owner}/${repo}`,
      branch,
      totalFiles: blobs.length,
      languages,
      tree,
      filesReviewed,
      keyFileContents: fileBlocks.join("\n\n").slice(0, 80000),
    };

    const userContent = `Repository: ${owner}/${repo} (branch: ${branch})
Total files: ${blobs.length}
Languages: ${languages.map((l) => `${l.name} (${l.count})`).join(", ") || "n/a"}

FILE TREE:
${tree.join("\n")}${treeNote}

KEY FILE CONTENTS:
${fileBlocks.join("\n\n") || "(none could be fetched)"}`;

    let result;
    try {
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(key);
      const guidance = resolveGuidance(data.skill, data.customGuidance);
      const systemPrompt = guidance ? `${SYSTEM_PROMPT}\n\n${guidance}` : SYSTEM_PROMPT;
      result = await generateText({
        model: gateway(data.model),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
    } catch (err) {
      const status =
        (err as { statusCode?: number; status?: number })?.statusCode ??
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
      language: parsed.language ?? languages[0]?.name ?? "Repo",
      grade: parsed.grade ?? "—",
      summary: parsed.summary ?? "",
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      structure,
    };
  });