import type { Stroke } from "./types";

const round4 = (n: number) => Math.round(n * 10000) / 10000;
const unit = (n: number) => round4(Math.min(1, Math.max(0, n)));

// Pasa los trazos de píxeles del lienzo a coordenadas normalizadas:
// x e y por ancho/alto del lienzo, size por el ancho. Todo se recorta a
// [0, 1] y se redondea a 4 decimales (el servidor rechaza valores fuera
// de rango; el redondeo casi reduce a la mitad el tamaño de cada registro).
export function normalizeStrokes(strokes: Stroke[], width: number, height: number): Stroke[] {
  return strokes.map((s) => ({
    tool: s.tool,
    size: Math.max(0.0001, unit(s.size / width)),
    points: s.points.map((p) => ({ x: unit(p.x / width), y: unit(p.y / height) })),
  }));
}
