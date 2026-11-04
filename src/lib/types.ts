export type Screen = "welcome" | "annotation" | "transition" | "complete";
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
