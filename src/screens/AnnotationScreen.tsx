import { useState, useRef, useEffect } from "react";
import type { ImageItem, Stroke, Tool } from "../lib/types";
import { normalizeStrokes } from "../lib/strokes";
import { content } from "../content";
import { AnnotationCanvas } from "../components/AnnotationCanvas";
import { BrushIcon, EraserIcon, UndoIcon, TrashIcon, InfoIcon } from "../components/Icons";

export function AnnotationScreen({
  imageIndex,
  onDone,
  onSkip,
  images,
  total,
}: {
  imageIndex: number;
  // Entrega los trazos ya normalizados; el guardado ocurre en la pantalla de calificación.
  onDone: (strokes: Stroke[]) => void;
  onSkip: () => void;
  images: ImageItem[];
  total: number;
}) {
  const currentImage = images[imageIndex];
  const [tool, setTool] = useState<Tool>("brush");
  const [brushSize, setBrushSize] = useState(28);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const canvasSizeRef = useRef({ width: 1, height: 1 });

  // Precarga de la siguiente imagen para que la transición sea instantánea.
  useEffect(() => {
    const next = images[imageIndex + 1];
    if (next) {
      const img = new Image();
      img.src = next.url;
    }
  }, [imageIndex, images]);

  const hasStrokes = strokes.length > 0;
  // El servidor exige al menos un trazo de pincel: un trazo solo de borrador no basta.
  const hasBrush = strokes.some((s) => s.tool === "brush");

  const undo = () => setStrokes((prev) => prev.slice(0, -1));
  const clear = () => setStrokes([]);

  const handleNext = () => {
    const { width, height } = canvasSizeRef.current;
    onDone(normalizeStrokes(strokes, width, height));
  };

  const handleSkip = () => {
    console.warn("Imagen omitida por error de carga:", currentImage.id);
    onSkip();
  };

  const progress = ((imageIndex + 1) / total) * 100;

  // Siempre ocupa la misma altura: si apareciera o desapareciera, el lienzo
  // cambiaría de tamaño en pleno dibujo y desplazaría los trazos ya hechos.
  const statusLine = (
    <div
      role="status"
      className="h-5 leading-5 flex items-center justify-center text-xs"
      style={{ color: "var(--muted-foreground)" }}
    >
      {!hasBrush ? content.annotation.hint : "\u00A0"}
    </div>
  );

  const nextButton = (className: string) => (
    <button
      onClick={handleNext}
      disabled={!hasBrush}
      className={`font-medium transition-opacity duration-150 disabled:opacity-30 disabled:cursor-not-allowed rounded-sm ${className}`}
      style={{
        background: "var(--primary)",
        color: "var(--primary-foreground)",
      }}
    >
      {content.annotation.next}
    </button>
  );

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--background)" }}>
      {/* Top bar: dos filas en teléfono vertical, una sola en pantallas anchas */}
      <div
        className="flex flex-col gap-2 px-5 py-3 shrink-0 wide:flex-row wide:items-center wide:justify-between"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}
      >
        {/* Progress + instrucciones */}
        <div className="flex items-center gap-4">
          <span
            className="text-xs font-medium shrink-0"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--muted-foreground)" }}
          >
            {content.annotation.imageOf(imageIndex + 1, total)}
          </span>
          <div
            className="flex-1 h-0.5 rounded-full wide:max-md:hidden md:flex-none md:w-32"
            style={{ background: "var(--border)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: "var(--accent)" }}
            />
          </div>
          <button
            onClick={() => setShowInstructions((v) => !v)}
            aria-expanded={showInstructions}
            aria-controls="instrucciones"
            className="flex items-center gap-1.5 py-1 text-xs font-medium shrink-0"
            style={{ color: "var(--accent)" }}
          >
            <InfoIcon />
            <span className="wide:max-md:hidden">
              {showInstructions
                ? content.annotation.hideInstructions
                : content.annotation.showInstructions}
            </span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1">
          {/* Brush size */}
          <div className="flex items-center gap-2 mr-2 flex-1 min-w-0 wide:flex-none wide:mr-3">
            <span className="text-xs hidden wide:inline" style={{ color: "var(--muted-foreground)" }}>
              {content.annotation.size}
            </span>
            <input
              type="range"
              min={6}
              max={60}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              aria-label={content.annotation.size}
              className="flex-1 min-w-0 wide:flex-none wide:w-20"
              style={{ accentColor: "var(--accent)" }}
            />
            <span
              className="text-xs w-6 text-right shrink-0"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--muted-foreground)" }}
            >
              {brushSize}
            </span>
          </div>

          {/* Tool toggle */}
          <div
            className="flex rounded-sm overflow-hidden shrink-0"
            style={{ border: "1px solid var(--border)" }}
          >
            <button
              onClick={() => setTool("brush")}
              title={content.annotation.brush}
              className="flex items-center justify-center w-9 h-9 transition-colors duration-100"
              style={{
                background: tool === "brush" ? "var(--primary)" : "var(--card)",
                color: tool === "brush" ? "var(--primary-foreground)" : "var(--muted-foreground)",
              }}
            >
              <BrushIcon />
            </button>
            <button
              onClick={() => setTool("eraser")}
              title={content.annotation.eraser}
              className="flex items-center justify-center w-9 h-9 transition-colors duration-100"
              style={{
                background: tool === "eraser" ? "var(--primary)" : "var(--card)",
                color: tool === "eraser" ? "var(--primary-foreground)" : "var(--muted-foreground)",
                borderLeft: "1px solid var(--border)",
              }}
            >
              <EraserIcon />
            </button>
          </div>

          {/* Undo */}
          <button
            onClick={undo}
            disabled={!hasStrokes}
            title={content.annotation.undo}
            className="flex items-center justify-center w-9 h-9 ml-1 shrink-0 rounded-sm transition-opacity duration-100 disabled:opacity-30"
            style={{ color: "var(--foreground)", border: "1px solid var(--border)", background: "var(--card)" }}
          >
            <UndoIcon />
          </button>

          {/* Clear */}
          <button
            onClick={clear}
            disabled={!hasStrokes}
            title={content.annotation.clear}
            className="flex items-center justify-center w-9 h-9 shrink-0 rounded-sm transition-opacity duration-100 disabled:opacity-30"
            style={{ color: "var(--foreground)", border: "1px solid var(--border)", background: "var(--card)" }}
          >
            <TrashIcon />
          </button>

          {/* Next (solo en diseño ancho; en teléfono vertical va en la barra inferior) */}
          {nextButton("hidden wide:inline-block ml-3 px-5 py-2 text-sm")}
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 p-4 md:p-6 min-h-0">
        <div
          className="h-full rounded-sm overflow-hidden relative"
          style={{ border: "1px solid var(--border)" }}
        >
          <AnnotationCanvas
            image={currentImage}
            strokes={strokes}
            setStrokes={setStrokes}
            tool={tool}
            brushSize={brushSize}
            onSizeChange={(size) => (canvasSizeRef.current = size)}
            onSkip={handleSkip}
          />
          {/* Recordatorio de instrucciones: se superpone al lienzo, sin
              cambiar su tamaño (cambiarlo desplazaría los trazos hechos). */}
          {showInstructions && (
            <div
              id="instrucciones"
              className="absolute inset-x-0 top-0 max-h-full overflow-y-auto p-4 text-sm leading-relaxed space-y-2 z-10"
              style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
            >
              {content.intro.instructions.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pista en diseño ancho */}
      <div className="hidden wide:block px-4 pb-3 shrink-0">{statusLine}</div>

      {/* Barra inferior fija en teléfono vertical */}
      <div
        className="wide:hidden shrink-0 px-4 pt-2"
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--card)",
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
        }}
      >
        {statusLine}
        {nextButton("w-full mt-1 py-3.5 text-sm")}
      </div>
    </div>
  );
}
