"""
generar_dibujos_por_registro.py

Genera UNA imagen por cada fila de la tabla `annotations`, mostrando
exactamente lo que esa persona dibujó sobre la imagen original --
respetando el orden real de sus trazos (incluyendo lo que borró con
la goma, no solo lo que quedó al final visualmente distinto de eso).

Requisitos (instalar una sola vez):
    pip install supabase pillow numpy requests python-dotenv

Uso:
    1. Usa el mismo ".env" que ya tienes para generar_mapas_calor.py
       (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).
    2. Corre: python generar_dibujos_por_registro.py
    3. Revisa la carpeta "dibujos_por_registro/" que se crea junto al
       script -- un .png por cada anotación guardada, más un
       "manifiesto.json" que dice a qué imagen y participante
       corresponde cada archivo.
"""

import io
import json
import os

import numpy as np
import requests
from dotenv import load_dotenv
from PIL import Image, ImageDraw
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

OUTPUT_DIR = "dibujos_por_registro"
BRUSH_COLOR = (61, 107, 142, 140)  # mismo color/opacidad que usa el lienzo en el sitio


def obtener_datos(supabase):
    imagenes = supabase.table("images").select("id, url, alt").execute().data
    anotaciones = (
        supabase.table("annotations")
        .select("id, image_id, participant_id, strokes, created_at")
        .execute()
        .data
    )
    imagenes_por_id = {img["id"]: img for img in imagenes}
    return imagenes_por_id, anotaciones


def descargar_imagen(url):
    resp = requests.get(url, timeout=20)
    resp.raise_for_status()
    return Image.open(io.BytesIO(resp.content)).convert("RGB")


def dibujar_strokes(overlay, strokes, ancho, alto):
    """
    Reproduce, en orden, cada trazo guardado sobre una capa
    transparente (overlay). El pincel pinta con color; el borrador
    perfora la capa (vuelve a dejar ver la imagen de fondo), igual que
    hace `ctx.globalCompositeOperation = "destination-out"` en el
    lienzo original del sitio.
    """
    draw = ImageDraw.Draw(overlay)

    for stroke in strokes:
        tool = stroke.get("tool")
        size_norm = stroke.get("size", 0.02)
        radio_px = max(size_norm * ancho / 2, 2)
        puntos = [(p["x"] * ancho, p["y"] * alto) for p in stroke.get("points", [])]
        if len(puntos) == 0:
            continue

        if tool == "brush":
            if len(puntos) >= 2:
                draw.line(puntos, fill=BRUSH_COLOR, width=int(radio_px * 2), joint="curve")
            # círculos en cada punto para simular el extremo redondeado
            # del pincel (line cap "round" del canvas original)
            for x, y in puntos:
                draw.ellipse(
                    [x - radio_px, y - radio_px, x + radio_px, y + radio_px],
                    fill=BRUSH_COLOR,
                )

        elif tool == "eraser":
            # Se dibuja el mismo trazo en una máscara aparte y se usa
            # para poner en 0 el canal alpha de la capa -- así se
            # "perfora" en vez de pintar encima.
            mascara = Image.new("L", overlay.size, 0)
            draw_mascara = ImageDraw.Draw(mascara)
            if len(puntos) >= 2:
                draw_mascara.line(puntos, fill=255, width=int(radio_px * 2), joint="curve")
            for x, y in puntos:
                draw_mascara.ellipse(
                    [x - radio_px, y - radio_px, x + radio_px, y + radio_px], fill=255
                )

            overlay_arr = np.array(overlay)
            mascara_arr = np.array(mascara)
            overlay_arr[mascara_arr > 0, 3] = 0
            overlay = Image.fromarray(overlay_arr, mode="RGBA")
            draw = ImageDraw.Draw(overlay)  # el draw anterior queda inválido tras fromarray

    return overlay


def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    imagenes_por_id, anotaciones = obtener_datos(supabase)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    cache_imagenes = {}  # evita descargar la misma imagen una vez por cada participante
    manifiesto = []

    for fila in anotaciones:
        image_id = fila["image_id"]
        img_info = imagenes_por_id.get(image_id)
        if img_info is None:
            print(f"Aviso: la anotación {fila['id']} referencia una imagen que ya no existe ({image_id}), se omite.")
            continue

        if image_id not in cache_imagenes:
            cache_imagenes[image_id] = descargar_imagen(img_info["url"])
        imagen_original = cache_imagenes[image_id]
        ancho, alto = imagen_original.size

        overlay = Image.new("RGBA", (ancho, alto), (0, 0, 0, 0))
        overlay = dibujar_strokes(overlay, fila["strokes"], ancho, alto)

        resultado = Image.alpha_composite(imagen_original.convert("RGBA"), overlay).convert("RGB")

        nombre_archivo = f"{fila['id']}.png"
        resultado.save(os.path.join(OUTPUT_DIR, nombre_archivo))

        manifiesto.append(
            {
                "archivo": nombre_archivo,
                "annotation_id": fila["id"],
                "image_id": image_id,
                "participant_id": fila["participant_id"],
                "created_at": fila["created_at"],
            }
        )
        print(f"Generado: {nombre_archivo}")

    with open(os.path.join(OUTPUT_DIR, "manifiesto.json"), "w", encoding="utf-8") as f:
        json.dump(manifiesto, f, ensure_ascii=False, indent=2)

    print(f"\nListo. {len(manifiesto)} registro(s) procesado(s) -> carpeta '{OUTPUT_DIR}/'")


if __name__ == "__main__":
    main()
