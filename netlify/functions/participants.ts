// Identifica al participante por correo o por el id guardado en la pestaña.
// El orden de imágenes y el progreso se recuperan siempre desde Supabase.
import { supabase, json, UUID_RE, PG_UNIQUE_VIOLATION } from "../lib/shared";
import { reconcileOrder } from "./utils/participants-utils";

type ParticipantRow = {
  id: string;
  image_order: string[] | null;
  completed_at: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length > 0 && email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

async function activeImageIds(): Promise<string[]> {
  const { data, error } = await supabase.from("images").select("id").eq("active", true);
  if (error) throw error;
  return (data ?? []).map((image) => image.id as string);
}

async function getParticipant(column: "id" | "email", value: string): Promise<ParticipantRow | null> {
  const { data, error } = await supabase
    .from("participants")
    .select("id, image_order, completed_at")
    .eq(column, value)
    .maybeSingle();
  if (error) throw error;
  return data as ParticipantRow | null;
}

async function loadState(participant: ParticipantRow) {
  const ids = await activeImageIds();
  const previousOrder = Array.isArray(participant.image_order) ? participant.image_order : [];
  const order = reconcileOrder(previousOrder, ids);
  if (JSON.stringify(order) !== JSON.stringify(previousOrder)) {
    const { error } = await supabase
      .from("participants")
      .update({ image_order: order })
      .eq("id", participant.id);
    if (error) throw error;
  }

  const { data: annotations, error } = await supabase
    .from("annotations")
    .select("image_id")
    .eq("participant_id", participant.id);
  if (error) throw error;

  return {
    participantId: participant.id,
    order,
    doneImageIds: [...new Set((annotations ?? []).map((entry) => entry.image_id as string))],
    completed: participant.completed_at !== null,
  };
}

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ code: "INVALID_REQUEST", error: "JSON inválido" }, 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return json({ code: "INVALID_REQUEST", error: "Solicitud inválida" }, 400);
  }

  const input = body as Record<string, unknown>;
  const byId = Object.prototype.hasOwnProperty.call(input, "participantId");
  const byEmail = Object.prototype.hasOwnProperty.call(input, "email");
  if (byId === byEmail) {
    return json({ code: "INVALID_REQUEST", error: "Indique correo o identificador" }, 400);
  }

  if (byId && (typeof input.participantId !== "string" || !UUID_RE.test(input.participantId))) {
    return json({ code: "INVALID_REQUEST", error: "Identificador inválido" }, 400);
  }
  const email = byEmail ? normalizeEmail(input.email) : null;
  if (byEmail && !email) {
    return json({ code: "INVALID_EMAIL", error: "Correo inválido" }, 400);
  }

  try {
    let participant: ParticipantRow | null;
    if (byId) {
      participant = await getParticipant("id", input.participantId as string);
      if (!participant) return json({ code: "NOT_FOUND", error: "Participante desconocido" }, 404);
    } else {
      participant = await getParticipant("email", email!);
      if (!participant) {
        if (input.consent !== true || typeof input.consentVersion !== "string" || !input.consentVersion.trim()) {
          return json({ code: "CONSENT_REQUIRED", error: "Se requiere la autorización" }, 400);
        }
        const order = reconcileOrder([], await activeImageIds());
        const { data: created, error } = await supabase
          .from("participants")
          .insert({ email, image_order: order, consent_version: input.consentVersion })
          .select("id, image_order, completed_at")
          .single();
        if (error) {
          // Dos pestañas pueden intentar registrar simultáneamente el mismo correo.
          if (error.code !== PG_UNIQUE_VIOLATION) throw error;
          participant = await getParticipant("email", email!);
          if (!participant) throw error;
        } else {
          participant = created as ParticipantRow;
        }
      }
    }
    return json(await loadState(participant), 200);
  } catch (err) {
    console.error("Error identificando al participante:", err);
    return json({ code: "SERVER_ERROR", error: "No se pudo identificar al participante" }, 500);
  }
};
