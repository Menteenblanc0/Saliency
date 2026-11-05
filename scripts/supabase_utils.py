"""
supabase_utils.py

Ayudante compartido por los scripts de análisis: trae tablas completas
de Supabase en páginas.

Supabase devuelve como máximo 1000 filas por consulta (el límite es
configurable en el proyecto y puede ser menor). Una consulta normal
`.execute()` se TRUNCA en silencio al llegar a ese tope, sin avisar.
Estas funciones piden la tabla por tramos con `.range(a, b)` hasta que
una página llega vacía, y avanzan según las filas realmente recibidas,
así que funcionan aunque el servidor devuelva menos de lo pedido.
"""

TAMANO_PAGINA = 1000

# Orden estable: sin él, las páginas podrían repetir o saltarse filas.
# `created_at` + `id` también mantiene al final las filas nuevas que
# lleguen mientras corre el script.
ORDEN_POR_DEFECTO = ("created_at", "id")


def iterar_paginas(
    supabase,
    tabla,
    columnas,
    filtro=None,
    orden=ORDEN_POR_DEFECTO,
    tamano_pagina=TAMANO_PAGINA,
):
    """
    Genera listas de filas (una por página, nunca vacías) de `tabla`.

    filtro: función opcional que recibe la consulta y devuelve la consulta
            con filtros añadidos, por ejemplo `lambda q: q.eq("active", True)`.
    """
    desde = 0
    while True:
        consulta = supabase.table(tabla).select(columnas)
        if filtro is not None:
            consulta = filtro(consulta)
        for columna in orden:
            consulta = consulta.order(columna)
        filas = consulta.range(desde, desde + tamano_pagina - 1).execute().data or []
        if not filas:
            return
        yield filas
        desde += len(filas)


def traer_todo(supabase, tabla, columnas, filtro=None, orden=ORDEN_POR_DEFECTO):
    """Igual que `iterar_paginas`, pero devuelve una sola lista con todas las filas."""
    return [
        fila
        for pagina in iterar_paginas(supabase, tabla, columnas, filtro=filtro, orden=orden)
        for fila in pagina
    ]
