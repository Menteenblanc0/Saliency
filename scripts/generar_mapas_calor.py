"""
generar_mapas_calor.py

Se conecta a Supabase y genera, por cada imagen del estudio, un MAPA DE
GRISES con el promedio de todos los participantes.

Cómo se construye:
  1. Por cada participante se crea una máscara en blanco y negro del
     tamaño de la imagen original y se reproducen sus trazos EN ORDEN:
     el pincel pinta (255) y el borrador quita (0). Solo cuenta lo que
     queda marcado al final; el orden de las zonas no importa.
  2. Se suma, por píxel, cuántos participantes lo dejaron marcado y se
     divide entre n, el número de participantes que anotaron esa imagen
     (incluidos los que dejaron la máscara vacía).
  3. El PNG resultante es de 8 bits en grises (modo "L"), del mismo
     tamaño que la imagen original, sin la imagen debajo:
         valor = round(fracción de participantes * 255)
     (blanco = todos marcaron ese píxel, negro = nadie).

Salida (carpeta "mapas_grises/"):
  - {image_id}.png     un mapa por imagen que tenga anotaciones.
  - resumen.json       por imagen: image_id, url, participantes y
                       valor_maximo (el valor de gris más alto del mapa,
                       0-255). Las imágenes sin anotaciones no generan
                       PNG y quedan con participantes: 0.

Con --overlay se genera además, en "mapas_calor/", el mapa a color
(inferno) superpuesto a la imagen, para revisarlo a simple vista.

Nota: si la imagen trae orientación EXIF se usa ya rotada, tal como la
muestra el navegador; el mapa tiene ese mismo tamaño.

Requisitos (instalar una sola vez):
    pip install -r requirements.txt

Uso:
    1. Crea un archivo ".env" en esta misma carpeta con:
         SUPABASE_URL=https://tu-proyecto.supabase.co
         SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
    2. Corre: python generar_mapas_calor.py [--overlay]
"""

import argparse
import io
import itertools
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageOps

from supabase_utils import iterar_paginas, traer_todo

OUTPUT_DIR = "mapas_grises"
OVERLAY_DIR = "mapas_calor"
HEATMAP_ALPHA = 0.55  # opacidad del mapa de color sobre la imagen en --overlay (0-1)


def descargar_imagen(url):
    import requests

    resp = requests.get(url, timeout=20)
    resp.raise_for_status()
    imagen = Image.open(io.BytesIO(resp.content))
    return ImageOps.exif_transpose(imagen).convert("RGB")


def mascara_participante(strokes, ancho, alto):
    """
    Reproduce, en orden, los trazos de un participante y devuelve una
    matriz booleana (alto x ancho): True donde quedó marcado.

    El grosor en píxeles es max(1, round(size * ancho)). Cada punto es un
    círculo y los puntos consecutivos se unen con un segmento del mismo
    grosor (puntas redondas); un trazo de un solo punto es solo un círculo.
    """
    mascara = Image.new("L", (ancho, alto), 0)
    dibujo = ImageDraw.Draw(mascara)

    for trazo in strokes or []:
        herramienta = trazo.get("tool")
        if herramienta == "brush":
            valor = 255
        elif herramienta == "eraser":
            valor = 0
        else:
            continue

        grosor = max(1, round(float(trazo.get("size") or 0) * ancho))
        radio = grosor / 2

        puntos = []
        for p in trazo.get("points") or []:
            try:
                puntos.append((float(p["x"]) * ancho, float(p["y"]) * alto))
            except (KeyError, TypeError, ValueError):
                continue  # punto malformado (datos antiguos): se ignora
        if not puntos:
            continue

        if len(puntos) >= 2:
            dibujo.line(puntos, fill=valor, width=grosor, joint="curve")
        for x, y in puntos:
            dibujo.ellipse([x - radio, y - radio, x + radio, y + radio], fill=valor)

    return np.asarray(mascara) > 0


def acumular_participantes(paginas, ancho, alto):
    """
    Suma las máscaras de todos los participantes de una imagen.
    Devuelve (acumulado, n): cuántos participantes marcaron cada píxel y
    cuántos participantes anotaron la imagen (con máscara vacía o no).
    """
    acumulado = np.zeros((alto, ancho), dtype=np.uint32)
    vistos = set()
    for pagina in paginas:
        for fila in pagina:
            participante = fila["participant_id"]
            if participante in vistos:  # el índice único lo impide; por si acaso
                continue
            vistos.add(participante)
            acumulado += mascara_participante(fila.get("strokes"), ancho, alto)
    return acumulado, len(vistos)


def mapa_de_grises(acumulado, n):
    """Pasa el conteo por píxel a una imagen de 8 bits en grises (modo L)."""
    promedio = acumulado / n
    return Image.fromarray(np.rint(promedio * 255).astype(np.uint8)), promedio


def superponer_mapa_calor(imagen_original, promedio):
    import matplotlib as mpl  # solo hace falta con --overlay

    maximo = promedio.max()
    densidad_norm = promedio / maximo if maximo > 0 else promedio

    colormap = mpl.colormaps["inferno"]
    color_rgba = (colormap(densidad_norm) * 255).astype(np.uint8)
    capa_calor = Image.fromarray(color_rgba)

    alpha_mask = Image.fromarray((densidad_norm * 255 * HEATMAP_ALPHA).astype(np.uint8))
    capa_calor.putalpha(alpha_mask)

    return Image.alpha_composite(imagen_original.convert("RGBA"), capa_calor)


def crear_cliente():
    from dotenv import load_dotenv
    from supabase import create_client

    load_dotenv()  # lee SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del .env
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def main(argv=None, cliente=None):
    parser = argparse.ArgumentParser(description="Mapas de grises promedio por imagen.")
    parser.add_argument(
        "--overlay",
        action="store_true",
        help=f"además, guarda en '{OVERLAY_DIR}/' el mapa a color sobre la imagen",
    )
    args = parser.parse_args(argv)

    supabase = cliente or crear_cliente()
    imagenes = traer_todo(supabase, "images", "id, url, alt", filtro=lambda q: q.eq("active", True))

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    if args.overlay:
        os.makedirs(OVERLAY_DIR, exist_ok=True)
    resumen = []
    errores = 0

    for img in imagenes:
        # Se piden las anotaciones imagen por imagen (y por páginas): así no
        # se carga toda la tabla en memoria y ningún tope de filas las trunca.
        paginas = iterar_paginas(
            supabase,
            "annotations",
            "participant_id, strokes",
            filtro=lambda q, i=img["id"]: q.eq("image_id", i),
        )
        primera = next(paginas, None)
        if primera is None:
            print(f"Imagen {img['id']}: sin anotaciones, se omite")
            resumen.append(
                {"image_id": img["id"], "url": img["url"], "participantes": 0, "valor_maximo": None}
            )
            continue

        try:
            imagen_original = descargar_imagen(img["url"])
        except Exception as exc:  # una imagen caída no debe tirar todo el proceso
            errores += 1
            print(f"ERROR descargando la imagen {img['id']} ({img['url']}): {exc}", file=sys.stderr)
            resumen.append(
                {"image_id": img["id"], "url": img["url"], "participantes": None,
                 "valor_maximo": None, "error": str(exc)}
            )
            continue

        ancho, alto = imagen_original.size
        acumulado, n = acumular_participantes(itertools.chain([primera], paginas), ancho, alto)
        mapa, promedio = mapa_de_grises(acumulado, n)
        mapa.save(os.path.join(OUTPUT_DIR, f"{img['id']}.png"))

        if args.overlay:
            superponer_mapa_calor(imagen_original, promedio).convert("RGB").save(
                os.path.join(OVERLAY_DIR, f"{img['id']}.png")
            )

        valor_maximo = int(np.asarray(mapa).max())
        print(f"Imagen {img['id']}: {n} participante(s), valor máximo {valor_maximo}")
        resumen.append(
            {"image_id": img["id"], "url": img["url"], "participantes": n, "valor_maximo": valor_maximo}
        )

    with open(os.path.join(OUTPUT_DIR, "resumen.json"), "w", encoding="utf-8") as f:
        json.dump(resumen, f, ensure_ascii=False, indent=2)

    print(f"\nListo. {len(imagenes)} imágenes revisadas -> carpeta '{OUTPUT_DIR}/'")
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
