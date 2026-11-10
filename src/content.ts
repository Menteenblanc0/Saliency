import { PRIVACY } from "./privacy";

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
    dataNotice:
      "Para participar se le pedirá su correo electrónico y su autorización para tratar sus datos. Su participación es voluntaria.",
  },
  // Aviso y autorización de tratamiento de datos personales (Ley 1581 de 2012).
  // Si cambia este texto, cambie también PRIVACY.version en src/privacy.ts.
  privacy: {
    toggle: "Ver aviso completo de tratamiento de datos",
    title: "Autorización para el tratamiento de datos personales",
    intro: "Antes de continuar, lea cómo se tratarán sus datos.",
    sections: [
      {
        heading: "Responsable del tratamiento",
        text: `${PRIVACY.responsable}. Contacto para consultas, reclamos y solicitudes: ${PRIVACY.contacto}.`,
      },
      {
        heading: "Datos que se recolectan",
        text: "Su correo electrónico y sus respuestas en el estudio: las zonas que marca en cada imagen, su calificación de cada diseño y, si lo desea, un comentario final. No se le piden datos sensibles ni su nombre; le pedimos no incluir datos personales de terceros ni información sensible en el comentario. Los servicios de alojamiento pueden registrar datos técnicos de conexión necesarios para su funcionamiento.",
      },
      {
        heading: "Finalidad",
        text: "Su correo se usa únicamente para identificar su participación y permitirle pausar y continuar después. Sus respuestas se analizan con fines de investigación científica y estadística, incluida la construcción de modelos de inteligencia artificial sobre atención visual y diseño de anuncios; los análisis se hacen con un identificador aleatorio, sin su correo.",
      },
      {
        heading: "Carácter voluntario",
        text: "Su participación y esta autorización son voluntarias. Si no la otorga, no podrá participar. Puede dejar el estudio en cualquier momento.",
      },
      {
        heading: "Sus derechos",
        text: `Como titular de los datos puede conocerlos, actualizarlos y rectificarlos; solicitar prueba de esta autorización; ser informado del uso que se les ha dado; acceder a ellos de forma gratuita; revocar la autorización y solicitar la supresión de su correo y de sus datos; y presentar quejas ante la Superintendencia de Industria y Comercio. Para ejercer estos derechos escriba a ${PRIVACY.contacto}.`,
      },
      {
        heading: "Conservación",
        text: "Su correo se conservará mientras dure el estudio y se eliminará o se desvinculará de sus respuestas al finalizar este o cuando usted lo solicite.",
      },
      {
        heading: "Personas mayores de edad",
        text: "Este estudio está dirigido a personas mayores de 18 años.",
      },
      {
        heading: "Almacenamiento",
        text: "Los datos se guardan en servicios de infraestructura en la nube de terceros (Supabase y Netlify), que pueden estar ubicados fuera de Colombia. Al autorizar, usted acepta este almacenamiento.",
      },
    ],
    consentLabel:
      "Soy mayor de 18 años, he leído el aviso de tratamiento de datos y autorizo de forma previa, expresa e informada el tratamiento de mi correo electrónico y de mis respuestas para las finalidades indicadas.",
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
