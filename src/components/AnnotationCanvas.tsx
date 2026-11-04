import { useState, useRef, useEffect, useCallback } from "react";
import type { ImageItem, Point, Stroke, Tool } from "../lib/types";
import { content } from "../content";

export function AnnotationCanvas({
  image,
  strokes,
  setStrokes,
  tool,
  brushSize,
  onSizeChange,
  onSkip,
}: {
  image: ImageItem;
  strokes: Stroke[];
  setStrokes: (s: Stroke[]) => void;
  tool: Tool;
  brushSize: number;
  onSizeChange?: (size: { width: number; height: number }) => void;
  onSkip: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const currentStroke = useRef<Stroke | null>(null);

  // En vez de un efecto que "reinicia" el estado de carga (eso corre
  // en paralelo con el evento onLoad y puede perder la carrera si la
  // imagen ya estaba en caché por el prefetch), derivamos el estado
  // comparando la URL que ya terminó de cargar contra la que se está
  // mostrando ahora. Así nunca queda una carrera de por medio.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [erroredUrl, setErroredUrl] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const imgLoaded = loadedUrl === image.url;
  const imgError = erroredUrl === image.url;

  // Si el usuario le da "Reintentar", agregamos un parámetro que
  // cambia en cada intento -- así el navegador hace una petición
  // realmente nueva en vez de asumir que la URL ya falló antes.
  useEffect(() => {
    setRetryNonce(0);
  }, [image.id]);

  const attemptSrc =
    retryNonce > 0
      ? `${image.url}${image.url.includes("?") ? "&" : "?"}_retry=${retryNonce}`
      : image.url;

  const handleRetry = () => {
    setErroredUrl(null);
    setRetryNonce((n) => n + 1);
  };

  const redraw = useCallback((strokesToRender: Stroke[], canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokesToRender.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.save();
      ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle = stroke.tool === "eraser" ? "rgba(0,0,0,1)" : "rgba(61,107,142,0.55)";
      ctx.lineWidth = stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1];
        const curr = stroke.points[i];
        const mx = (prev.x + curr.x) / 2;
        const my = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      }
      ctx.stroke();
      ctx.restore();
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    onSizeChange?.({ width: canvas.width, height: canvas.height });
    redraw(strokes, canvas);
  }, [image.id, strokes, redraw, onSizeChange]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imgLoaded || imgError) return;
    e.preventDefault();
    drawing.current = true;
    currentStroke.current = { tool, size: brushSize, points: [getPos(e)] };
  };

  const continueDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current || !currentStroke.current) return;
    const pt = getPos(e);
    currentStroke.current.points.push(pt);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    redraw(strokes, canvas);

    const stroke = currentStroke.current;
    ctx.save();
    ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = stroke.tool === "eraser" ? "rgba(0,0,0,1)" : "rgba(61,107,142,0.55)";
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const pts = stroke.points;
    if (pts.length >= 2) {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2);
      }
    }
    ctx.stroke();
    ctx.restore();
  };

  const endDraw = () => {
    if (!drawing.current || !currentStroke.current) return;
    drawing.current = false;
    if (currentStroke.current.points.length > 1) {
      setStrokes([...strokes, currentStroke.current]);
    }
    currentStroke.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ cursor: !imgLoaded || imgError ? "default" : tool === "eraser" ? "cell" : "crosshair" }}
    >
      <img
        src={attemptSrc}
        alt={image.alt ?? ""}
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
        style={{ background: "var(--muted)", opacity: imgLoaded ? 1 : 0, transition: "opacity 150ms" }}
        fetchPriority="high"
        decoding="async"
        onLoad={() => setLoadedUrl(image.url)}
        onError={() => setErroredUrl(image.url)}
      />
      {!imgLoaded && !imgError && (
        <div
          className="absolute inset-0 flex items-center justify-center text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          {content.canvas.loading}
        </div>
      )}
      {imgError && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-xs text-center px-6"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span>{content.canvas.loadError}</span>
          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              className="px-4 py-1.5 text-xs font-medium rounded-sm"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {content.canvas.retry}
            </button>
            <button
              onClick={onSkip}
              className="px-4 py-1.5 text-xs font-medium rounded-sm"
              style={{ border: "1px solid var(--border)", color: "var(--foreground)", background: "var(--card)" }}
            >
              {content.canvas.skip}
            </button>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onMouseDown={startDraw}
        onMouseMove={continueDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={continueDraw}
        onTouchEnd={endDraw}
        style={{ touchAction: "none", pointerEvents: !imgLoaded || imgError ? "none" : "auto" }}
      />
    </div>
  );
}
