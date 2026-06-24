import { motion, AnimatePresence } from "framer-motion";
import type { ArchNodeType, ArchitectureResult, Severity } from "@/lib/codescan-types";

const TYPE_ICON: Record<ArchNodeType, string> = {
  client: "🖥",
  service: "⚙",
  api: "🔌",
  database: "🗄",
  external: "🌐",
  queue: "📨",
  storage: "📦",
  other: "◻",
};

function sevStyle(s: Severity): string {
  if (s === "critical") return "border-cs-critical/40 bg-cs-critical/5";
  if (s === "warning") return "border-cs-warning/40 bg-cs-warning/5";
  return "border-cs-info/30 bg-cs-info/5";
}

function sevBadge(s: Severity): string {
  if (s === "critical") return "bg-cs-critical/20 text-cs-critical";
  if (s === "warning") return "bg-cs-warning/20 text-cs-warning";
  return "bg-cs-info/20 text-cs-info";
}

export function ArchitecturePanel({
  onRun,
  isPending,
  result,
  error,
  canRun,
}: {
  onRun: () => void;
  isPending: boolean;
  result: ArchitectureResult | null;
  error: string | null;
  canRun: boolean;
}) {
  const labelOf = (id: string) => result?.nodes.find((n) => n.id === id)?.label ?? id;

  return (
    <div className="border-b border-cs-border bg-cs-surface px-4 py-4 md:px-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-cs-text">Architecture & risks</p>
          <p className="text-xs text-cs-muted">
            Reconstructs components, data flow and potential issues.
          </p>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={isPending || !canRun}
          className="shrink-0 rounded-md bg-cs-info px-3 py-2 text-xs font-bold text-cs-bg transition-colors hover:bg-cs-info/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Analyzing…" : result ? "Re-analyze" : "Map architecture"}
        </button>
      </div>
      {!canRun && (
        <p className="mt-2 text-xs text-cs-muted">
          Provide code or review a repo first to map the architecture.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-cs-critical">{error}</p>}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 space-y-5"
          >
            {result.overview && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-cs-info/20 px-2 py-1 font-mono text-xs font-bold text-cs-info">
                  Arch grade {result.grade}
                </span>
                <p className="w-full text-sm leading-relaxed text-cs-text">{result.overview}</p>
              </div>
            )}

            {/* Diagram: layers of nodes, with arrows between layers */}
            {result.nodes.length > 0 && (
              <div className="rounded-lg border border-cs-border bg-cs-bg p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-cs-muted">
                  System diagram
                </p>
                <div className="space-y-1">
                  {result.layers.map((layer, li) => {
                    const nodes = result.nodes.filter((n) => n.layer === li);
                    if (nodes.length === 0) return null;
                    return (
                      <div key={li}>
                        <div className="flex flex-wrap items-stretch gap-2">
                          <span className="grid w-20 shrink-0 place-items-center rounded-md bg-cs-surface-2 px-2 py-1 text-center text-[10px] font-bold uppercase text-cs-muted">
                            {layer}
                          </span>
                          {nodes.map((n) => (
                            <div
                              key={n.id}
                              title={n.description}
                              className="min-w-[120px] flex-1 rounded-md border border-cs-info/30 bg-cs-info/5 p-2"
                            >
                              <p className="flex items-center gap-1.5 text-sm font-bold text-cs-text">
                                <span aria-hidden>{TYPE_ICON[n.type]}</span>
                                {n.label}
                              </p>
                              {n.description && (
                                <p className="mt-0.5 line-clamp-2 text-[11px] text-cs-muted">
                                  {n.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                        {li < result.layers.length - 1 && (
                          <div className="py-1 text-center text-cs-muted">↓</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Data flow edges */}
            {result.edges.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-cs-muted">
                  Data flow
                </p>
                <ul className="space-y-1">
                  {result.edges.map((e, i) => (
                    <li
                      key={i}
                      className="flex flex-wrap items-center gap-1.5 rounded-md border border-cs-border bg-cs-bg px-3 py-1.5 text-xs"
                    >
                      <span className="font-bold text-cs-text">{labelOf(e.from)}</span>
                      <span className="text-cs-info">→</span>
                      <span className="font-bold text-cs-text">{labelOf(e.to)}</span>
                      {e.label && <span className="font-mono text-cs-muted">· {e.label}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Potential issues */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-cs-muted">
                Potential issues ({result.issues.length})
              </p>
              {result.issues.length === 0 ? (
                <p className="text-xs text-cs-muted">No notable architectural risks detected.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                  {result.issues.map((iss, i) => (
                    <div key={i} className={`rounded-md border p-3 ${sevStyle(iss.severity)}`}>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${sevBadge(iss.severity)}`}
                        >
                          {iss.severity}
                        </span>
                        <span className="rounded-full bg-cs-surface-2 px-2 py-0.5 text-[10px] font-bold text-cs-muted">
                          {iss.area}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-bold text-cs-text">{iss.title}</p>
                      {iss.description && (
                        <p className="mt-1 text-xs leading-relaxed text-cs-muted">
                          {iss.description}
                        </p>
                      )}
                      {iss.recommendation && (
                        <p className="mt-2 text-xs leading-relaxed text-cs-text">
                          <span className="font-bold text-cs-info">Fix: </span>
                          {iss.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}