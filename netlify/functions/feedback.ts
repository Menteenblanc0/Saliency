// netlify/functions/feedback.ts
//
// Recibe POST con { participantId, comment } y guarda el comentario
// final opcional en la tabla `feedback` (una fila por participante).
// Un segundo envío del mismo participante se ignora y cuenta como éxito.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_COMMENT_LENGTH = 2000;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

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
