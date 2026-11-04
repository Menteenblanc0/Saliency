// Todo el texto visible para el participante vive aquí.
// (Por ahora son los textos actuales; T3 los reemplaza por los oficiales.)
export const content = {
  welcome: {
    badge: "Estudio de atención visual",
    title: "Indícanos qué es lo primero que ves",
    intro1:
      "Se te mostrará una serie de imágenes de forma individual. Usando el pincel, marca la zona que primero captó tu atención al verla.",
    intro2: "No hay respuestas correctas o incorrectas. Confía en tu primera impresión.",
    totalLabel: (n: number) => `${n} imágenes en total`,
    start: "Comenzar",
    footer: "Participación anónima · Datos usados solo con fines de investigación",
  },
  annotation: {
    imageOf: (i: number, n: number) => `Imagen ${i} de ${n}`,
    size: "Tamaño",
    brush: "Pincel",
    eraser: "Borrador",
    undo: "Deshacer",
    clear: "Limpiar todo",
    next: "Siguiente →",
    finish: "Finalizar",
    saving: "Guardando...",
    hint: "Dibuja sobre la imagen para continuar",
    saveError: "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.",
  },
  canvas: {
    loading: "Cargando imagen…",
    loadError: "No se pudo cargar esta imagen.",
    retry: "Reintentar",
    skip: "Saltar esta imagen",
  },
  transition: {
    completed: (current: number, total: number) => `${current} / ${total} completadas`,
    preparing: (next: number) => `Preparando imagen ${next}…`,
  },
  complete: {
    title: "Gracias por participar",
    body1: (total: number) =>
      `Has completado las ${total} imágenes del estudio. Tu contribución es valiosa para nuestra investigación.`,
    body2: "Los datos han sido registrados de forma anónima.",
    annotatedLabel: "imágenes anotadas",
    doneLabel: "completado",
    restart: "Volver al inicio",
  },
  status: {
    loading: "Cargando imágenes…",
    error:
      "No se pudieron cargar las imágenes del estudio. Revisa tu conexión e inténtalo de nuevo.",
    retry: "Reintentar",
  },
} as const;
