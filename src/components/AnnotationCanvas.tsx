import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import type { ImageItem, Point, Stroke, Tool } from "../lib/types";
import { content } from "../content";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Zona del contenedor donde realmente se ve la imagen: la imagen se muestra
// con object-contain, así que si las proporciones no coinciden quedan franjas
// vacías. Las coordenadas se miden contra esta zona, no contra el contenedor.
function fitRect(boxW: number, boxH: number, imgW: number, imgH: number): Rect {
  if (!imgW || !imgH || !boxW || !boxH) return { x: 0, y: 0, width: boxW, height: boxH };
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return { x: (boxW - width) / 2, y: (boxH - height) / 2, width, height };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, rect: Rect) {
  if (stroke.points.length < 2) return;
  const px = (p: Point) => ({ x: rect.x + p.x * rect.width, y: rect.y + p.y * rect.height });
  const pts = stroke.points.map(px);
  ctx.save();
  ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = stroke.tool === "eraser" ? "rgba(0,0,0,1)" : "rgba(61,107,142,0.55)";
  ctx.lineWidth = stroke.size * rect.width; // size es fracción del ancho de la imagen
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2);
  }
  ctx.stroke();
  ctx.restore();
}

// `strokes` está en coordenadas relativas a la imagen (x, y en 0-1; size como
// fracción de su ancho). Al ser independientes del tamaño en pantalla, los
// trazos se vuelven a dibujar bien si cambia el tamaño de la ventana o se gira
// el teléfono.
export function AnnotationCanvas({
  image,
  strokes,
  setStrokes,
  tool,
  brushSize,
  onSkip,
}: {
  image: ImageItem;
  strokes: Stroke[];
  setStrokes: (s: Stroke[]) => void;
  tool: Tool;
  brushSize: number; // grosor del pincel en píxeles de pantalla
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
  const [loaded, setLoaded] = useState<{ url: string; w: number; h: number } | null>(null);
  const [erroredUrl, setErroredUrl] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 }); // tamaño del contenedor
  const imgLoaded = loaded?.url === image.url;
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

  // Mantiene `box` al día cuando cambia el tamaño del contenedor
  // (ventana, giro del teléfono, aparición de barras).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () =>
      setBox((prev) =>
        prev.w === container.clientWidth && prev.h === container.clientHeight
          ? prev
          : { w: container.clientWidth, h: container.clientHeight },
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const rect = useMemo(
    () => fitRect(box.w, box.h, imgLoaded ? loaded!.w : 0, imgLoaded ? loaded!.h : 0),
    [box, imgLoaded, loaded],
  );

  const render = useCallback((canvas: HTMLCanvasElement, area: Rect, list: Stroke[]) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    // Nada se dibuja fuera de la imagen (ni siquiera el borde del pincel).
    ctx.beginPath();
    ctx.rect(area.x, area.y, area.width, area.height);
    ctx.clip();
    list.forEach((stroke) => drawStroke(ctx, stroke, area));
    ctx.restore();
  }, []);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== box.w) canvas.width = box.w;
    if (canvas.height !== box.h) canvas.height = box.h;
    render(canvas, rect, strokes);
  }, [box, rect, strokes, render]);

  // Posición del puntero en píxeles del lienzo.
  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();
    const scaleX = canvas.width / bounds.width;
    const scaleY = canvas.height / bounds.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - bounds.left) * scaleX, y: (t.clientY - bounds.top) * scaleY };
    }
    return { x: (e.clientX - bounds.left) * scaleX, y: (e.clientY - bounds.top) * scaleY };
  };

  // Pasa el puntero a coordenadas relativas a la imagen. `inside` indica si
  // cae sobre la imagen; el punto se recorta al borde si queda fuera.
  const toImagePoint = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getPos(e);
    const u = (x - rect.x) / rect.width;
    const v = (y - rect.y) / rect.height;
    return {
      point: { x: clamp01(u), y: clamp01(v) },
      inside: u >= 0 && u <= 1 && v >= 0 && v <= 1,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imgLoaded || imgError) return;
    const { point, inside } = toImagePoint(e);
    if (!inside) return; // las franjas vacías alrededor de la imagen no se pueden marcar
    e.preventDefault();
    drawing.current = true;
    currentStroke.current = { tool, size: brushSize / rect.width, points: [point] };
  };

  const continueDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current || !currentStroke.current) return;
    currentStroke.current.points.push(toImagePoint(e).point);
    render(canvasRef.current!, rect, [...strokes, currentStroke.current]);
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
        onLoad={(e) =>
          setLoaded({
            url: image.url,
            w: e.currentTarget.naturalWidth,
            h: e.currentTarget.naturalHeight,
          })
        }
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
