// netlify/functions/images.ts
//
// Devuelve la lista completa de imágenes activas del estudio, leídas
// de la tabla `images` en Supabase. El orden aleatorio NO se decide
// aquí -- se mezcla en el frontend, una vez por sesión, para que cada
// participante vea sus imágenes en un orden distinto.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async (req: Request) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase
    .from("images")
    .select("id, url, alt")
    .eq("active", true);

  if (error) {
    console.error("Error obteniendo imágenes:", error);
    return new Response(
      JSON.stringify({ error: "No se pudieron obtener las imágenes" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ images: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
