// Datos del aviso de tratamiento de datos personales (Ley 1581 de 2012, Colombia).
//
// ANTES DE ABRIR EL ESTUDIO hay que completar `responsable` y `contacto`: la
// ley exige identificar al responsable del tratamiento y dar un canal de
// contacto. El build de producción en Netlify FALLA mientras sigan los
// marcadores [COMPLETAR…] (ver vite.config.ts), para no publicar el aviso a medias.
//
// Cada vez que cambie el texto del aviso (src/content.ts, bloque `privacy`)
// hay que cambiar `version`: se guarda con la fecha de cada autorización
// (participants.consent_version / consent_at) como prueba de qué texto aceptó.
export const PRIVACY = {
  version: "2026-11-v1",
  responsable:
    "Christopher Alexandro Morán Rodríguez",
  contacto:
    "cmoran@universidad.edu.co",
} as const;

export const privacyIsComplete = (): boolean =>
  !PRIVACY.responsable.includes("[COMPLETAR") && !PRIVACY.contacto.includes("[COMPLETAR");
