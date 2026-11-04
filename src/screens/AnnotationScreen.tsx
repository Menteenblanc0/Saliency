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

  const nextLabel = isSaving
    ? content.annotation.saving
    : imageIndex + 1 < total
      ? content.annotation.next
      : content.annotation.finish;

  // Un solo mensaje de estado (error de guardado o pista). Siempre ocupa
  // la misma altura (dos líneas en teléfono vertical, para que quepa el
  // error): si cambiara, el lienzo cambiaría de tamaño en pleno dibujo y
  // desplazaría los trazos ya hechos.
  const statusLine = (
    <div
      role="status"
      className="h-8 leading-4 wide:h-5 wide:leading-5 flex items-center justify-center text-center text-xs"
      style={{ color: saveError ? "var(--destructive, #c0392b)" : "var(--muted-foreground)" }}
    >
      {saveError ?? (!hasStrokes ? content.annotation.hint : "\u00A0")}
    </div>
  );

  const nextButton = (className: string) => (
    <button
      onClick={handleNext}
      disabled={!hasStrokes || isSaving}
      className={`font-medium transition-opacity duration-150 disabled:opacity-30 disabled:cursor-not-allowed rounded-sm ${className}`}
      style={{
        background: "var(--primary)",
        color: "var(--primary-foreground)",
      }}
    >
      {nextLabel}
    </button>
  );

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--background)" }}>
      {/* Top bar: dos filas en teléfono vertical, una sola en pantallas anchas */}
      <div
        className="flex flex-col gap-2 px-5 py-3 shrink-0 wide:flex-row wide:items-center wide:justify-between"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}
      >
        {/* Progress */}
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

      {/* Estado (pista / error de guardado) en diseño ancho */}
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
