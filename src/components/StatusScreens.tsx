import { content } from "../content";

export function LoadingScreen() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-3">
      <p className="text-sm" style={{ color: "var(--muted-foreground)", fontWeight: 300 }}>
        {content.status.loading}
      </p>
    </div>
  );
}

export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm" style={{ color: "var(--muted-foreground)", fontWeight: 300 }}>
        {content.status.error}
      </p>
      <button
        onClick={onRetry}
        className="px-5 py-2 text-sm font-medium rounded-sm"
        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
      >
        {content.status.retry}
      </button>
    </div>
  );
}
