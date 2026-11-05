import type { ImageItem } from "./types";

// Persistencia mínima para retomar la encuesta tras recargar o cerrar la
// pestaña. Usa sessionStorage (misma pestaña y mismo dispositivo) y guarda
// solo un UUID aleatorio, ids de imagen y el progreso: nada personal.
// Todo acceso va en try/catch: si el almacenamiento no está disponible
// (modo privado estricto, bloqueado por el navegador), la encuesta funciona
// igual, simplemente sin poder retomarse.

const KEY = "saliency:session:v1";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SessionData {
  participantId: string;
  order: string[]; // ids de imagen en el orden mezclado de este participante
  index: number; // siguiente imagen por anotar (0 = ninguna guardada aún)
  introSeen: boolean; // ya pulsó "Comenzar"
  completed: boolean; // ya terminó (incluido el paso del comentario)
}

function isValid(d: unknown): d is SessionData {
  if (typeof d !== "object" || d === null) return false;
  const s = d as Record<string, unknown>;
  return (
    typeof s.participantId === "string" &&
    UUID_RE.test(s.participantId) &&
    Array.isArray(s.order) &&
    s.order.every((id) => typeof id === "string") &&
    typeof s.index === "number" &&
    Number.isInteger(s.index) &&
    s.index >= 0 &&
    s.index <= s.order.length &&
    typeof s.introSeen === "boolean" &&
    typeof s.completed === "boolean"
  );
}

export function loadSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    return isValid(data) ? data : null; // datos corruptos o manipulados: se ignoran
  } catch {
    return null;
  }
}

export function saveSession(data: SessionData): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // sin almacenamiento: la encuesta sigue funcionando sin persistencia
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ídem
  }
}

// Reordena las imágenes que devolvió el servidor según el orden guardado.
// - Los ids guardados que ya no existen se descartan, y el índice se
//   corrige para seguir apuntando a la misma imagen pendiente.
// - Las imágenes nuevas (que no estaban en el orden guardado) van al final,
//   en el orden en que llegan (el llamador las mezcla antes).
export function applySession(
  images: ImageItem[],
  saved: SessionData,
): { ordered: ImageItem[]; index: number } {
  const byId = new Map(images.map((img) => [img.id, img]));
  const ordered: ImageItem[] = [];
  const used = new Set<string>();
  let index = saved.index;

  saved.order.forEach((id, position) => {
    const img = byId.get(id);
    if (img && !used.has(id)) {
      ordered.push(img);
      used.add(id);
    } else if (position < saved.index) {
      index -= 1; // una imagen anterior al progreso desapareció (o venía repetida)
    }
  });

  for (const img of images) {
    if (!used.has(img.id)) ordered.push(img);
  }

  return { ordered, index: Math.min(Math.max(index, 0), ordered.length) };
}
