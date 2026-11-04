import type { ImageItem, Stroke } from "./types";

export async function fetchImages(): Promise<ImageItem[]> {
  const res = await fetch("/.netlify/functions/images");
  if (!res.ok) throw new Error("La función respondió con error");
  const data = await res.json();
  return data.images as ImageItem[];
}

export async function postAnnotation(payload: {
  participantId: string;
  imageId: string;
  strokes: Stroke[];
}): Promise<void> {
  const res = await fetch("/.netlify/functions/annotations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("La función respondió con error");
}
