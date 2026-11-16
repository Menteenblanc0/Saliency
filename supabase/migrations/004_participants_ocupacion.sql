-- Migración 004: reserva un campo opcional para carrera académica o cargo laboral.
-- Ejecutar manualmente en Supabase SQL Editor (esquema public).
-- No requiere cambios en Netlify ni en el formulario actual.
-- No borra ni reemplaza datos existentes; se puede ejecutar de nuevo.

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS ocupacion TEXT;

COMMENT ON COLUMN public.participants.ocupacion IS
  'Carrera académica o cargo laboral declarado voluntariamente por el participante; opcional y sin uso en el registro actual.';
