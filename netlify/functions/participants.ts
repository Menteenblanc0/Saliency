// netlify/functions/participants.ts
//
// Identifica al participante y le dice dónde seguir.
//
// POST { email, consent: true, consentVersion }   ingreso con el correo
//   - Si el correo ya está registrado, devuelve su estado (no se vuelve a
//     pedir ni a guardar la autorización).
//   - Si es nuevo, exige `consent: true` y `consentVersion` (la autorización
//     de tratamiento de datos), y crea al participante con un orden de
//     imágenes mezclado que el SERVIDOR decide y guarda.
// POST { participantId }                           recarga de una pestaña ya identificada
//
// 200 { participantId, order, doneImageIds, completed }
//   order         ids de todas las imágenes activas en el orden de este participante
//   doneImageIds  ids de las imágenes que ya tienen anotación (el progreso se
//                 deduce de `annotations`; no hay un contador aparte)
//   completed     true si ya cerró la encuesta
// 400 correo inválido o falta la autorización · 404 participantId desconocido
//
// El correo se guarda solo en la tabla `participants`; el resto de tablas (y
// los scripts de análisis) usan únicamente el id aleatorio.

import { supabase, json, UUID_RE, PG_UNIQUE_VIOLATION } from "../lib/shared";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_CONSENT_VERSION_LENGTH = 50;
const PAGE_SIZE = 1000;
const COLUMNS = "id, image_order, completed_at";

interface ParticipantRow {
  id: string;
  image_order: unknown;
  completed_at: string | null;
}

function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return null;
  return EMAIL_RE.test(email) ? email : null;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Lee una columna de una tabla por páginas (Supabase devuelve como máximo
// 1000 filas por consulta y trunca en silencio).
async function fetchAll(
  table: string,
  column: string,
  filter?: (q: any) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<string[]> {
  const values: string[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select(column);
    if (filter) query = filter(query);
    const { data, error } = await query
      .order("created_at")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as unknown as Record<string, string>[];
    values.push(...rows.map((r) => r[column]));
    if (rows.length < PAGE_SIZE) return values;
  }
}

// Concilia el orden guardado con las imágenes activas de hoy: se descartan las
// que ya no existen y las nuevas se agregan al final, mezcladas.
function reconcile(stored: string[], active: string[]): string[] {
  const activeSet = new Set(active);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const id of stored) {
    if (activeSet.has(id) && !seen.has(id)) {
      kept.push(id);
      seen.add(id);
    }
  }
  return [...kept, ...shuffle(active.filter((id) => !seen.has(id)))];
}

async function findBy(column: "id" | "email", value: string): Promise<ParticipantRow | null> {
  const { data, error } = await supabase
    .from("participants")
    .select(COLUMNS)
    .eq(column, value)
    .maybeSingle();
  if (error) throw error;
  return data as ParticipantRow | null;
}

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  if (typeof body !== "object" || body === null) return json({ error: "Cuerpo inválido" }, 400);
  const { email, participantId, consent, consentVersion } = body as Record<string, unknown>;

  try {
    const active = await fetchAll("images", "id", (q) => q.eq("active", true));
    let row: ParticipantRow | null;

    if (typeof participantId === "string") {
      if (!UUID_RE.test(participantId)) return json({ error: "participantId inválido" }, 400);
      row = await findBy("id", participantId);
      if (!row) return json({ error: "Participante desconocido" }, 404);
    } else if (typeof email === "string") {
      const normalized = normalizeEmail(email);
      if (!normalized) return json({ error: "Correo inválido" }, 400);

      row = await findBy("email", normalized);
      if (!row) {
        // Primer ingreso: sin autorización de tratamiento de datos no se registra.
        if (
          consent !== true ||
          typeof consentVersion !== "string" ||
          consentVersion.length === 0 ||
          consentVersion.length > MAX_CONSENT_VERSION_LENGTH
        ) {
          return json({ error: "Se requiere la autorización de tratamiento de datos" }, 400);
        }
        const { data, error } = await supabase
          .from("participants")
          .insert({
            email: normalized,
            image_order: shuffle(active),
            consent_version: consentVersion, // consent_at lo pone la base (now())
          })
          .select(COLUMNS)
          .single();
        if (error) {
          if (error.code !== PG_UNIQUE_VIOLATION) throw error;
          row = await findBy("email", normalized); // otro ingreso simultáneo lo creó
          if (!row) throw error;
        } else {
          row = data as ParticipantRow;
        }
      }
    } else {
      return json({ error: "Se requiere email o participantId" }, 400);
    }

    const stored = Array.isArray(row.image_order)
      ? row.image_order.filter((id): id is string => typeof id === "string")
      : [];
    const order = reconcile(stored, active);
    if (JSON.stringify(order) !== JSON.stringify(stored)) {
      const { error } = await supabase.from("participants").update({ image_order: order }).eq("id", row.id);
      if (error) throw error;
    }

    const doneImageIds = await fetchAll("annotations", "image_id", (q) => q.eq("participant_id", row!.id));

    return json(
      { participantId: row.id, order, doneImageIds, completed: row.completed_at !== null },
      200,
    );
  } catch (err) {
    console.error("Error en participants:", err);
    return json({ error: "No se pudo completar la operación" }, 500);
  }
};
