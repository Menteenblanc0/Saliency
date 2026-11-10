// netlify/functions/annotations.ts
//
// Recibe POST desde el frontend con
// { participantId, imageId, strokes, designAnswer }
// y lo inserta en la tabla `annotations` de Supabase. El participante debe
// estar registrado (función `participants`).
//
// El guardado es idempotente: si la anotación de ese participante para
// esa imagen ya existe, se responde 200 con { duplicate: true }.

import { supabase, json, UUID_RE, PG_UNIQUE_VIOLATION, participantExists } from "../lib/shared";

const DESIGN_ANSWERS = ["si", "no", "no_determina"];
const MAX_STROKES = 300;
const MAX_POINTS_PER_STROKE = 5000;

const isUnit = (n: unknown): boolean =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;

// Devuelve un mensaje de error si el payload no es válido, o null si lo es.
function validate(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return "Cuerpo inválido";
  const { participantId, imageId, strokes, designAnswer } = body as Record<
    string,
    unknown
  >;

  if (typeof participantId !== "string" || !UUID_RE.test(participantId)) {
    return "participantId inválido";
  }
  if (typeof imageId !== "string" || !UUID_RE.test(imageId)) {
    return "imageId inválido";
  }
  if (
    typeof designAnswer !== "string" ||
    !DESIGN_ANSWERS.includes(designAnswer)
  ) {
    return "designAnswer inválido";
  }
  if (
    !Array.isArray(strokes) ||
    strokes.length === 0 ||
    strokes.length > MAX_STROKES
  ) {
    return `strokes debe tener entre 1 y ${MAX_STROKES} trazos`;
  }

  let hasBrush = false;
  for (const s of strokes) {
    if (typeof s !== "object" || s === null) return "Trazo inválido";
    const { tool, size, points } = s as Record<string, unknown>;
    if (tool !== "brush" && tool !== "eraser") return "tool inválido";
    if (tool === "brush") hasBrush = true;
    if (!isUnit(size) || (size as number) === 0) {
      return "size debe estar entre 0 (exclusivo) y 1";
    }
    if (!Array.isArray(points) || points.length > MAX_POINTS_PER_STROKE) {
      return `Cada trazo admite como máximo ${MAX_POINTS_PER_STROKE} puntos`;
    }
    for (const p of points) {
      if (typeof p !== "object" || p === null) return "Punto inválido";
      const { x, y } = p as Record<string, unknown>;
      if (!isUnit(x) || !isUnit(y)) return "Coordenadas fuera del rango 0 a 1";
    }
  }
  if (!hasBrush) return "Se requiere al menos un trazo de pincel";

  return null;
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

  const invalid = validate(body);
  if (invalid) return json({ error: invalid }, 400);

  const { participantId, imageId, strokes, designAnswer } = body as {
    participantId: string;
    imageId: string;
    strokes: unknown[];
    designAnswer: string;
  };

  // Solo se aceptan respuestas de participantes registrados (tabla participants).
  try {
    if (!(await participantExists(participantId))) {
      return json({ error: "participante no registrado" }, 400);
    }
  } catch (err) {
    console.error("Error comprobando al participante:", err);
    return json({ error: "No se pudo guardar" }, 500);
  }

  // La imagen debe existir en el catálogo del estudio.
  const { data: image, error: imageError } = await supabase
    .from("images")
    .select("id")
    .eq("id", imageId)
    .maybeSingle();

  if (imageError) {
    console.error("Error comprobando la imagen:", imageError);
    return json({ error: "No se pudo guardar" }, 500);
  }
  if (!image) return json({ error: "imageId no existe" }, 400);

  const { error } = await supabase.from("annotations").insert({
    participant_id: participantId,
    image_id: imageId,
    strokes,
    design_answer: designAnswer,
  });

  if (error) {
    // Ya existía una anotación de este participante para esta imagen
    // (por ejemplo, un reintento tras perder la respuesta): es un éxito.
    if (error.code === PG_UNIQUE_VIOLATION) {
      return json({ ok: true, duplicate: true }, 200);
    }
    console.error("Error guardando anotación:", error);
    return json({ error: "No se pudo guardar" }, 500);
  }

  return json({ ok: true }, 200);
};
