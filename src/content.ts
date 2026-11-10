// Todo el texto visible para el participante vive aquí, en trato de usted.
// Los textos 1 y 2 (instrucciones y calificación) son los oficiales del
// Anexo del plan: no se reescriben.
export const content = {
  intro: {
    badge: "Estudio de atención visual",
    title: "Marque lo que llama su atención",
    // Texto 1 (también se muestra como recordatorio durante el dibujo)
    instructions: [
      "Observe la imagen y marque las zonas que llamen su atención de forma espontánea. Empiece por la que primero llamó su atención y luego señale otras que también lo hagan.",
      "Una zona puede atraer su atención por su color, contraste, tamaño o forma, en términos generales porque sea llamativa con respecto a las demás. No tiene que ser algo que le guste o que considere importante. Marque únicamente las zonas que destaquen y procure seguir sus límites. Puede señalar una o varias; no necesita cubrir toda la imagen ni marcar todos sus elementos.",
    ],
    totalLabel: (n: number) => `${n} imágenes en total`,
    start: "Comenzar",
    pauseNotice:
      "Puede pausar en cualquier momento y continuar después, desde donde quedó, ingresando con el mismo correo electrónico.",
    // PROVISIONAL: reemplazar por el aviso de tratamiento de datos oficial del supervisor.
    dataNotice:
      "Su correo electrónico se usará únicamente para identificar su participación y permitirle continuar más tarde. Sus respuestas se emplearán solo con fines de investigación.",
  },
  email: {
    title: "Ingrese su correo electrónico",
    body: "Lo usaremos para identificar su participación y para que pueda continuar más tarde desde donde quedó.",
    label: "Correo electrónico",
    placeholder: "nombre@correo.com",
    next: "Continuar",
    invalid: "Escriba un correo electrónico válido, por ejemplo nombre@correo.com.",
    networkError: "No se pudo conectar. Revise su conexión e inténtelo de nuevo.",
    confirmTitle: "Confirme su correo",
    confirmBody: "Se usará este correo:",
    confirmHint: "Para continuar más tarde tendrá que ingresar exactamente este mismo correo.",
    confirm: "Confirmar y continuar",
    edit: "Corregir",
    checking: "Verificando...",
    resumeTitle: "Le damos la bienvenida de nuevo",
    resumeBody: (x: number, n: number) => `Continúa en la imagen ${x} de ${n}.`,
    resumeContinue: "Continuar",
  },
  pause: {
    button: "Pausar",
    confirmUnsaved: "Esta imagen aún no se ha guardado y se repetirá cuando vuelva. ¿Desea pausar de todos modos?",
    title: "Participación en pausa",
    progress: (done: number, n: number) => `Ha completado ${done} de ${n} imágenes.`,
    howToReturn:
      "Para continuar más tarde, vuelva a ingresar con el mismo correo electrónico: retomará desde la primera imagen pendiente.",
    backHome: "Volver al inicio",
  },
  annotation: {
    imageOf: (i: number, n: number) => `Imagen ${i} de ${n}`,
    size: "Tamaño",
    brush: "Pincel",
    eraser: "Borrador",
    undo: "Deshacer",
    clear: "Limpiar todo",
    next: "Siguiente →",
    hint: "Dibuje sobre la imagen para continuar",
    showInstructions: "Ver instrucciones",
    hideInstructions: "Ocultar instrucciones",
  },
  canvas: {
    loading: "Cargando imagen…",
    loadError: "No se pudo cargar esta imagen.",
    retry: "Reintentar",
    skip: "Saltar esta imagen",
  },
  // Texto 2
  rating: {
    title: "¿Qué tan bien funciona este diseño como anuncio?",
    intro:
      "Ahora observe la imagen completa y evalúe si comunica su mensaje de manera clara y efectiva. Una imagen publicitaria bien diseñada permite:",
    criteria: [
      { heading: "Comprender el mensaje", text: "se entiende qué se anuncia y cuál es la idea principal." },
      { heading: "Identificar lo esencial", text: "el producto, servicio o mensaje principal se distingue de los elementos secundarios." },
      { heading: "Leer con facilidad", text: "los textos tienen un tamaño y un contraste adecuados." },
      { heading: "Relacionar los elementos", text: "las imágenes, los colores y los textos contribuyen al mensaje." },
      { heading: "Evitar confusiones", text: "la distribución facilita comprender el anuncio, sin elementos que distraigan innecesariamente." },
    ],
    note: "Un anuncio puede ser sencillo o contener varios elementos. Evalúe cómo funcionan en conjunto, más allá de si le gusta su estilo.",
    question: "En conjunto, ¿considera que esta imagen publicitaria está bien diseñada?",
    options: [
      { value: "si", label: "Sí" },
      { value: "no", label: "No" },
      { value: "no_determina", label: "No puedo determinarlo" },
    ],
    criteriaToggle: "Ver criterios de evaluación",
    submit: "Continuar",
    saving: "Guardando...",
    saveError: "No se pudo guardar. Revise su conexión e inténtelo de nuevo.",
  },
  comment: {
    title: "Un último paso",
    body: "Si lo desea, déjenos un comentario sobre el estudio. Es totalmente opcional.",
    label: "Comentario (opcional)",
    placeholder: "Escriba aquí su comentario",
    send: "Enviar y finalizar",
    sending: "Enviando...",
    skip: "Omitir",
    sendError: "No se pudo enviar el comentario. Puede intentarlo de nuevo u omitirlo.",
    finishError: "No se pudo finalizar. Revise su conexión e inténtelo de nuevo.",
  },
  transition: {
    completed: (current: number, total: number) => `${current} / ${total} completadas`,
    preparing: (next: number) => `Preparando imagen ${next}…`,
  },
  complete: {
    title: "Gracias por participar",
    body1: (total: number) =>
      `Ha completado las ${total} imágenes del estudio. Su contribución es valiosa para nuestra investigación.`,
    body2: "Sus respuestas han sido registradas.",
    annotatedLabel: "imágenes anotadas",
    doneLabel: "completado",
  },
  status: {
    loading: "Cargando imágenes…",
    error:
      "No se pudieron cargar las imágenes del estudio. Revise su conexión e inténtelo de nuevo.",
    retry: "Reintentar",
  },
} as const;
