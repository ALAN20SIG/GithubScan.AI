import { MODELS } from "@/lib/models";
import { useModel } from "@/lib/use-model";

export function ModelConfigPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [model, setModel] = useModel();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[8vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-cs-border bg-cs-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-cs-border px-5 py-4">
          <div>
            <h2 className="font-mono text-sm font-bold text-cs-text">AI model</h2>
            <p className="text-xs text-cs-muted">
              Used for reviews, tests, pipeline & architecture.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-md text-cs-muted transition-colors hover:bg-cs-surface-2 hover:text-cs-text"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
          {MODELS.map((m) => {
            const active = m.id === model;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setModel(m.id)}
                className={`flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
                  active
                    ? "border-cs-info bg-cs-info/10"
                    : "border-cs-border bg-cs-bg hover:bg-cs-surface-2"
                }`}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold text-cs-text">{m.label}</span>
                    <span className="rounded-full bg-cs-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase text-cs-muted">
                      {m.tier}
                    </span>
                  </span>
                  <span className="mt-0.5 block font-mono text-[11px] text-cs-muted">{m.id}</span>
                  <span className="mt-1 block text-xs text-cs-muted">{m.note}</span>
                </span>
                {active && (
                  <span className="mt-0.5 shrink-0 rounded-full bg-cs-info/20 px-2 text-xs font-bold text-cs-info">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}