import type { ReviewResult } from "./codescan-types";
import { CATEGORIES } from "./codescan-types";

export function buildMarkdownReport(result: ReviewResult): string {
  const lines: string[] = [];
  lines.push(`# CodeScan AI Report`);
  lines.push("");
  lines.push(`**Language:** ${result.language}  `);
  lines.push(`**Grade:** ${result.grade}`);
  lines.push("");
  if (result.structure) {
    const s = result.structure;
    lines.push(`**Repository:** ${s.repo} @ ${s.branch}  `);
    lines.push(`**Files:** ${s.totalFiles}  `);
    lines.push(`**Languages:** ${s.languages.map((l) => `${l.name} (${l.count})`).join(", ")}  `);
    if (s.filesReviewed.length) lines.push(`**Deep-reviewed:** ${s.filesReviewed.join(", ")}`);
    lines.push("");
  }
  lines.push(`> ${result.summary}`);
  lines.push("");

  for (const { key, label } of CATEGORIES) {
    const items = result.findings.filter((f) => f.category === key);
    lines.push(`## ${label} (${items.length})`);
    if (items.length === 0) {
      lines.push("");
      lines.push("_No issues found._");
      lines.push("");
      continue;
    }
    for (const f of items) {
      const loc = f.line != null ? ` (line ${f.line})` : "";
      lines.push("");
      lines.push(`### [${f.severity.toUpperCase()}] ${f.title}${loc}`);
      lines.push(f.description);
      lines.push("");
      lines.push(`**Suggestion:** ${f.suggestion}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}