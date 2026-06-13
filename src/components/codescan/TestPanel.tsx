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
    <div className="border-b border-cs-border bg-cs-surface px-4 py-3 md:px-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-cs-text">Edge-case tests</p>
        <button
          type="button"
          onClick={onRun}
          disabled={isPending || !canRun}
          className="shrink-0 rounded-md bg-cs-info px-3 py-2 text-xs font-bold text-cs-bg transition-colors hover:bg-cs-info/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Running…" : result ? "Re-run tests" : "Run tests"}
        </button>
      </div>
      {!canRun && (
        <p className="mt-2 text-xs text-cs-muted">
          Edge-case tests run on JavaScript/TypeScript code only.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-cs-critical">{error}</p>}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3"
          >
            {!result.runnable ? (
              <p className="text-xs text-cs-muted">{result.reason}</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-cs-success/15 px-2 py-1 font-mono text-xs font-bold text-cs-success">
                    {result.passed} passed
                  </span>
                  <span className="rounded-md bg-cs-critical/15 px-2 py-1 font-mono text-xs font-bold text-cs-critical">
                    {result.failed} failed
                  </span>
                  <span className="rounded-md bg-cs-surface-2 px-2 py-1 font-mono text-xs text-cs-muted">
                    {result.total} total
                  </span>
                </div>
                <ul className="mt-3 grid grid-cols-1 gap-2 xl:grid-cols-2">
                  {result.tests.map((t, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-cs-border bg-cs-bg p-3"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 shrink-0 font-mono text-xs font-bold ${
                            t.passed ? "text-cs-success" : "text-cs-critical"
                          }`}
                        >
                          {t.passed ? "PASS" : "FAIL"}
                        </span>
                        <span className="min-w-0 text-xs leading-relaxed text-cs-text">
                          {t.name}
                        </span>
                      </div>
                      {!t.passed && t.error && (
                        <p className="mt-1 break-words font-mono text-xs leading-relaxed text-cs-critical/90">
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