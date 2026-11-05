import type { DesignAnswer, ImageItem, Stroke } from "./types";

export async function fetchImages(): Promise<ImageItem[]> {
  const res = await fetch("/.netlify/functions/images");
  if (!res.ok) throw new Error("La función respondió con error");
  const data = await res.json();
  return data.images as ImageItem[];
}

async function postJson(path: string, payload: unknown): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  // El backend responde 200 también cuando el registro ya existía
  // (guardado idempotente), así que un reintento nunca falla por duplicado.
  if (!res.ok) throw new Error("La función respondió con error");
}

export function postAnnotation(payload: {
  participantId: string;
  imageId: string;
  strokes: Stroke[];
  designAnswer: DesignAnswer;
}): Promise<void> {
  return postJson("/.netlify/functions/annotations", payload);
}

export function postFeedback(participantId: string, comment: string): Promise<void> {
  return postJson("/.netlify/functions/feedback", { participantId, comment });
}
