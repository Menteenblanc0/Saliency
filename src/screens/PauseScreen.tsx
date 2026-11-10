import { content } from "../content";

export function PauseScreen({
  done,
  total,
  onBack,
}: {
  done: number;
  total: number;
  onBack: () => void;
}) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-light leading-tight mb-3" style={{ letterSpacing: "-0.02em" }}>
          {content.pause.title}
        </h1>
        <p className="text-base mb-4" style={{ fontWeight: 300 }}>
          {content.pause.progress(done, total)}
        </p>
        <div className="h-0.5 rounded-full mb-6" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${total > 0 ? (done / total) * 100 : 0}%`, background: "var(--accent)" }}
          />
        </div>
        <p className="text-base leading-relaxed mb-8" style={{ color: "var(--muted-foreground)", fontWeight: 300 }}>
          {content.pause.howToReturn}
        </p>
        <button
          onClick={onBack}
          className="w-full py-3.5 text-sm font-medium rounded-sm"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {content.pause.backHome}
        </button>
      </div>
    </div>
  );
}
