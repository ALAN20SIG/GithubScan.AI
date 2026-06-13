import { GradeBadge } from "./GradeBadge";

export function TopBar({ language, grade }: { language: string; grade: string }) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-cs-border bg-cs-bg px-4 py-3 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-cs-info/15 font-mono text-base font-bold text-cs-info">
          {"</>"}
        </span>
        <h1 className="truncate font-mono text-base font-bold text-cs-text">CodeScan AI</h1>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="rounded-md border border-cs-border bg-cs-surface-2 px-2.5 py-1.5 font-mono text-sm text-cs-muted">
          {language}
        </span>
        <GradeBadge grade={grade} />
      </div>
    </header>
  );
}