// Evita publicar a producción el aviso de tratamiento de datos a medias.
// Netlify define CONTEXT=production solo en el deploy de producción; en local
// y en deploys de prueba (deploy-preview, branch-deploy) no bloquea nada.
//
// Solo se revisan los VALORES de `responsable` y `contacto` (no el archivo
// entero), porque los comentarios y `privacyIsComplete()` mencionan el
// marcador [COMPLETAR…] a propósito.
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./src/privacy.ts", import.meta.url), "utf8");

const fieldValue = (name) => {
  const match = source.match(new RegExp(`\\b${name}\\s*:\\s*(["'\`])([\\s\\S]*?)\\1`));
  return match ? match[2].trim() : null;
};

const missing = ["responsable", "contacto"].filter((name) => {
  const value = fieldValue(name);
  return !value || value.includes("[COMPLETAR");
});

if (process.env.CONTEXT === "production" && missing.length > 0) {
  console.error(
    `\nERROR: falta completar ${missing.map((n) => `\`${n}\``).join(" y ")} en src/privacy.ts.\n` +
      "El aviso de tratamiento de datos debe identificar al responsable y dar un contacto\n" +
      "antes de abrir el estudio. Complételos y vuelva a desplegar.\n",
  );
  process.exit(1);
}
