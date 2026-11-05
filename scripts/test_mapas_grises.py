"""
Pruebas con datos sintéticos de generar_mapas_calor.py y supabase_utils.py.
No necesitan Supabase ni internet: usan un cliente falso.

Uso:  python test_mapas_grises.py
"""

import json
import os
import tempfile

import numpy as np
from PIL import Image

import generar_mapas_calor as gm
from supabase_utils import traer_todo


# ---------- cliente falso de Supabase ----------
class _Consulta:
    def __init__(self, tablas, nombre, tope):
        self.filas, self.tope, self.rango = tablas[nombre], tope, None
        self.filtros = []

    def select(self, _columnas):
        return self

    def eq(self, columna, valor):
        self.filtros.append((columna, valor))
        return self

    def order(self, _columna):
        return self

    def range(self, a, b):
        self.rango = (a, b)
        return self

    def execute(self):
        filas = [f for f in self.filas if all(f.get(c) == v for c, v in self.filtros)]
        a, b = self.rango
        filas = filas[a : b + 1][: self.tope]  # el servidor también aplica su tope
        return type("R", (), {"data": filas})()


class ClienteFalso:
    def __init__(self, tablas, tope=1000):
        self.tablas, self.tope = tablas, tope

    def table(self, nombre):
        return _Consulta(self.tablas, nombre, self.tope)


# ---------- ayudantes ----------
def banda(x0, x1, y=0.5, size=0.2, tool="brush"):
    return {"tool": tool, "size": size, "points": [{"x": x0, "y": y}, {"x": x1, "y": y}]}


def fila(pid, strokes, imagen="img1"):
    return {"participant_id": pid, "image_id": imagen, "strokes": strokes}


def mapa(filas, ancho=100, alto=60):
    acumulado, n = gm.acumular_participantes([filas], ancho, alto)
    return np.asarray(gm.mapa_de_grises(acumulado, n)[0]), n


# ---------- pruebas ----------
def test_solapamiento_0_128_255():
    # A marca x entre 10 y 70; B marca x entre 30 y 90 (solapan en 30-70).
    m, n = mapa([fila("a", [banda(0.2, 0.6)]), fila("b", [banda(0.4, 0.8)])])
    assert n == 2
    assert m[30, 20] == 128, m[30, 20]   # solo A
    assert m[30, 50] == 255, m[30, 50]   # ambos
    assert m[30, 80] == 128, m[30, 80]   # solo B
    assert m[30, 97] == 0 and m[5, 5] == 0
    print("OK  solapamiento: 0, 128 y 255 en las regiones esperadas")


def test_vacios_cuentan_en_n():
    m, n = mapa([fila("a", [banda(0.2, 0.6)]), fila("b", [banda(0.4, 0.8)]), fila("c", [])])
    assert n == 3 and m[30, 20] == 85 and m[30, 50] == 170, (n, m[30, 20], m[30, 50])
    print("OK  un participante con máscara vacía también cuenta en n (85 y 170)")


def test_borrador():
    # el borrador quita lo pintado antes...
    m, _ = mapa([fila("a", [banda(0.2, 0.8), banda(0.5, 0.5, size=0.1, tool="eraser")])])
    assert m[30, 50] == 0 and m[30, 25] == 255 and m[30, 75] == 255
    # ...pero no afecta a lo pintado después
    m, _ = mapa([fila("a", [banda(0.5, 0.5, size=0.1, tool="eraser"), banda(0.2, 0.8)])])
    assert m[30, 50] == 255
    print("OK  el borrador quita lo anterior y respeta el orden")


def test_trazos_de_un_punto_y_grosor_minimo():
    m, _ = mapa([fila("a", [{"tool": "brush", "size": 0.001, "points": [{"x": 0.5, "y": 0.5}]}])])
    assert (m > 0).sum() >= 1  # grosor mínimo de 1 px
    m, _ = mapa([fila("a", [{"tool": "brush", "size": 0.2, "points": [{"x": 0.5, "y": 0.5}]}])])
    assert m[30, 50] == 255 and m[30, 62] == 0  # círculo de ~20 px de diámetro
    assert (m > 0).sum() > 250
    print("OK  trazo de un punto = círculo; grosor mínimo 1 px")


def test_datos_malformados_no_rompen():
    m, n = mapa([fila("a", None), fila("b", [{"tool": "lapiz", "size": 1, "points": []},
                                             {"tool": "brush", "size": 0.1, "points": [{"x": "no"}, {"y": 1}]}])])
    assert n == 2 and m.max() == 0
    print("OK  trazos o puntos malformados se ignoran sin errores")


def test_paginacion():
    for total, tope in ((2500, 1000), (2000, 1000), (999, 1000), (0, 1000), (2500, 400)):
        filas = [{"id": i, "participant_id": f"p{i}"} for i in range(total)]
        cliente = ClienteFalso({"t": filas}, tope=tope)
        r = traer_todo(cliente, "t", "id")
        assert len(r) == total and [f["id"] for f in r] == list(range(total)), (total, tope, len(r))
    print("OK  paginación: 2500, 2000, 999, 0 filas y servidor con tope de 400 -> sin truncar")


def test_flujo_completo_con_mas_de_1000_anotaciones():
    carpeta_actual = os.getcwd()
    with tempfile.TemporaryDirectory() as tmp:
        os.chdir(tmp)
        try:
            gm.descargar_imagen = lambda url: Image.new("RGB", (100, 60), "white")
            anotaciones = [fila(f"p{i}", [banda(0.2, 0.6)]) for i in range(1500)]
            anotaciones += [fila("q0", [banda(0.4, 0.8)], imagen="img2")]
            cliente = ClienteFalso(
                {
                    "images": [
                        {"id": "img1", "url": "u1", "alt": None, "active": True},
                        {"id": "img2", "url": "u2", "alt": None, "active": True},
                        {"id": "img3", "url": "u3", "alt": None, "active": True},  # sin anotaciones
                    ],
                    "annotations": anotaciones,
                }
            )
            assert gm.main([], cliente=cliente) == 0
            resumen = {r["image_id"]: r for r in json.load(open("mapas_grises/resumen.json"))}
            assert resumen["img1"] == {"image_id": "img1", "url": "u1", "participantes": 1500, "valor_maximo": 255}
            assert resumen["img2"]["participantes"] == 1 and resumen["img3"]["participantes"] == 0
            assert not os.path.exists("mapas_grises/img3.png")
            salida = Image.open("mapas_grises/img1.png")
            assert salida.mode == "L" and salida.size == (100, 60)
            print("OK  1500 anotaciones en una imagen: n=1500; salida modo L y mismo tamaño; sin anotaciones -> participantes 0")
        finally:
            os.chdir(carpeta_actual)


def test_overlay():
    carpeta_actual = os.getcwd()
    with tempfile.TemporaryDirectory() as tmp:
        os.chdir(tmp)
        try:
            gm.descargar_imagen = lambda url: Image.new("RGB", (100, 60), "white")
            cliente = ClienteFalso(
                {"images": [{"id": "img1", "url": "u", "alt": None, "active": True}],
                 "annotations": [fila("a", [banda(0.2, 0.6)])]}
            )
            assert gm.main(["--overlay"], cliente=cliente) == 0
            assert Image.open("mapas_calor/img1.png").size == (100, 60)
            assert Image.open("mapas_grises/img1.png").mode == "L"
            print("OK  --overlay genera además el mapa a color")
        finally:
            os.chdir(carpeta_actual)


if __name__ == "__main__":
    for nombre, funcion in list(globals().items()):
        if nombre.startswith("test_"):
            funcion()
    print("\nTodas las pruebas pasaron.")
