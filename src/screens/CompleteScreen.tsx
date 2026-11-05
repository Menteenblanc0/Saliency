import { content } from "../content";

export function CompleteScreen({ total }: { total: number }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-8"
          style={{ background: "var(--muted)" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1
          className="text-3xl font-light mb-4"
          style={{ letterSpacing: "-0.02em" }}
        >
          {content.complete.title}
        </h1>

        <p
          className="text-base leading-relaxed mb-2"
          style={{ color: "var(--muted-foreground)", fontWeight: 300 }}
        >
          {content.complete.body1(total)}
        </p>
        <p
          className="text-base leading-relaxed mb-10"
          style={{ color: "var(--muted-foreground)", fontWeight: 300 }}
        >
          {content.complete.body2}
        </p>

        <div
          className="py-5"
          style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex justify-center gap-10">
            <div>
              <p
                className="text-2xl font-light"
                style={{ letterSpacing: "-0.02em" }}
              >
                {total}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                {content.complete.annotatedLabel}
              </p>
            </div>
            <div>
              <p
                className="text-2xl font-light"
                style={{ letterSpacing: "-0.02em" }}
              >
                100%
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                {content.complete.doneLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
