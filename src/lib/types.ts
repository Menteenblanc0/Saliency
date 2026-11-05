export type Screen = "intro" | "annotation" | "rating" | "transition" | "comment" | "complete";
export type DesignAnswer = "si" | "no" | "no_determina";
export type Tool = "brush" | "eraser";

export interface Point {
  x: number;
  y: number;
}

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
