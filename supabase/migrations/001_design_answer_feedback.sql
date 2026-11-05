-- Migración 001: respuesta de diseño por imagen y comentario final.
-- Se corre a mano en Supabase -> SQL Editor, ANTES de desplegar el código nuevo.
-- Es repetible (se puede correr más de una vez sin error).

alter table annotations
  add column if not exists design_answer text
  check (design_answer in ('si', 'no', 'no_determina'));

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null,
  comment text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_feedback_participant
  on feedback (participant_id);

alter table feedback enable row level security;

-- Si alguna vez se corrió una versión con la columna "rating":
-- alter table annotations drop column if exists rating;
