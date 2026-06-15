import { CATEGORIES, type Category, type Finding } from "@/lib/codescan-types";

export type ViewTab = Category | "edge" | "suite" | "cicd";

type Status = "passed" | "failed" | null;

function StatusDot({ status }: { status: Status }) {
  const cls =
    status === "passed"
      ? "bg-cs-success/20 text-cs-success"
      : status === "failed"
        ? "bg-cs-critical/20 text-cs-critical"
        : "bg-cs-surface text-cs-muted";
  return (
    <span className={`rounded-full px-2 text-xs font-bold ${cls}`}>
      {status === "passed" ? "✓" : status === "failed" ? "✕" : "–"}
    </span>
  );
}

export function CategoryTabs({
  active,
  onChange,
  findings,
  edgeStatus = null,
  suiteStatus = null,
  pipelineStatus = null,
}: {
  active: ViewTab;
  onChange: (c: ViewTab) => void;
  findings: Finding[];
  edgeStatus?: Status;
  suiteStatus?: Status;
  pipelineStatus?: Status;
}) {
  const tabClass = (isActive: boolean) =>
    `flex flex-col items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
      isActive ? "bg-cs-surface-2 text-cs-text" : "text-cs-muted hover:text-cs-text"
    }`;
  const underline = (isActive: boolean) =>
    `h-0.5 w-full rounded-full transition-colors ${isActive ? "bg-cs-info" : "bg-transparent"}`;

  const extras: { key: ViewTab; label: string; status: Status }[] = [
    { key: "edge", label: "Edge", status: edgeStatus },
    { key: "suite", label: "Suite", status: suiteStatus },
    { key: "cicd", label: "CI/CD", status: pipelineStatus },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 border-b border-cs-border bg-cs-bg px-3 py-3 sm:grid-cols-7 md:px-6">
      {CATEGORIES.map(({ key, label }) => {
        const count = findings.filter((f) => f.category === key).length;
        const isActive = key === active;
        return (
          <button key={key} onClick={() => onChange(key)} className={tabClass(isActive)}>
            <span className="flex items-center gap-1.5">
              {label}
              <span
                className={`rounded-full px-2 text-xs font-bold ${
                  count > 0 ? "bg-cs-info/20 text-cs-info" : "bg-cs-surface text-cs-muted"
                }`}
              >
                {count}
              </span>
            </span>
            <span className={underline(isActive)} />
          </button>
        );
      })}
      {extras.map(({ key, label, status }) => {
        const isActive = key === active;
        return (
          <button key={key} onClick={() => onChange(key)} className={tabClass(isActive)}>
            <span className="flex items-center gap-1.5">
              {label}
              <StatusDot status={status} />
            </span>
            <span className={underline(isActive)} />
          </button>
        );
      })}
    </div>
  );
}
