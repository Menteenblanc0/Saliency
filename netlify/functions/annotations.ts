// netlify/functions/annotations.ts
//
// Recibe POST desde el frontend con { participantId, imageId, strokes }
// y lo inserta en la tabla `annotations` de Supabase.
//
// SUPABASE_SERVICE_ROLE_KEY tiene permisos totales sobre la base de
// datos -- por eso vive SOLO aquí (una función que corre en el
// servidor de Netlify) y nunca en el código del frontend ni en
// variables que empiecen con VITE_ (esas sí terminan en el bundle
// público del navegador).

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  tool: "brush" | "eraser";
  size: number;
  points: Point[];
}

interface AnnotationPayload {
  participantId: string;
  imageId: string;
  strokes: Stroke[];
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: AnnotationPayload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { participantId, imageId, strokes } = body;

  // Validación mínima: sin esto, cualquier request mal formado
  // (o malicioso) podría llenar la tabla de basura.
  if (
    typeof participantId !== "string" ||
    typeof imageId !== "string" ||
    !Array.isArray(strokes) ||
    strokes.length === 0
  ) {
    return new Response(
      JSON.stringify({
        error: "Faltan o son inválidos participantId, imageId o strokes",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const validPoints = strokes.every(
    (s) =>
      (s.tool === "brush" || s.tool === "eraser") &&
      typeof s.size === "number" &&
      Array.isArray(s.points) &&
      s.points.every(
        (p) => typeof p.x === "number" && typeof p.y === "number",
      ),
  );

  if (!validPoints) {
    return new Response(
      JSON.stringify({ error: "Estructura de strokes inválida" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { error } = await supabase.from("annotations").insert({
    participant_id: participantId,
    image_id: imageId,
    strokes,
  });

  if (error) {
    console.error("Error guardando anotación:", error);
    return new Response(JSON.stringify({ error: "No se pudo guardar" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
