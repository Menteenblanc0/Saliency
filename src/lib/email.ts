// Normalización y validación básica del correo: se recorta, se pasa a
// minúsculas y se comprueba un formato mínimo (algo@dominio.ext) y el largo
// máximo de un correo (254). No se verifica que el correo exista.
const MAX_EMAIL_LENGTH = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return null;
  return EMAIL_RE.test(email) ? email : null;
}
