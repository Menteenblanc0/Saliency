"""
generar_mapas_calor.py

Se conecta a Supabase, trae todas las imágenes y anotaciones guardadas,
y genera un mapa de calor por imagen a partir de la PRIMERA zona que
marcó cada participante (el primer trazo de tipo "brush" de cada
anotación).

Requisitos (instalar una sola vez):
    pip install supabase pillow numpy matplotlib requests python-dotenv

Uso:
    1. Crea un archivo ".env" en esta misma carpeta con:
         SUPABASE_URL=https://tu-proyecto.supabase.co
         SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
       (son los mismos valores que ya usas en el proyecto de Netlify)
    2. Corre: python generar_mapas_calor.py
    3. Revisa la carpeta "mapas_calor/" que se crea junto al script.
"""

import io
import json
import os
from collections import defaultdict

import matplotlib as mpl
import numpy as np
import requests
from dotenv import load_dotenv
from PIL import Image
from supabase import create_client

load_dotenv()  # lee SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del .env

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

OUTPUT_DIR = "mapas_calor"
HEATMAP_ALPHA = 0.55        # qué tan opaco se ve el mapa de calor sobre la imagen (0-1)
BLOB_RADIUS_FACTOR = 1.0    # multiplicador sobre el tamaño (ya normalizado) del pincel


def obtener_datos(supabase):
    """Trae todas las imágenes activas y todas las anotaciones guardadas."""
    imagenes = (
        supabase.table("images").select("id, url, alt").eq("active", True).execute().data
    )
    anotaciones = (
        supabase.table("annotations")
        .select("image_id, participant_id, strokes")
        .execute()
        .data
    )
    return imagenes, anotaciones


def agrupar_por_imagen(anotaciones):
    por_imagen = defaultdict(list)
    for fila in anotaciones:
        por_imagen[fila["image_id"]].append(fila)
    return por_imagen


def descargar_imagen(url):
    resp = requests.get(url, timeout=20)
    resp.raise_for_status()
    return Image.open(io.BytesIO(resp.content)).convert("RGB")


def construir_densidad(anotaciones_imagen, ancho, alto):
    """
    Acumula, por cada participante, únicamente su PRIMER trazo de tipo
    "brush" -- ignora el borrador y cualquier trazo posterior, que es
    justo el propósito del estudio (la primera zona que miró).
    """
    densidad = np.zeros((alto, ancho), dtype=np.float64)
    yy, xx = np.mgrid[0:alto, 0:ancho]

    for fila in anotaciones_imagen:
        strokes = fila["strokes"]
        primer_trazo = next((s for s in strokes if s.get("tool") == "brush"), None)
        if primer_trazo is None:
            continue

        radio_norm = primer_trazo.get("size", 0.02) * BLOB_RADIUS_FACTOR
        radio_px = max(radio_norm * ancho, 4)  # mínimo unos pocos píxeles

        for punto in primer_trazo["points"]:
            cx = punto["x"] * ancho
            cy = punto["y"] * alto
            # "mancha" gaussiana centrada en cada punto del trazo
            densidad += np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * radio_px ** 2)))

    return densidad


def superponer_mapa_calor(imagen_original, densidad):
    densidad_norm = densidad / densidad.max() if densidad.max() > 0 else densidad

    colormap = mpl.colormaps["inferno"]
    color_rgba = (colormap(densidad_norm) * 255).astype(np.uint8)
    capa_calor = Image.fromarray(color_rgba, mode="RGBA")

    alpha_mask = Image.fromarray((densidad_norm * 255 * HEATMAP_ALPHA).astype(np.uint8))
    capa_calor.putalpha(alpha_mask)

    base = imagen_original.convert("RGBA")
    return Image.alpha_composite(base, capa_calor)


def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    imagenes, anotaciones = obtener_datos(supabase)
    anotaciones_por_imagen = agrupar_por_imagen(anotaciones)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    resumen = []

    for img in imagenes:
        anotaciones_imagen = anotaciones_por_imagen.get(img["id"], [])
        n = len(anotaciones_imagen)
        print(f"Imagen {img['id']}: {n} participante(s)")

        if n == 0:
            resumen.append({"image_id": img["id"], "url": img["url"], "participantes": 0})
            continue

        imagen_original = descargar_imagen(img["url"])
        ancho, alto = imagen_original.size

        densidad = construir_densidad(anotaciones_imagen, ancho, alto)
        resultado = superponer_mapa_calor(imagen_original, densidad)

        nombre_salida = f"{img['id']}.png"
        resultado.convert("RGB").save(os.path.join(OUTPUT_DIR, nombre_salida))

        resumen.append({"image_id": img["id"], "url": img["url"], "participantes": n})

    with open(os.path.join(OUTPUT_DIR, "resumen.json"), "w", encoding="utf-8") as f:
        json.dump(resumen, f, ensure_ascii=False, indent=2)

    print(f"\nListo. {len(imagenes)} imágenes procesadas -> carpeta '{OUTPUT_DIR}/'")


if __name__ == "__main__":
    main()
