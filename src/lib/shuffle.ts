// Mezcla el orden de las imágenes (Fisher-Yates) -- se usa una sola
// vez por sesión, cuando llegan del backend, para que cada
// participante las vea en un orden distinto.
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
