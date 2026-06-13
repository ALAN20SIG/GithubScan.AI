function gradeColor(grade: string): string {
  const g = grade.trim().charAt(0).toUpperCase();
  if (g === "A" || g === "B") return "text-cs-grade-good border-cs-grade-good/40 bg-cs-grade-good/10";
  if (g === "C") return "text-cs-grade-mid border-cs-grade-mid/40 bg-cs-grade-mid/10";
  if (g === "D" || g === "F") return "text-cs-grade-bad border-cs-grade-bad/40 bg-cs-grade-bad/10";
  return "text-cs-muted border-cs-border bg-cs-surface-2";
}

export function GradeBadge({ grade }: { grade: string }) {
  return (
    <span
      className={`inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border px-2 font-mono text-lg font-bold ${gradeColor(grade)}`}
      title="Overall grade"
    >
      {grade}
    </span>
  );
}