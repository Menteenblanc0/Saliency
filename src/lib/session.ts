// Lo único que se guarda en el navegador es el identificador del participante
// (un UUID que entrega el servidor al ingresar el correo), para que recargar
// la pestaña no vuelva a pedir el correo. Todo lo demás (orden de las
// imágenes y progreso) vive en el servidor. Se limpia al pausar y al terminar.
//
// Usa sessionStorage (misma pestaña) y todo acceso va en try/catch: si el
// almacenamiento no está disponible, la encuesta funciona igual, pero cada
// recarga vuelve a pedir el correo.

const KEY = "saliency:session:v2";
const LEGACY_KEY = "saliency:session:v1"; // versión anterior (orden e índice en el navegador)

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function loadParticipantId(): string | null {
  try {
    sessionStorage.removeItem(LEGACY_KEY);
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return null;
    const id = (data as Record<string, unknown>).participantId;
    return typeof id === "string" && UUID_RE.test(id) ? id : null; // corrupto o manipulado: se ignora
  } catch {
    return null;
  }
}

export function saveParticipantId(participantId: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ participantId }));
  } catch {
    // sin almacenamiento: la encuesta sigue funcionando sin persistencia
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(LEGACY_KEY);
  } catch {
    // ídem
  }
}
