import { useState, useRef, useEffect } from "react";
import type { ImageItem, Stroke, Tool } from "../lib/types";
import { content } from "../content";
import { postAnnotation } from "../lib/api";
import { AnnotationCanvas } from "../components/AnnotationCanvas";
import { BrushIcon, EraserIcon, UndoIcon, TrashIcon } from "../components/Icons";

export function AnnotationScreen({
  imageIndex,
  onNext,
  participantId,
  images,
  total,
}: {
  imageIndex: number;
  onNext: () => void;
  participantId: string;
  images: ImageItem[];
  total: number;
}) {
  const currentImage = images[imageIndex];

  // Precarga la(s) siguiente(s) imagen(es) en segundo plano mientras
  // el participante todavía está dibujando en la actual. Cuando pulse
  // "Siguiente", el navegador ya la tiene en caché y aparece al
  // instante en vez de esperar la descarga.
  useEffect(() => {
    const next = images[imageIndex + 1];
    const nextNext = images[imageIndex + 2];
    [next, nextNext].forEach((item) => {
      if (item) {
        const preloadImg = new Image();
        preloadImg.src = item.url;
      }
    });
  }, [imageIndex, images]);
  const [tool, setTool] = useState<Tool>("brush");
  const [brushSize, setBrushSize] = useState(28);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const canvasSizeRef = useRef({ width: 1, height: 1 });
  const hasStrokes = strokes.length > 0;

  const undo = () => setStrokes((s) => s.slice(0, -1));
  const clear = () => setStrokes([]);

  // Para cuando una imagen nunca llega a cargar: avanza sin pasar por
  // el guardado (no hay ningún trazo real que guardar, y forzar un
  // POST vacío no aportaría nada) para que nadie quede bloqueado.
  const handleSkip = () => {
    console.warn(`Imagen saltada por error de carga: ${currentImage.id}`);
    setStrokes([]);
    setTool("brush");
    onNext();
  };

  const handleNext = async () => {
    const { width, height } = canvasSizeRef.current;

    // Convertimos cada punto de píxeles del lienzo a una fracción de
    // 0 a 1. Así, sin importar el tamaño de pantalla de cada
    // participante, "x: 0.5, y: 0.3" siempre significa lo mismo sobre
    // la imagen -- necesario para que el mapa de calor sea comparable
    // entre dispositivos distintos.
    const normalizedStrokes = strokes.map((s) => ({
      tool: s.tool,
      size: s.size / width,
      points: s.points.map((p) => ({ x: p.x / width, y: p.y / height })),
    }));

    setIsSaving(true);
    setSaveError(null);

    try {
      await postAnnotation({
        participantId,
        imageId: currentImage.id,
        strokes: normalizedStrokes,
      });

      setStrokes([]);
      setTool("brush");
      onNext();
    } catch (err) {
      console.error("No se pudo guardar la anotación:", err);
      setSaveError(content.annotation.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const progress = ((imageIndex + 1) / total) * 100;

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--background)" }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}
      >
        {/* Progress */}
        <div className="flex items-center gap-4">
          <span
            className="text-xs font-medium"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--muted-foreground)" }}
          >
            {content.annotation.imageOf(imageIndex + 1, total)}
          </span>
          <div
            className="w-32 h-0.5 rounded-full hidden sm:block"
            style={{ background: "var(--border)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: "var(--accent)" }}
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1">
          {/* Brush size */}
          <div className="flex items-center gap-2 mr-3">
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{content.annotation.size}</span>
            <input
              type="range"
              min={6}
              max={60}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20 accent-[var(--accent)]"
              style={{ accentColor: "var(--accent)" }}
            />
            <span
              className="text-xs w-6 text-right"
              style={{ fontFamily: "'DM Mono', monospace", color: "var(--muted-foreground)" }}
            >
              {brushSize}
            </span>
          </div>

          {/* Tool toggle */}
          <div
            className="flex rounded-sm overflow-hidden"
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
            className="flex items-center justify-center w-9 h-9 ml-1 rounded-sm transition-opacity duration-100 disabled:opacity-30"
            style={{ color: "var(--foreground)", border: "1px solid var(--border)", background: "var(--card)" }}
          >
            <UndoIcon />
          </button>

          {/* Clear */}
          <button
            onClick={clear}
            disabled={!hasStrokes}
            title={content.annotation.clear}
            className="flex items-center justify-center w-9 h-9 rounded-sm transition-opacity duration-100 disabled:opacity-30"
            style={{ color: "var(--foreground)", border: "1px solid var(--border)", background: "var(--card)" }}
          >
            <TrashIcon />
          </button>

          {/* Next */}
          <button
            onClick={handleNext}
            disabled={!hasStrokes || isSaving}
            className="ml-3 px-5 py-2 text-sm font-medium transition-opacity duration-150 disabled:opacity-30 disabled:cursor-not-allowed rounded-sm"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {isSaving
              ? content.annotation.saving
              : imageIndex + 1 < total
                ? content.annotation.next
                : content.annotation.finish}
          </button>
        </div>
        {saveError && (
          <div
            className="text-center text-xs pb-2"
            style={{ color: "var(--destructive, #c0392b)" }}
          >
            {saveError}
          </div>
        )}
      </div>

      {/* Canvas area */}
      <div className="flex-1 p-4 md:p-6 min-h-0">
        <div
          className="h-full rounded-sm overflow-hidden"
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
        </div>
      </div>

      {/* Hint */}
      {!hasStrokes && (
        <div
          className="text-center text-xs pb-3 shrink-0"
          style={{ color: "var(--muted-foreground)" }}
        >
          {content.annotation.hint}
        </div>
      )}
    </div>
  );
}
