import { useState, useRef, useEffect, useCallback } from "react";

// --- Types ---
type Screen = "welcome" | "annotation" | "transition" | "complete";
type Tool = "brush" | "eraser";

interface Point { x: number; y: number; }
interface Stroke { tool: Tool; size: number; points: Point[]; }

// --- Sample images (Unsplash) ---
const IMAGES = [
  { id: "1506905925346-21bda4d32df4", alt: "Mountain landscape at golden hour" },
  { id: "1543946207-f89c999e9e49", alt: "Busy urban street intersection" },
  { id: "1441986300917-64674bd600d8", alt: "Store display with products" },
  { id: "1495020689067-958852172e08", alt: "Food spread on a table" },
  { id: "1516912481808-3406841bd33c", alt: "Person reading in a library" },
];

const TOTAL = IMAGES.length;

function imageUrl(id: string, w = 1200, h = 800) {
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format`;
}

// --- Icons ---
const BrushIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
    <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1 1 2.48 1 3.5 1 1.66 0 3-1.35 3-3.02 0-1.67-1.35-3.02-3-3.02z" />
  </svg>
);

const EraserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20H7L3 16l10-10 7 7-3.5 3.5" />
    <path d="M6.0001 20l4-4" />
  </svg>
);

const UndoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

// --- Welcome Screen ---
function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        {/* Study badge */}
        <div className="mb-10">
          <span
            className="text-xs font-medium tracking-[0.15em] uppercase px-3 py-1.5 rounded-sm"
            style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
          >
            Estudio de atención visual
          </span>
        </div>

        <h1
          className="text-4xl font-light leading-tight mb-6"
          style={{ letterSpacing: "-0.02em" }}
        >
          Indícanos qué es lo primero que ves
        </h1>

        <p
          className="text-base leading-relaxed mb-3"
          style={{ color: "var(--muted-foreground)", fontWeight: 300 }}
        >
          Se te mostrará una serie de imágenes de forma individual. Usando el pincel, marca la zona que primero captó tu atención al verla.
        </p>
        <p
          className="text-base leading-relaxed mb-12"
          style={{ color: "var(--muted-foreground)", fontWeight: 300 }}
        >
          No hay respuestas correctas o incorrectas. Confía en tu primera impresión.
        </p>

        {/* Progress info */}
        <div
          className="flex items-center gap-3 mb-10 pb-10"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div
            className="flex-1 h-0.5 rounded-full"
            style={{ background: "var(--border)" }}
          >
            <div className="h-full w-0 rounded-full" style={{ background: "var(--accent)" }} />
          </div>
          <span
            className="text-xs font-medium shrink-0"
            style={{ fontFamily: "'DM Mono', monospace", color: "var(--muted-foreground)" }}
          >
            {TOTAL} imágenes en total
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
          Comenzar
        </button>

        <p
          className="text-xs text-center mt-4"
          style={{ color: "var(--muted-foreground)" }}
        >
          Participación anónima · Datos usados solo con fines de investigación
        </p>
      </div>
    </div>
  );
}

// --- Annotation Canvas ---
function AnnotationCanvas({
  imageIndex,
  strokes,
  setStrokes,
  tool,
  brushSize,
}: {
  imageIndex: number;
  strokes: Stroke[];
  setStrokes: (s: Stroke[]) => void;
  tool: Tool;
  brushSize: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const currentStroke = useRef<Stroke | null>(null);
  const img = IMAGES[imageIndex];

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
    redraw(strokes, canvas);
  }, [imageIndex, strokes, redraw]);

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
      style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
    >
      <img
        src={imageUrl(img.id)}
        alt={img.alt}
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
        style={{ background: "var(--muted)" }}
      />
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
        style={{ touchAction: "none" }}
      />
    </div>
  );
}

// --- Annotation Screen ---
function AnnotationScreen({
  imageIndex,
  onNext,
}: {
  imageIndex: number;
  onNext: () => void;
}) {
  const [tool, setTool] = useState<Tool>("brush");
  const [brushSize, setBrushSize] = useState(28);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const hasStrokes = strokes.length > 0;

  const undo = () => setStrokes((s) => s.slice(0, -1));
  const clear = () => setStrokes([]);

  const handleNext = () => {
    setStrokes([]);
    setTool("brush");
    onNext();
  };

  const progress = ((imageIndex + 1) / TOTAL) * 100;

  return (
    <div className="min-h-full flex flex-col" style={{ background: "var(--background)" }}>
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
            Imagen {imageIndex + 1} de {TOTAL}
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
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Tamaño</span>
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
              title="Pincel"
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
              title="Borrador"
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
            title="Deshacer"
            className="flex items-center justify-center w-9 h-9 ml-1 rounded-sm transition-opacity duration-100 disabled:opacity-30"
            style={{ color: "var(--foreground)", border: "1px solid var(--border)", background: "var(--card)" }}
          >
            <UndoIcon />
          </button>

          {/* Clear */}
          <button
            onClick={clear}
            disabled={!hasStrokes}
            title="Limpiar todo"
            className="flex items-center justify-center w-9 h-9 rounded-sm transition-opacity duration-100 disabled:opacity-30"
            style={{ color: "var(--foreground)", border: "1px solid var(--border)", background: "var(--card)" }}
          >
            <TrashIcon />
          </button>

          {/* Next */}
          <button
            onClick={handleNext}
            disabled={!hasStrokes}
            className="ml-3 px-5 py-2 text-sm font-medium transition-opacity duration-150 disabled:opacity-30 disabled:cursor-not-allowed rounded-sm"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {imageIndex + 1 < TOTAL ? "Siguiente →" : "Finalizar"}
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 p-4 md:p-6 min-h-0">
        <div
          className="h-full rounded-sm overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          <AnnotationCanvas
            imageIndex={imageIndex}
            strokes={strokes}
            setStrokes={setStrokes}
            tool={tool}
            brushSize={brushSize}
          />
        </div>
      </div>

      {/* Hint */}
      {!hasStrokes && (
        <div
          className="text-center text-xs pb-3 shrink-0"
          style={{ color: "var(--muted-foreground)" }}
        >
          Dibuja sobre la imagen para continuar
        </div>
      )}
    </div>
  );
}

// --- Transition Screen ---
function TransitionScreen({ next, current }: { next: number; current: number }) {
  const progress = (current / TOTAL) * 100;
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6">
      <div className="w-48 flex flex-col items-center gap-3">
        <div
          className="w-full h-0.5 rounded-full"
          style={{ background: "var(--border)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: "var(--accent)" }}
          />
        </div>
        <span
          className="text-xs"
          style={{ fontFamily: "'DM Mono', monospace", color: "var(--muted-foreground)" }}
        >
          {current} / {TOTAL} completadas
        </span>
      </div>
      <p className="text-sm" style={{ color: "var(--muted-foreground)", fontWeight: 300 }}>
        Preparando imagen {next}…
      </p>
    </div>
  );
}

// --- Complete Screen ---
function CompleteScreen({ onRestart }: { onRestart: () => void }) {
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
          Gracias por participar
        </h1>

        <p
          className="text-base leading-relaxed mb-2"
          style={{ color: "var(--muted-foreground)", fontWeight: 300 }}
        >
          Has completado las {TOTAL} imágenes del estudio. Tu contribución es valiosa para nuestra investigación.
        </p>
        <p
          className="text-base leading-relaxed mb-10"
          style={{ color: "var(--muted-foreground)", fontWeight: 300 }}
        >
          Los datos han sido registrados de forma anónima.
        </p>

        <div
          className="py-5 mb-10"
          style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex justify-center gap-10">
            <div>
              <p
                className="text-2xl font-light"
                style={{ letterSpacing: "-0.02em" }}
              >
                {TOTAL}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                imágenes anotadas
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
                completado
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onRestart}
          className="w-full py-3.5 text-sm font-medium transition-opacity duration-150 hover:opacity-70 rounded-sm"
          style={{
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            background: "var(--card)",
            letterSpacing: "0.03em",
          }}
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

// --- Root App ---
export default function App() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [imageIndex, setImageIndex] = useState(0);

  const handleStart = () => {
    setImageIndex(0);
    setScreen("annotation");
  };

  const handleNext = () => {
    const next = imageIndex + 1;
    if (next >= TOTAL) {
      setScreen("complete");
    } else {
      setScreen("transition");
      setTimeout(() => {
        setImageIndex(next);
        setScreen("annotation");
      }, 900);
    }
  };

  const handleRestart = () => {
    setImageIndex(0);
    setScreen("welcome");
  };

  return (
    <div className="size-full">
      {screen === "welcome" && <WelcomeScreen onStart={handleStart} />}
      {screen === "annotation" && (
        <AnnotationScreen imageIndex={imageIndex} onNext={handleNext} />
      )}
      {screen === "transition" && (
        <TransitionScreen current={imageIndex + 1} next={imageIndex + 2} />
      )}
      {screen === "complete" && <CompleteScreen onRestart={handleRestart} />}
    </div>
  );
}
