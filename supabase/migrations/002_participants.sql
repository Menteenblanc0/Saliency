-- Migración 002: participantes identificados por correo (con autorización de
-- tratamiento de datos). Se corre a mano en Supabase -> SQL Editor, ANTES de
-- desplegar el código nuevo. Es repetible.
--
-- El correo vive SOLO en esta tabla. `annotations` y `feedback` solo conocen
-- el id aleatorio del participante, y los scripts de análisis nunca leen el
-- correo.

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  -- correo normalizado (sin espacios y en minúsculas, máximo 254 caracteres)
  email text not null check (email = lower(btrim(email)) and char_length(email) <= 254),
  -- ids de imagen en el orden de este participante (lo decide el servidor)
  image_order jsonb not null default '[]'::jsonb,
  -- prueba de la autorización de tratamiento de datos: cuándo y con qué versión del aviso
  consent_version text not null,
  consent_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_participants_email on participants (email);

-- Sin políticas: solo la service_role (las funciones de Netlify) puede leer o escribir.
alter table participants enable row level security;

-- Las respuestas solo se aceptan de participantes registrados. "not valid" no
-- revisa las filas que ya existían (p. ej. datos de prueba con ids sueltos),
-- pero sí exige el vínculo en todo lo que se guarde desde ahora.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_annotations_participant') then
    alter table annotations
      add constraint fk_annotations_participant
      foreign key (participant_id) references participants (id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fk_feedback_participant') then
    alter table feedback
      add constraint fk_feedback_participant
      foreign key (participant_id) references participants (id) not valid;
  end if;
end $$;
