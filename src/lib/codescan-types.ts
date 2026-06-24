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
  structure?: RepoStructure;
}

export interface RepoStructure {
  repo: string;
  branch: string;
  totalFiles: number;
  languages: { name: string; count: number }[];
  tree: string[];
  filesReviewed: string[];
  keyFileContents?: string;
}

export interface TestCaseResult {
  name: string;
  passed: boolean;
  error: string | null;
}

export interface TestRunResult {
  runnable: boolean;
  reason: string | null;
  language: string;
  total: number;
  passed: number;
  failed: number;
  tests: TestCaseResult[];
}

export interface GeneratedTests {
  runnable: boolean;
  reason: string | null;
  language: string;
  setup: string;
  tests: { name: string; code: string }[];
}

export type SuiteKey =
  | "edge"
  | "unit"
  | "functional"
  | "api"
  | "ab"
  | "vulnerability"
  | "cicd";

export interface SuiteCase {
  id: string;
  name: string;
  /** How the test exercises the code. */
  description: string;
  /** How endpoints / outputs / behaviour are validated. */
  validation: string;
  /** Whether the case can be executed in the JS/TS sandbox. */
  executable: boolean;
  setup?: string;
  code?: string;
}

export interface SuiteSection {
  key: SuiteKey;
  label: string;
  summary: string;
  cases: SuiteCase[];
}

export interface SuiteEvaluation {
  grade: string;
  verdict: string;
  /** Step-by-step reasoning behind the grade and verdict. */
  reasoning: string;
  recommendations: string[];
}

export interface TestSuite {
  runnable: boolean;
  reason: string | null;
  language: string;
  sections: SuiteSection[];
  evaluation: SuiteEvaluation;
}

/** Per-case execution outcome for executable cases. */
export interface SuiteCaseRun {
  id: string;
  passed: boolean | null; // null = not executed (informational only)
  error: string | null;
}

export interface TestSuiteRun {
  suite: TestSuite;
  runs: Record<string, SuiteCaseRun>;
  executed: number;
  passed: number;
  failed: number;
}

export const SUITE_SECTIONS: { key: SuiteKey; label: string }[] = [
  { key: "edge", label: "Edge cases" },
  { key: "unit", label: "Unit" },
  { key: "functional", label: "Functional" },
  { key: "api", label: "API & endpoints" },
  { key: "ab", label: "A/B testing" },
  { key: "vulnerability", label: "Vulnerability" },
  { key: "cicd", label: "CI/CD pipeline" },
];

export type PipelineStageKey =
  | "lint"
  | "unit"
  | "integration"
  | "build"
  | "deploy";

export type StageStatus = "passed" | "failed" | "skipped";

export interface PipelineStage {
  key: PipelineStageKey;
  label: string;
  status: StageStatus;
  /** Simulated duration in seconds. */
  durationSec: number;
  /** Short summary of what happened in this stage. */
  summary: string;
  /** Console-style log lines for the stage. */
  logs: string[];
  /** Problems detected that affect the stage result. */
  issues: string[];
}

export interface PipelineResult {
  language: string;
  stages: PipelineStage[];
  passed: number;
  failed: number;
  skipped: number;
  /** Final CI grade, e.g. A, B+, F. */
  grade: string;
  /** True only when every non-skipped stage passed. */
  success: boolean;
  verdict: string;
}

export const PIPELINE_STAGES: { key: PipelineStageKey; label: string }[] = [
  { key: "lint", label: "Lint" },
  { key: "unit", label: "Unit tests" },
  { key: "integration", label: "Integration tests" },
  { key: "build", label: "Build" },
  { key: "deploy", label: "Deploy" },
];

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: "bugs", label: "Bugs" },
  { key: "security", label: "Security" },
  { key: "quality", label: "Quality" },
  { key: "suggestions", label: "Suggestions" },
];

export type ArchNodeType =
  | "client"
  | "service"
  | "api"
  | "database"
  | "external"
  | "queue"
  | "storage"
  | "other";

export interface ArchNode {
  id: string;
  label: string;
  type: ArchNodeType;
  /** Index of the layer this node belongs to (0 = top / entry). */
  layer: number;
  description: string;
}

export interface ArchEdge {
  from: string;
  to: string;
  label: string;
}

export interface ArchIssue {
  severity: Severity;
  area: string;
  title: string;
  description: string;
  recommendation: string;
}

export interface ArchitectureResult {
  language: string;
  overview: string;
  layers: string[];
  nodes: ArchNode[];
  edges: ArchEdge[];
  issues: ArchIssue[];
  grade: string;
}

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