// Utilidades compartidas por las funciones de Netlify.
//
// SUPABASE_SERVICE_ROLE_KEY tiene permisos totales sobre la base de datos:
// vive SOLO aquí (código que corre en el servidor de Netlify) y nunca en el
// frontend ni en variables que empiecen con VITE_.

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PG_UNIQUE_VIOLATION = "23505";

export function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ¿Existe un participante registrado con ese id? Lanza si la consulta falla.
export async function participantExists(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("participants")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}
