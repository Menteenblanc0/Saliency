export type Screen = "intro" | "annotation" | "rating" | "transition" | "comment" | "complete";
export type DesignAnswer = "si" | "no" | "no_determina";
export type Tool = "brush" | "eraser";

export interface Point {
  x: number;
  y: number;
}

// Coordenadas relativas a la imagen tal como se ve en pantalla (no al lienzo,
// que puede tener franjas vacías): x e y van de 0 a 1 sobre el ancho y el alto
// de la imagen, y size es el grosor como fracción del ancho de la imagen.
export interface Stroke {
  tool: Tool;
  size: number;
  points: Point[];
}

export interface ImageItem {
  id: string;
  url: string;
  alt: string | null;
}
