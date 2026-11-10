// netlify/functions/feedback.ts
//
// Recibe POST con { participantId, comment } y guarda el comentario
// final opcional en la tabla `feedback` (una fila por participante).
// Un segundo envío del mismo participante se ignora y cuenta como éxito.

import { supabase, json, UUID_RE, participantExists } from "../lib/shared";

const MAX_COMMENT_LENGTH = 2000;

export default async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  if (typeof body !== "object" || body === null) {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  const { participantId, comment } = body as Record<string, unknown>;

  if (typeof participantId !== "string" || !UUID_RE.test(participantId)) {
    return json({ error: "participantId inválido" }, 400);
  }
  if (typeof comment !== "string") {
    return json({ error: "comment inválido" }, 400);
  }
  const trimmed = comment.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_COMMENT_LENGTH) {
    return json(
      { error: `El comentario debe tener entre 1 y ${MAX_COMMENT_LENGTH} caracteres` },
      400,
    );
  }

  // Solo se aceptan comentarios de participantes registrados.
  try {
    if (!(await participantExists(participantId))) {
      return json({ error: "participante no registrado" }, 400);
    }
  } catch (err) {
    console.error("Error comprobando al participante:", err);
    return json({ error: "No se pudo guardar" }, 500);
  }

  const { error } = await supabase.from("feedback").upsert(
    { participant_id: participantId, comment: trimmed },
    { onConflict: "participant_id", ignoreDuplicates: true },
  );

  if (error) {
    console.error("Error guardando comentario:", error);
    return json({ error: "No se pudo guardar" }, 500);
  }

  return json({ ok: true }, 200);
};
