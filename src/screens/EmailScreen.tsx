import { useState } from "react";
import { content } from "../content";
import { normalizeEmail } from "../lib/email";
import { ApiError } from "../lib/api";

export interface IdentifyInfo {
  showResume: boolean; // la persona ya tenía avance y se le muestra un resumen
  done: number; // imágenes ya guardadas
  total: number;
  startNumber: number; // posición (desde 1) de la primera imagen pendiente
}

type Phase = "form" | "confirm" | "resume";

const primaryButton = "w-full py-3.5 text-sm font-medium rounded-sm transition-opacity duration-150 disabled:opacity-30 disabled:cursor-not-allowed";

export function EmailScreen({
  onIdentify,
  onContinue,
}: {
  // Registra o reconoce el correo en el servidor y prepara dónde seguir.
  onIdentify: (email: string) => Promise<IdentifyInfo>;
  onContinue: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("form");
  const [raw, setRaw] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [info, setInfo] = useState<IdentifyInfo | null>(null);

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeEmail(raw);
    if (!normalized) {
      setError(content.email.invalid);
      return;
    }
    setError(null);
    setEmail(normalized);
    setPhase("confirm");
  };

  const confirm = async () => {
    if (checking) return;
    setChecking(true);
    setError(null);
    try {
      const result = await onIdentify(email);
      if (result.showResume) {
        setInfo(result);
        setPhase("resume");
        setChecking(false);
      } else {
        onContinue();
      }
    } catch (err) {
      console.error("No se pudo identificar al participante:", err);
      if (err instanceof ApiError && err.status === 400) {
        setError(content.email.invalid);
        setPhase("form"); // el servidor rechazó el correo: se corrige
      } else {
        setError(content.email.networkError);
      }
      setChecking(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        {phase === "form" && (
          <form onSubmit={submitForm} noValidate>
            <h1 className="text-3xl font-light leading-tight mb-3" style={{ letterSpacing: "-0.02em" }}>
              {content.email.title}
            </h1>
            <p className="text-base leading-relaxed mb-6" style={{ color: "var(--muted-foreground)", fontWeight: 300 }}>
              {content.email.body}
            </p>
            <label htmlFor="correo" className="block text-sm font-medium mb-2">
              {content.email.label}
            </label>
            <input
              id="correo"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={content.email.placeholder}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "correo-error" : undefined}
              className="w-full p-3 text-base rounded-sm"
              style={{ border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }}
            />
            {error && (
              <p id="correo-error" role="alert" className="text-sm mt-2" style={{ color: "var(--destructive, #c0392b)" }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={raw.trim().length === 0}
              className={`${primaryButton} mt-6`}
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {content.email.next}
            </button>
          </form>
        )}

        {phase === "confirm" && (
          <div>
            <h1 className="text-3xl font-light leading-tight mb-3" style={{ letterSpacing: "-0.02em" }}>
              {content.email.confirmTitle}
            </h1>
            <p className="text-base mb-2" style={{ color: "var(--muted-foreground)", fontWeight: 300 }}>
              {content.email.confirmBody}
            </p>
            <p className="text-lg font-medium mb-4 break-all">{email}</p>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--muted-foreground)" }}>
              {content.email.confirmHint}
            </p>
            {error && (
              <p role="alert" className="text-sm mb-4" style={{ color: "var(--destructive, #c0392b)" }}>
                {error}
              </p>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={confirm}
                disabled={checking}
                className={primaryButton}
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                {checking ? content.email.checking : content.email.confirm}
              </button>
              <button
                onClick={() => {
                  setError(null);
                  setPhase("form");
                }}
                disabled={checking}
                className="w-full py-3.5 text-sm font-medium rounded-sm disabled:opacity-30"
                style={{ border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }}
              >
                {content.email.edit}
              </button>
            </div>
          </div>
        )}

        {phase === "resume" && info && (
          <div>
            <h1 className="text-3xl font-light leading-tight mb-3" style={{ letterSpacing: "-0.02em" }}>
              {content.email.resumeTitle}
            </h1>
            <p className="text-base mb-6" style={{ fontWeight: 300 }}>
              {content.email.resumeBody(info.startNumber, info.total)}
            </p>
            <div className="h-0.5 rounded-full mb-8" style={{ background: "var(--border)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${info.total > 0 ? (info.done / info.total) * 100 : 0}%`, background: "var(--accent)" }}
              />
            </div>
            <button
              onClick={onContinue}
              className={primaryButton}
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {content.email.resumeContinue}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
