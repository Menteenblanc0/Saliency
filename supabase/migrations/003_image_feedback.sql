-- Ejecutar en Supabase SQL Editor ANTES de desplegar la aplicación.
-- No modifica la tabla feedback de comentarios anteriores.
create table if not exists public.image_feedback (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id),
  image_id uuid not null references public.images(id),
  comment text not null check (char_length(btrim(comment)) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint image_feedback_participant_image_unique unique (participant_id, image_id)
);

alter table public.image_feedback enable row level security;
-- Sin políticas públicas: escritura únicamente mediante Netlify con service role.
