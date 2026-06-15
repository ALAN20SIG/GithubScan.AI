import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TestSuiteRun, SuiteSection, SuiteKey } from "@/lib/codescan-types";

function buildReport(run: TestSuiteRun): string {
  const { suite } = run;
  const lines: string[] = [];
  lines.push(`CodeScan AI — Test Suite Evaluation`);
  lines.push(`Language:  ${suite.language}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("");
  lines.push(`Overall grade: ${suite.evaluation.grade}`);
  lines.push(`Verdict: ${suite.evaluation.verdict}`);
  if (suite.evaluation.reasoning) {
    lines.push("");
    lines.push(`Reasoning: ${suite.evaluation.reasoning}`);
  }
  lines.push("");
  lines.push(`Executable cases: ${run.executed}  |  Passed: ${run.passed}  |  Failed: ${run.failed}`);
  lines.push("");
  for (const section of suite.sections) {
    lines.push(`== ${section.label} ==`);
    if (section.summary) lines.push(section.summary);
    section.cases.forEach((c, i) => {
      const r = run.runs[c.id];
      const status = !c.executable
        ? "INFO"
        : r?.passed
          ? "PASS"
          : "FAIL";
      lines.push(`  ${i + 1}. [${status}] ${c.name}`);
      if (c.description) lines.push(`       tested: ${c.description}`);
      if (c.validation) lines.push(`       validated: ${c.validation}`);
      if (r && r.passed === false && r.error) lines.push(`       ↳ ${r.error}`);
    });
    lines.push("");
  }
  if (suite.evaluation.recommendations.length) {
    lines.push(`== Recommendations ==`);
    suite.evaluation.recommendations.forEach((rec, i) => lines.push(`  ${i + 1}. ${rec}`));
  }
  return lines.join("\n");
}

function saveResults(run: TestSuiteRun) {
  const blob = new Blob([buildReport(run)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `test-suite-evaluation-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function StatusBadge({
  executable,
  passed,
}: {
  executable: boolean;
  passed: boolean | null;
}) {
  if (!executable)
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cs-info/15 text-[11px] font-bold text-cs-info">
        i
      </span>
    );
  return (
    <span
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
        passed
          ? "bg-cs-success/15 text-cs-success"
          : "bg-cs-critical/15 text-cs-critical"
      }`}
    >
      {passed ? "✓" : "✕"}
    </span>
  );
}

function SectionBlock({ section, run }: { section: SuiteSection; run: TestSuiteRun }) {
  const [open, setOpen] = useState(true);
  const exec = section.cases.filter((c) => c.executable);
  const passed = exec.filter((c) => run.runs[c.id]?.passed).length;
  return (
    <div className="rounded-lg border border-cs-border bg-cs-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-bold text-cs-text">{section.label}</span>
          <span className="rounded-full bg-cs-surface-2 px-2 py-0.5 text-xs font-bold text-cs-muted">
            {section.cases.length}
          </span>
          {exec.length > 0 && (
            <span className="rounded-full bg-cs-success/15 px-2 py-0.5 text-xs font-bold text-cs-success">
              {passed}/{exec.length} run
            </span>
          )}
        </span>
        <span className="font-mono text-xs text-cs-muted">{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-2 px-4 pb-4">
          {section.summary && (
            <p className="text-xs leading-relaxed text-cs-muted">{section.summary}</p>
          )}
          {section.cases.length === 0 ? (
            <p className="text-xs text-cs-muted">No cases for this category.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              {section.cases.map((c) => {
                const r = run.runs[c.id];
                const failed = c.executable && r?.passed === false;
                return (
                  <li
                    key={c.id}
                    className={`rounded-md border bg-cs-bg p-3 ${
                      failed ? "border-cs-critical/40" : "border-cs-border"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <StatusBadge executable={c.executable} passed={r?.passed ?? null} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-relaxed text-cs-text">{c.name}</p>
                        {c.description && (
                          <p className="mt-1 text-xs leading-relaxed text-cs-muted">
                            <span className="font-semibold text-cs-text">How it's tested: </span>
                            {c.description}
                          </p>
                        )}
                        {c.validation && (
                          <p className="mt-1 text-xs leading-relaxed text-cs-muted">
                            <span className="font-semibold text-cs-text">Validation: </span>
                            {c.validation}
                          </p>
                        )}
                        {failed && r?.error && (
                          <p className="mt-1 break-words font-mono text-xs leading-relaxed text-cs-critical/90">
                            {r.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function TestSuitePanel({
  onRun,
  isPending,
  run,
  error,
  canRun,
}: {
  onRun: () => void;
  isPending: boolean;
  run: TestSuiteRun | null;
  error: string | null;
  canRun: boolean;
}) {
  return (
    <div className="border-b border-cs-border bg-cs-bg px-4 py-4 md:px-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-cs-text">Test suite & evaluation</p>
          <p className="text-xs text-cs-muted">
            Edge, unit, functional, API, A/B, vulnerability & CI/CD pipeline tests.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {run && (
            <button
              type="button"
              onClick={() => saveResults(run)}
              className="rounded-md border border-cs-border bg-cs-surface-2 px-3 py-2 text-xs font-bold text-cs-text transition-colors hover:bg-cs-surface"
            >
              Save results
            </button>
          )}
          <button
            type="button"
            onClick={onRun}
            disabled={isPending || !canRun}
            className="rounded-md bg-cs-info px-3 py-2 text-xs font-bold text-cs-bg transition-colors hover:bg-cs-info/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "Building suite…" : run ? "Re-run suite" : "Run test suite"}
          </button>
        </div>
      </div>
      {!canRun && (
        <p className="mt-2 text-xs text-cs-muted">
          Provide code or review a repo first to generate the test suite.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-cs-critical">{error}</p>}
      <AnimatePresence>
        {run && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
            <div className="rounded-lg border border-cs-info/30 bg-cs-info/5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-cs-info/20 px-2 py-1 font-mono text-xs font-bold text-cs-info">
                  Grade {run.suite.evaluation.grade}
                </span>
                <span className="rounded-md bg-cs-success/15 px-2 py-1 font-mono text-xs font-bold text-cs-success">
                  {run.passed} passed
                </span>
                <span className="rounded-md bg-cs-critical/15 px-2 py-1 font-mono text-xs font-bold text-cs-critical">
                  {run.failed} failed
                </span>
                <span className="rounded-md bg-cs-surface-2 px-2 py-1 font-mono text-xs text-cs-muted">
                  {run.executed} executed
                </span>
              </div>
              {run.suite.evaluation.verdict && (
                <p className="mt-2 text-sm leading-relaxed text-cs-text">
                  {run.suite.evaluation.verdict}
                </p>
              )}
              {run.suite.evaluation.reasoning && (
                <div className="mt-3 rounded-md border border-cs-border bg-cs-bg p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-cs-muted">
                    Reasoning
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-cs-text">
                    {run.suite.evaluation.reasoning}
                  </p>
                </div>
              )}
              {run.suite.evaluation.recommendations.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-cs-muted">
                  {run.suite.evaluation.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              )}
            </div>
            {!run.suite.runnable && run.suite.reason && (
              <p className="text-xs text-cs-muted">{run.suite.reason}</p>
            )}
            <div className="space-y-2">
              {run.suite.sections.map((s) => (
                <SectionBlock key={s.key as SuiteKey} section={s} run={run} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
