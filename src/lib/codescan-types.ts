export type Category = "bugs" | "security" | "quality" | "suggestions";
export type Severity = "critical" | "warning" | "info";

export interface Finding {
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  line: number | null;
  suggestion: string;
}

export interface ReviewResult {
  language: string;
  grade: string;
  summary: string;
  findings: Finding[];
}

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: "bugs", label: "Bugs" },
  { key: "security", label: "Security" },
  { key: "quality", label: "Quality" },
  { key: "suggestions", label: "Suggestions" },
];

export const LANGUAGES = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "C++",
  "Other",
] as const;