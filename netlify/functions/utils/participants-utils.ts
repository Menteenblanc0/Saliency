/**
 * Normaliza un correo electrónico eliminando espacios y convirtiendo a minúsculas.
 * Trunca a 254 caracteres si supera el límite de especificación RFC 5321.
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  const trimmed = email.trim().toLowerCase();
  return trimmed.slice(0, 254);
}

/**
 * Reconcilia la lista guardada de orden de imágenes de un participante
 * comparándola con la lista actual de imágenes activas en la BD.
 *
 * 1. Mantiene el orden previo para las imágenes que siguen activas.
 * 2. Descarta las imágenes que ya no están activas/existentes.
 * 3. Mezcla aleatoriamente las nuevas imágenes activas y las agrega al final.
 */
export function reconcileOrder(savedOrder: string[], activeImageIds: string[]): string[] {
  const activeSet = new Set(activeImageIds);

  const validSaved = savedOrder.filter((id) => activeSet.has(id));
  const validSavedSet = new Set(validSaved);

  const newIds = activeImageIds.filter((id) => !validSavedSet.has(id));

  const shuffledNew = [...newIds];
  for (let i = shuffledNew.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledNew[i], shuffledNew[j]] = [shuffledNew[j], shuffledNew[i]];
  }

  return [...validSaved, ...shuffledNew];
}
