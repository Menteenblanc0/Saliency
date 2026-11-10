import { content } from "../content";

export function IntroScreen({ onStart, total }: { onStart: () => void; total: number }) {
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

        <div className="mb-6 space-y-3">
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

        <p className="text-sm leading-relaxed mb-10" style={{ color: "var(--muted-foreground)" }}>
          {content.intro.pauseNotice}
        </p>

        {/* Progress info */}
        <div
          className="flex items-center gap-3 mb-10 pb-10"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex-1 h-0.5 rounded-full" style={{ background: "var(--border)" }} />
          <span
            className="text-xs font-medium shrink-0"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--muted-foreground)" }}
          >
            {content.intro.totalLabel(total)}
          </span>
        </div>

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

        <p
          className="text-xs leading-relaxed text-center mt-4"
          style={{ color: "var(--muted-foreground)" }}
        >
          {content.intro.dataNotice}
        </p>
      </div>
    </div>
  );
}
