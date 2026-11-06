"""
generar_puntajes.py

Se conecta a Supabase y calcula, por cada imagen del estudio, el puntaje
de diseño que le dieron los participantes ("¿está bien diseñada esta
imagen publicitaria?": Sí / No / No puedo determinarlo).

Cómo se calcula:
  - La base de datos guarda el texto crudo de la respuesta
    (annotations.design_answer). El paso a número se hace SOLO aquí, con el
    diccionario PUNTAJE_POR_RESPUESTA de abajo: para cambiar el mapeo basta
    editar una línea de ese diccionario.
  - puntaje_promedio = promedio simple de todas las respuestas de la imagen
    (los "No puedo determinarlo" cuentan con su valor, 0.5 por defecto).
  - desviacion_estandar = desviación estándar MUESTRAL (n - 1). Con una sola
    respuesta no se puede calcular y queda vacía.
  - Solo cuentan las anotaciones con design_answer no nulo (las anteriores a
    la migración, sin respuesta, se ignoran).

Salida: puntajes/puntajes_por_imagen.csv (UTF-8, separador coma, punto
decimal), con una fila por imagen del catálogo:
    image_id, url, alt, n, n_si, n_no, n_no_determina,
    puntaje_promedio, desviacion_estandar
Las imágenes sin respuestas aparecen con n = 0 y los dos campos de
puntaje vacíos.

Requisitos (instalar una sola vez):
    pip install -r requirements.txt

Uso:
    1. Crea un archivo ".env" en esta misma carpeta con:
         SUPABASE_URL=https://tu-proyecto.supabase.co
         SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
    2. Corre: python generar_puntajes.py
"""

import csv
import math
import os
import sys

from supabase_utils import iterar_paginas, traer_todo

# Respuesta guardada -> puntaje. Cambiar el mapeo es cambiar este diccionario.
PUNTAJE_POR_RESPUESTA = {
    "si": 1.0,
    "no": 0.0,
    "no_determina": 0.5,
}

OUTPUT_DIR = "puntajes"
OUTPUT_FILE = "puntajes_por_imagen.csv"
COLUMNAS = [
    "image_id",
    "url",
    "alt",
    "n",
    "n_si",
    "n_no",
    "n_no_determina",
    "puntaje_promedio",
    "desviacion_estandar",
]


def calcular_fila(imagen, respuestas):
    """Una fila del CSV a partir de la imagen y la lista de respuestas crudas."""
    n = len(respuestas)
    fila = {
        "image_id": imagen["id"],
        "url": imagen["url"],
        "alt": imagen.get("alt") or "",
        "n": n,
        "n_si": respuestas.count("si"),
        "n_no": respuestas.count("no"),
        "n_no_determina": respuestas.count("no_determina"),
        "puntaje_promedio": "",
        "desviacion_estandar": "",
    }
    if n == 0:
        return fila

    valores = [PUNTAJE_POR_RESPUESTA[r] for r in respuestas]
    promedio = sum(valores) / n
    fila["puntaje_promedio"] = round(promedio, 4)
    if n >= 2:
        varianza = sum((v - promedio) ** 2 for v in valores) / (n - 1)
        fila["desviacion_estandar"] = round(math.sqrt(varianza), 4)
    return fila


def crear_cliente():
    from dotenv import load_dotenv
    from supabase import create_client

    load_dotenv()  # lee SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del .env
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def main(cliente=None):
    supabase = cliente or crear_cliente()

    imagenes = traer_todo(supabase, "images", "id, url, alt")
    respuestas_por_imagen = {str(img["id"]): [] for img in imagenes}
    huerfanas = 0
    desconocidas = 0

    # Solo image_id y design_answer (filas pequeñas), por páginas de 1000.
    paginas = iterar_paginas(
        supabase,
        "annotations",
        "image_id, design_answer",
        filtro=lambda q: q.not_.is_("design_answer", "null"),
    )
    for pagina in paginas:
        for fila in pagina:
            respuesta = fila["design_answer"]
            if respuesta not in PUNTAJE_POR_RESPUESTA:
                desconocidas += 1
                continue
            lista = respuestas_por_imagen.get(str(fila["image_id"]))
            if lista is None:
                huerfanas += 1  # anotación de una imagen que ya no está en el catálogo
                continue
            lista.append(respuesta)

    filas = [calcular_fila(img, respuestas_por_imagen[str(img["id"])]) for img in imagenes]

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    ruta = os.path.join(OUTPUT_DIR, OUTPUT_FILE)
    with open(ruta, "w", newline="", encoding="utf-8") as f:
        escritor = csv.DictWriter(f, fieldnames=COLUMNAS)
        escritor.writeheader()
        escritor.writerows(filas)

    con_datos = sum(1 for f in filas if f["n"] > 0)
    print(f"{len(filas)} imágenes ({con_datos} con respuestas) -> {ruta}")
    if huerfanas:
        print(f"AVISO: {huerfanas} respuesta(s) de imágenes que ya no están en el catálogo se ignoraron.", file=sys.stderr)
    if desconocidas:
        print(f"AVISO: {desconocidas} respuesta(s) con un valor fuera de {list(PUNTAJE_POR_RESPUESTA)} se ignoraron.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
