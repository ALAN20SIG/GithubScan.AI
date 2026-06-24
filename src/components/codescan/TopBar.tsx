import { GradeBadge } from "./GradeBadge";
import { modelLabel } from "@/lib/models";
import { useModel } from "@/lib/use-model";

export function TopBar({
  language,
  grade,
  onConfigure,
}: {
  language: string;
  grade: string;
  onConfigure?: () => void;
}) {
  const [model] = useModel();
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-cs-border bg-cs-bg px-4 py-3 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-cs-info/15 font-mono text-base font-bold text-cs-info">
          {"</>"}
        </span>
        <h1 className="truncate font-mono text-base font-bold text-cs-text">
          CodeScan AI<span className="sr-only"> — AI Code Reviewer</span>
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {onConfigure && (
          <button
            type="button"
            onClick={onConfigure}
            title="Configure AI model"
            className="flex items-center gap-1.5 rounded-md border border-cs-border bg-cs-surface-2 px-2.5 py-1.5 font-mono text-xs text-cs-muted transition-colors hover:text-cs-text"
          >
            <span aria-hidden>⚙</span>
            <span className="hidden max-w-[140px] truncate sm:inline">{modelLabel(model)}</span>
          </button>
        )}
        <span className="rounded-md border border-cs-border bg-cs-surface-2 px-2.5 py-1.5 font-mono text-sm text-cs-muted">
          {language}
        </span>
        <GradeBadge grade={grade} />
      </div>
    </header>
  );
}