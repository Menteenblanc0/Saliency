"""
Pruebas con datos sintéticos de generar_puntajes.py. No necesitan Supabase
ni internet: usan el cliente falso de test_mapas_grises.py.

Uso:  python test_puntajes.py
"""

import csv
import os
import tempfile

import generar_puntajes as gp
from test_mapas_grises import ClienteFalso


def anotacion(imagen, respuesta):
    return {"image_id": imagen, "design_answer": respuesta}


def correr(imagenes, anotaciones, tope=1000):
    carpeta_actual = os.getcwd()
    with tempfile.TemporaryDirectory() as tmp:
        os.chdir(tmp)
        try:
            gp.main(cliente=ClienteFalso({"images": imagenes, "annotations": anotaciones}, tope=tope))
            with open("puntajes/puntajes_por_imagen.csv", encoding="utf-8", newline="") as f:
                return list(csv.DictReader(f)), open("puntajes/puntajes_por_imagen.csv", encoding="utf-8").readline().strip()
        finally:
            os.chdir(carpeta_actual)


IMAGENES = [
    {"id": "A", "url": "ua", "alt": "anuncio A"},
    {"id": "B", "url": "ub", "alt": None},
    {"id": "C", "url": "uc", "alt": "sin respuestas"},
]


def test_calculo_y_columnas():
    anotaciones = [anotacion("A", r) for r in ("si", "si", "no", "no_determina", "si")]
    anotaciones += [anotacion("B", "no"), anotacion("A", None)]  # la respuesta nula se ignora
    filas, cabecera = correr(IMAGENES, anotaciones)
    assert cabecera == "image_id,url,alt,n,n_si,n_no,n_no_determina,puntaje_promedio,desviacion_estandar", cabecera
    a, b, c = filas
    assert (a["n"], a["n_si"], a["n_no"], a["n_no_determina"]) == ("5", "3", "1", "1"), a
    assert a["puntaje_promedio"] == "0.7" and a["desviacion_estandar"] == "0.4472", a   # (1+1+0+.5+1)/5; muestral
    assert (b["n"], b["puntaje_promedio"], b["desviacion_estandar"], b["alt"]) == ("1", "0.0", "", ""), b
    assert c["n"] == "0" and c["puntaje_promedio"] == "" and c["desviacion_estandar"] == "", c
    print("OK  promedio 0.7, desviación muestral 0.4472, n=1 sin desviación, n=0 con campos vacíos, nulos ignorados")


def test_mapeo_cambia_en_una_linea():
    original = dict(gp.PUNTAJE_POR_RESPUESTA)
    try:
        gp.PUNTAJE_POR_RESPUESTA["no_determina"] = 0.0
        filas, _ = correr(IMAGENES, [anotacion("A", "si"), anotacion("A", "no_determina")])
        assert filas[0]["puntaje_promedio"] == "0.5", filas[0]   # con 0.5 habría dado 0.75
    finally:
        gp.PUNTAJE_POR_RESPUESTA.update(original)
    print("OK  cambiar una entrada del diccionario cambia el puntaje")


def test_mas_de_1000_respuestas_y_tope_del_servidor():
    anotaciones = [anotacion("A", "si" if i % 4 else "no") for i in range(2500)]
    for tope in (1000, 400):
        filas, _ = correr(IMAGENES, anotaciones, tope=tope)
        a = filas[0]
        assert a["n"] == "2500" and a["n_si"] == "1875" and a["n_no"] == "625" and a["puntaje_promedio"] == "0.75", (tope, a)
    print("OK  2500 respuestas: n correcto con página de 1000 y con servidor limitado a 400")


def test_huerfanas_y_desconocidas_se_ignoran():
    filas, _ = correr(IMAGENES, [anotacion("A", "si"), anotacion("ZZZ", "si"), anotacion("A", "tal vez")])
    assert filas[0]["n"] == "1"
    print("OK  respuestas de imágenes desconocidas o con valores raros se ignoran")


if __name__ == "__main__":
    for nombre, funcion in list(globals().items()):
        if nombre.startswith("test_"):
            funcion()
    print("\nTodas las pruebas pasaron.")
