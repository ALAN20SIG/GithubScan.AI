import { motion, AnimatePresence } from "framer-motion";
import type { TestRunResult } from "@/lib/codescan-types";

export function TestPanel({
  onRun,
  isPending,
  result,
  error,
  canRun,
}: {
  onRun: () => void;
  isPending: boolean;
  result: TestRunResult | null;
  error: string | null;
  canRun: boolean;
}) {
  return (
    <div className="border-b border-cs-border bg-cs-surface px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-cs-text">Edge-case tests</p>
        <button
          type="button"
          onClick={onRun}
          disabled={isPending || !canRun}
          className="shrink-0 rounded-md bg-cs-info px-2.5 py-1.5 text-[11px] font-bold text-cs-bg transition-colors hover:bg-cs-info/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Running…" : result ? "Re-run tests" : "Run tests"}
        </button>
      </div>
      {!canRun && (
        <p className="mt-1.5 text-[10px] text-cs-muted">
          Edge-case tests run on JavaScript/TypeScript code only.
        </p>
      )}
      {error && <p className="mt-1.5 text-[11px] text-cs-critical">{error}</p>}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2"
          >
            {!result.runnable ? (
              <p className="text-[11px] text-cs-muted">{result.reason}</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-cs-success/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cs-success">
                    {result.passed} passed
                  </span>
                  <span className="rounded-md bg-cs-critical/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cs-critical">
                    {result.failed} failed
                  </span>
                  <span className="rounded-md bg-cs-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-cs-muted">
                    {result.total} total
                  </span>
                </div>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {result.tests.map((t, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-cs-border bg-cs-bg p-2"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 shrink-0 font-mono text-[11px] font-bold ${
                            t.passed ? "text-cs-success" : "text-cs-critical"
                          }`}
                        >
                          {t.passed ? "PASS" : "FAIL"}
                        </span>
                        <span className="min-w-0 text-[11px] leading-relaxed text-cs-text">
                          {t.name}
                        </span>
                      </div>
                      {!t.passed && t.error && (
                        <p className="mt-1 break-words font-mono text-[10px] leading-relaxed text-cs-critical/90">
                          {t.error}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}