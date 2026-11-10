import type { DesignAnswer, ImageItem, Stroke } from "./types";

// Error de la API con el código HTTP, para distinguir "correo inválido" (400)
// o "participante desconocido" (404) de un fallo de red o del servidor.
export class ApiError extends Error {
  status: number;
  constructor(status: number) {
    super(`La función respondió con error ${status}`);
    this.status = status;
  }
}

export async function fetchImages(): Promise<ImageItem[]> {
  const res = await fetch("/.netlify/functions/images");
  if (!res.ok) throw new ApiError(res.status);
  const data = await res.json();
  return data.images as ImageItem[];
}

async function postJson(path: string, payload: unknown): Promise<unknown> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  // El backend responde 200 también cuando el registro ya existía
  // (guardado idempotente), así que un reintento nunca falla por duplicado.
  if (!res.ok) throw new ApiError(res.status);
  return res.json().catch(() => ({}));
}

// ---- Contrato con el backend (funciones `participants` y `complete`) ----
//
// POST /.netlify/functions/participants
//   body: { email, consent: true, consentVersion } (ingreso: la autorización de
//         tratamiento de datos es obligatoria la primera vez que entra un correo)
//      o { participantId } (recarga de una pestaña ya identificada)
//   200:  { participantId, order, doneImageIds, completed }
//         order        ids de TODAS las imágenes activas en el orden de este
//                      participante (el servidor lo decide y lo reconcilia)
//         doneImageIds ids de las imágenes que ya tienen anotación guardada
//         completed    true si ya cerró la encuesta
//   400:  correo inválido o falta la autorización      404: participantId desconocido
//
// POST /.netlify/functions/complete   body: { participantId }   200: { ok: true }
export interface ParticipantState {
  participantId: string;
  order: string[];
  doneImageIds: string[];
  completed: boolean;
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

export async function identifyParticipant(
  by: { email: string; consent: true; consentVersion: string } | { participantId: string },
): Promise<ParticipantState> {
  const data = (await postJson("/.netlify/functions/participants", by)) as Record<string, unknown>;
  if (
    typeof data.participantId !== "string" ||
    !isStringArray(data.order) ||
    !isStringArray(data.doneImageIds) ||
    typeof data.completed !== "boolean"
  ) {
    throw new Error("Respuesta inesperada de participants");
  }
  return {
    participantId: data.participantId,
    order: data.order,
    doneImageIds: data.doneImageIds,
    completed: data.completed,
  };
}

export async function postComplete(participantId: string): Promise<void> {
  await postJson("/.netlify/functions/complete", { participantId });
}

export async function postAnnotation(payload: {
  participantId: string;
  imageId: string;
  strokes: Stroke[];
  designAnswer: DesignAnswer;
}): Promise<void> {
  await postJson("/.netlify/functions/annotations", payload);
}

export async function postFeedback(participantId: string, comment: string): Promise<void> {
  await postJson("/.netlify/functions/feedback", { participantId, comment });
}
