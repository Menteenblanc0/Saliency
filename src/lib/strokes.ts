import type { Stroke } from "./types";

const round4 = (n: number) => Math.round(n * 10000) / 10000;
const unit = (n: number) => round4(Math.min(1, Math.max(0, n)));

// Los trazos ya vienen en coordenadas relativas a la imagen (x, y en 0-1;
// size como fracción de su ancho). Aquí solo se recortan a [0, 1] (el
// servidor rechaza valores fuera de rango) y se redondean a 4 decimales,
// lo que casi reduce a la mitad el tamaño de cada registro.
export function normalizeStrokes(strokes: Stroke[]): Stroke[] {
  return strokes.map((s) => ({
    tool: s.tool,
    size: Math.max(0.0001, unit(s.size)),
    points: s.points.map((p) => ({ x: unit(p.x), y: unit(p.y) })),
  }));
}
