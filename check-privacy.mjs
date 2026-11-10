// Evita publicar a producción el aviso de tratamiento de datos a medias.
// Netlify define CONTEXT=production solo en el deploy de producción; en local
// y en deploys de prueba (deploy-preview, branch-deploy) no bloquea nada.
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./src/privacy.ts", import.meta.url), "utf8");
if (process.env.CONTEXT === "production" && source.includes("[COMPLETAR")) {
  console.error(
    "\nERROR: falta completar `responsable` y `contacto` en src/privacy.ts.\n" +
      "El aviso de tratamiento de datos debe identificar al responsable y dar un contacto\n" +
      "antes de abrir el estudio. Complételos y vuelva a desplegar.\n",
  );
  process.exit(1);
}
