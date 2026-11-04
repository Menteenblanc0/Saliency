import { content } from "../content";

export function TransitionScreen({ next, current, total }: { next: number; current: number; total: number }) {
  const progress = (current / total) * 100;
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6">
      <div className="w-48 flex flex-col items-center gap-3">
        <div
          className="w-full h-0.5 rounded-full"
          style={{ background: "var(--border)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: "var(--accent)" }}
          />
        </div>
        <span
          className="text-xs"
          style={{ fontFamily: "'DM Mono', monospace", color: "var(--muted-foreground)" }}
        >
          {content.transition.completed(current, total)}
        </span>
      </div>
      <p className="text-sm" style={{ color: "var(--muted-foreground)", fontWeight: 300 }}>
        {content.transition.preparing(next)}
      </p>
    </div>
  );
}
