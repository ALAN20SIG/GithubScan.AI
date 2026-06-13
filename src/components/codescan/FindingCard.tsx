import { motion } from "framer-motion";
import type { Finding, Severity } from "@/lib/codescan-types";

function severityStyle(sev: Severity): string {
  if (sev === "critical") return "bg-cs-critical/15 text-cs-critical border-cs-critical/30";
  if (sev === "warning") return "bg-cs-warning/15 text-cs-warning border-cs-warning/30";
  return "bg-cs-info/15 text-cs-info border-cs-info/30";
}

export function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="rounded-lg border border-cs-border bg-cs-surface p-3"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${severityStyle(
            finding.severity,
          )}`}
        >
          {finding.severity}
        </span>
        {finding.line != null && (
          <span className="rounded-md bg-cs-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-cs-muted">
            line {finding.line}
          </span>
        )}
      </div>
      <h3 className="text-sm font-bold text-cs-text">{finding.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-cs-muted">{finding.description}</p>
      {finding.suggestion && (
        <div className="mt-2 rounded-md border border-cs-info/20 bg-cs-info/5 p-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-cs-info">
            Suggestion
          </span>
          <p className="mt-0.5 font-mono text-xs leading-relaxed text-cs-text">
            {finding.suggestion}
          </p>
        </div>
      )}
    </motion.div>
  );
}