import { useState } from "react";
import type { DesignAnswer, ImageItem, Stroke } from "../lib/types";
import { content } from "../content";
import { postAnnotation } from "../lib/api";

// Criterios y nota: en pantallas amplias y altas se muestran siempre;
// en teléfono van dentro de un bloque plegable.
function Criteria() {
  return (
    <>
      <ul className="space-y-2 text-sm leading-relaxed list-disc pl-5">
        {content.rating.criteria.map((c) => (
          <li key={c.heading}>
            <strong className="font-semibold">{c.heading}:</strong> {c.text}
          </li>
        ))}
      </ul>
      <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--muted-foreground)" }}>
        {content.rating.note}
      </p>
    </>
  );
}

export function RatingScreen({
  image,
  strokes,
  participantId,
  onSaved,
  onPause,
}: {
  image: ImageItem;
  strokes: Stroke[]; // ya normalizados
  participantId: string;
  onSaved: () => void;
  onPause: () => void;
}) {
  // Sin opción preseleccionada: el participante debe elegir.
  const [answer, setAnswer] = useState<DesignAnswer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const submit = async () => {
    if (!answer || isSaving) return;
    setIsSaving(true);
    setSaveError(false);
    try {
      await postAnnotation({
        participantId,
        imageId: image.id,
        strokes,
        designAnswer: answer,
      });
      onSaved();
    } catch (err) {
      // Los trazos y la respuesta siguen en el estado: se puede reintentar sin perder nada.
      console.error("Error guardando anotación:", err);
      setSaveError(true);
      setIsSaving(false);
    }
  };

  // La calificación aún no se guardó: al volver, esta imagen se repite.
  const handlePause = () => {
    if (isSaving) return;
    if (window.confirm(content.pause.confirmUnsaved)) onPause();
  };

  return (
    <div className="h-full flex flex-col wide:flex-row" style={{ background: "var(--background)" }}>
      {/* Imagen limpia (sin trazos) */}
      <div className="shrink-0 h-[35dvh] p-4 wide:h-auto wide:flex-1 wide:min-w-0 wide:p-6 wide:shrink">
        <div
          className="h-full rounded-sm overflow-hidden relative"
          style={{ border: "1px solid var(--border)", background: "var(--muted)" }}
        >
          <img
            src={image.url}
            alt={image.alt ?? ""}
            draggable={false}
            className="absolute inset-0 w-full h-full object-contain select-none"
          />
        </div>
      </div>

      {/* Panel de calificación */}
      <div
        className="flex-1 min-h-0 flex flex-col wide:flex-none wide:w-[26rem] wide:border-l wide:border-l-[var(--border)]"
        style={{ background: "var(--card)" }}
      >
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 roomy:py-6">
          <div className="flex justify-end -mt-1 mb-1">
            <button
              onClick={handlePause}
              disabled={isSaving}
              className="py-1 text-xs font-medium disabled:opacity-30"
              style={{ color: "var(--muted-foreground)" }}
            >
              {content.pause.button}
            </button>
          </div>
          <h1
            className="text-xl roomy:text-2xl font-light leading-snug mb-3"
            style={{ letterSpacing: "-0.01em" }}
          >
            {content.rating.title}
          </h1>
          <p className="text-sm leading-relaxed mb-3">{content.rating.intro}</p>

          <div className="hidden roomy:block">
            <Criteria />
          </div>
          <details className="roomy:hidden rounded-sm" style={{ border: "1px solid var(--border)" }}>
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium select-none">
              {content.rating.criteriaToggle}
            </summary>
            <div className="px-3 pb-3">
              <Criteria />
            </div>
          </details>
        </div>

        {/* Pregunta + opciones + continuar: barra inferior fija en teléfono */}
        <div
          className="shrink-0 px-5 pt-3"
          style={{
            borderTop: "1px solid var(--border)",
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
          }}
        >
          <p id="pregunta-diseno" className="text-sm font-medium leading-snug mb-2">
            {content.rating.question}
          </p>
          <div
            role="radiogroup"
            aria-labelledby="pregunta-diseno"
            className="grid grid-cols-3 gap-2"
          >
            {content.rating.options.map((opt) => {
              const selected = answer === opt.value;
              return (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setAnswer(opt.value as DesignAnswer)}
                  className="min-h-12 roomy:min-h-14 px-2 py-2 text-sm font-medium leading-tight rounded-sm transition-colors duration-100"
                  style={{
                    background: selected ? "var(--primary)" : "var(--card)",
                    color: selected ? "var(--primary-foreground)" : "var(--foreground)",
                    border: `1px solid ${selected ? "var(--primary)" : "var(--border)"}`,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {saveError && (
            <p role="alert" className="text-xs leading-snug mt-2" style={{ color: "var(--destructive, #c0392b)" }}>
              {content.rating.saveError}
            </p>
          )}

          <button
            onClick={submit}
            disabled={!answer || isSaving}
            className="w-full mt-3 py-3 roomy:py-3.5 text-sm font-medium rounded-sm transition-opacity duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {isSaving ? content.rating.saving : content.rating.submit}
          </button>
        </div>
      </div>
    </div>
  );
}
