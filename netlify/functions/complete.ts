// netlify/functions/complete.ts
//
// POST { participantId }: marca la encuesta de ese participante como
// completada. Es idempotente: llamarla de nuevo responde 200 sin cambiar nada.
// Al volver a ingresar con su correo, quien ya completó ve la pantalla final.

import { supabase, json, UUID_RE, participantExists } from "../lib/shared";

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  const participantId =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>).participantId : undefined;
  if (typeof participantId !== "string" || !UUID_RE.test(participantId)) {
    return json({ error: "participantId inválido" }, 400);
  }

  try {
    if (!(await participantExists(participantId))) return json({ error: "Participante desconocido" }, 404);

    // Solo se escribe la primera vez: conserva la fecha original de cierre.
    const { error } = await supabase
      .from("participants")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", participantId)
      .is("completed_at", null);
    if (error) throw error;
    return json({ ok: true }, 200);
  } catch (err) {
    console.error("Error en complete:", err);
    return json({ error: "No se pudo completar la operación" }, 500);
  }
};
