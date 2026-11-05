import { content } from "../content";

export function IntroScreen({
  onStart,
  onContinue,
  onRestart,
  total,
  resumeIndex,
}: {
  onStart: () => void;
  onContinue: () => void;
  onRestart: () => void;
  total: number;
  resumeIndex: number; // imágenes ya guardadas; si es mayor que 0, se ofrece retomar
}) {
  const canResume = resumeIndex > 0;

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        {/* Study badge */}
        <div className="mb-10">
          <span
            className="text-xs font-medium tracking-[0.15em] uppercase px-3 py-1.5 rounded-sm"
            style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
          >
            {content.intro.badge}
          </span>
        </div>

        <h1
          className="text-4xl font-light leading-tight mb-6"
          style={{ letterSpacing: "-0.02em" }}
        >
          {content.intro.title}
        </h1>

        <div className="mb-12 space-y-3">
          {content.intro.instructions.map((paragraph) => (
            <p
              key={paragraph}
              className="text-base leading-relaxed"
              style={{ color: "var(--foreground)", fontWeight: 300 }}
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/* Progress info */}
        <div
          className="flex items-center gap-3 mb-10 pb-10"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div
            className="flex-1 h-0.5 rounded-full"
            style={{ background: "var(--border)" }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${total > 0 ? (resumeIndex / total) * 100 : 0}%`, background: "var(--accent)" }}
            />
          </div>
          <span
            className="text-xs font-medium shrink-0"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--muted-foreground)" }}
          >
            {content.intro.totalLabel(total)}
          </span>
        </div>

        {canResume ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={onContinue}
              className="w-full py-4 text-sm font-medium tracking-wide transition-opacity duration-150 hover:opacity-80 active:opacity-60"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                borderRadius: "var(--radius)",
                letterSpacing: "0.05em",
              }}
            >
              {content.intro.continue(resumeIndex + 1, total)}
            </button>
            <button
              onClick={() => {
                if (window.confirm(content.intro.restartConfirm)) onRestart();
              }}
              className="w-full py-3.5 text-sm font-medium rounded-sm"
              style={{
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--foreground)",
              }}
            >
              {content.intro.restart}
            </button>
          </div>
        ) : (
          <button
            onClick={onStart}
            className="w-full py-4 text-sm font-medium tracking-wide transition-opacity duration-150 hover:opacity-80 active:opacity-60"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              borderRadius: "var(--radius)",
              letterSpacing: "0.05em",
            }}
          >
            {content.intro.start}
          </button>
        )}

        <p
          className="text-xs text-center mt-4"
          style={{ color: "var(--muted-foreground)" }}
        >
          {content.intro.footer}
        </p>
      </div>
    </div>
  );
}
