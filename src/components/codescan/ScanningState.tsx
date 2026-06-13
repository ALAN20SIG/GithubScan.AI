import { motion } from "framer-motion";
import { CATEGORIES } from "@/lib/codescan-types";

export function ScanningState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12">
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="w-full max-w-lg space-y-2 rounded-lg border border-cs-border bg-cs-surface p-4"
      >
        {[80, 60, 90, 50, 70].map((w, i) => (
          <div
            key={i}
            className="h-2.5 rounded bg-cs-surface-2"
            style={{ width: `${w}%` }}
          />
        ))}
      </motion.div>
      <p className="font-mono text-sm text-cs-text">Analyzing your code...</p>
      <div className="flex flex-wrap justify-center gap-2">
        {CATEGORIES.map(({ key, label }, i) => (
          <motion.span
            key={key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.4, duration: 0.4 }}
            className="rounded-md border border-cs-border bg-cs-surface-2 px-2.5 py-1 text-xs text-cs-muted"
          >
            {label}
          </motion.span>
        ))}
      </div>
    </div>
  );
}