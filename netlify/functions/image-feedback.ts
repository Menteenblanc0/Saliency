// Comentarios opcionales por imagen. Cada participante puede dejar uno por imagen.
import { supabase, json, UUID_RE, PG_UNIQUE_VIOLATION, participantExists } from "../lib/shared";

const MAX_COMMENT_LENGTH = 2000;

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  let body: unknown;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  if (typeof body !== "object" || body === null) return json({ error: "Cuerpo inválido" }, 400);
  const { participantId, imageId, comment } = body as Record<string, unknown>;
  if (typeof participantId !== "string" || !UUID_RE.test(participantId)) return json({ error: "participantId inválido" }, 400);
  if (typeof imageId !== "string" || !UUID_RE.test(imageId)) return json({ error: "imageId inválido" }, 400);
  if (typeof comment !== "string" || !comment.trim() || comment.trim().length > MAX_COMMENT_LENGTH) {
    return json({ error: "Comentario inválido" }, 400);
  }
  try {
    if (!(await participantExists(participantId))) return json({ error: "Participante desconocido" }, 404);
    // No permitir comentarios de imágenes que el participante aún no ha calificado.
    const { data: annotation, error: annotationError } = await supabase.from("annotations")
      .select("id").eq("participant_id", participantId).eq("image_id", imageId).maybeSingle();
    if (annotationError) throw annotationError;
    if (!annotation) return json({ error: "La imagen aún no tiene anotación" }, 409);
    const { error } = await supabase.from("image_feedback").insert({
      participant_id: participantId, image_id: imageId, comment: comment.trim(),
    });
    if (error && error.code !== PG_UNIQUE_VIOLATION) throw error;
    return json({ ok: true }, 200);
  } catch (err) {
    console.error("Error guardando comentario por imagen:", err);
    return json({ error: "No se pudo guardar el comentario" }, 500);
  }
};
