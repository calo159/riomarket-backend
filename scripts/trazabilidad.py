#!/usr/bin/env python
"""Matriz de trazabilidad de RioMarket: requisito -> pantalla -> endpoint -> prueba.

La fuente de verdad es ``docs/requisitos.yml``. Este script:

* valida el esquema del archivo (ids únicos, textos no vacíos, listas de texto);
* comprueba que cada prueba pytest nombrada existe (``pytest --collect-only``);
* comprueba que cada prueba de Vitest o Playwright nombrada existe en su archivo;
* comprueba que cada endpoint nombrado existe en el esquema OpenAPI real;
* comprueba que cada pantalla nombrada existe en ``frontend/src/App.tsx``;
* comprueba que cada evidencia y cada ADR citado son archivos que existen;
* comprueba que los enlaces relativos de los ``.md`` de documentación apuntan a archivos reales;
* genera ``docs/trazabilidad.md`` (determinista, sin fechas).

Uso::

    python scripts/trazabilidad.py            # escribe docs/trazabilidad.md
    python scripts/trazabilidad.py --check    # no escribe; falla si hay errores o el .md está viejo

Solo usa la biblioteca estándar, PyYAML (que ya trae drf-spectacular) y el propio proyecto.
"""

from __future__ import annotations

import argparse
import contextlib
import fnmatch
import io
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ARCHIVO_REQUISITOS = Path("docs/requisitos.yml")
ARCHIVO_SALIDA = Path("docs/trazabilidad.md")
ARCHIVO_APP = Path("frontend/src/App.tsx")

PATRON_ID = re.compile(r"^(RF|RNF)-\d{2}$")
PATRON_ENDPOINT = re.compile(r"^(GET|POST|PUT|PATCH|DELETE) (/\S*)$")
PATRON_ADR = re.compile(r"\bADR-(\d{3})\b")
CAMPOS_TEXTO = ("titulo", "origen")
CAMPOS_LISTA = ("actor", "pantallas", "endpoints", "pruebas", "evidencia")
CAMPOS_CONOCIDOS = {"id", "pendiente", *CAMPOS_TEXTO, *CAMPOS_LISTA}
METODOS = ("get", "post", "put", "patch", "delete")


@dataclass
class Contexto:
    """Lo que existe de verdad en el repositorio (o en un repositorio de prueba)."""

    raiz: Path
    pytest_ids: set[str] = field(default_factory=set)
    endpoints: set[str] = field(default_factory=set)
    rutas_frontend: set[str] = field(default_factory=set)


# ---------------------------------------------------------------------------
# Carga y esquema
# ---------------------------------------------------------------------------
def cargar_requisitos(ruta: Path) -> list[dict]:
    """Lee el YAML. Devuelve la lista de requisitos tal cual (la validación va aparte)."""
    import yaml

    datos = yaml.safe_load(ruta.read_text(encoding="utf-8"))
    if not isinstance(datos, list):
        raise ValueError(f"{ruta}: se esperaba una lista de requisitos")
    return datos


def _lista_de_texto(req: dict, campo: str, errores: list[str], etiqueta: str) -> list[str]:
    valor = req.get(campo, [])
    if not isinstance(valor, list) or not all(isinstance(x, str) and x.strip() for x in valor):
        errores.append(f"{etiqueta}: '{campo}' debe ser una lista de textos no vacíos")
        return []
    return valor


def validar_esquema(requisitos: list[dict]) -> list[str]:
    """Valida ids, textos y listas. No toca el sistema de archivos."""
    errores: list[str] = []
    vistos: set[str] = set()
    for pos, req in enumerate(requisitos, start=1):
        if not isinstance(req, dict):
            errores.append(f"requisito #{pos}: debe ser un mapa")
            continue
        rid = req.get("id")
        etiqueta = rid if isinstance(rid, str) else f"requisito #{pos}"
        if not isinstance(rid, str) or not PATRON_ID.match(rid):
            errores.append(f"{etiqueta}: id inválido (use RF-NN o RNF-NN)")
        elif rid in vistos:
            errores.append(f"{etiqueta}: id repetido")
        else:
            vistos.add(rid)
        for campo in req:
            if campo not in CAMPOS_CONOCIDOS:
                errores.append(f"{etiqueta}: campo desconocido '{campo}'")
        titulo = req.get("titulo")
        if not isinstance(titulo, str) or not titulo.strip():
            errores.append(f"{etiqueta}: 'titulo' vacío")
        origen = req.get("origen", "")
        if not isinstance(origen, str):
            errores.append(f"{etiqueta}: 'origen' debe ser texto")
        if "pendiente" in req and not isinstance(req["pendiente"], bool):
            errores.append(f"{etiqueta}: 'pendiente' debe ser true o false")
        for campo in CAMPOS_LISTA:
            _lista_de_texto(req, campo, errores, etiqueta)
        for endpoint in req.get("endpoints", []) if isinstance(req.get("endpoints"), list) else []:
            if isinstance(endpoint, str) and not PATRON_ENDPOINT.match(endpoint):
                errores.append(
                    f"{etiqueta}: endpoint mal escrito (use 'MÉTODO /ruta/'): {endpoint}"
                )
    return errores


# ---------------------------------------------------------------------------
# Lo que existe
# ---------------------------------------------------------------------------
def recolectar_pytest(raiz: Path) -> set[str]:
    """Node ids de pytest (``ruta::Clase::prueba``) sin ejecutar nada."""
    entorno = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
    proceso = subprocess.run(
        [sys.executable, "-m", "pytest", "--collect-only", "-q", "-p", "no:cacheprovider"],
        cwd=raiz,
        capture_output=True,
        text=True,
        encoding="utf-8",
        env=entorno,
        check=False,
    )
    ids = {linea.strip() for linea in proceso.stdout.splitlines() if "::" in linea}
    if proceso.returncode != 0 or not ids:
        raise RuntimeError(
            "no se pudieron recolectar las pruebas de pytest:\n"
            + (proceso.stdout + proceso.stderr)[-2000:]
        )
    return ids


def recolectar_endpoints(raiz: Path) -> set[str]:
    """Pares ``MÉTODO /ruta/`` del esquema OpenAPI real (generado en memoria)."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")
    if str(raiz) not in sys.path:
        sys.path.insert(0, str(raiz))
    import django

    django.setup()
    from drf_spectacular.generators import SchemaGenerator

    ruido = io.StringIO()
    with contextlib.redirect_stderr(ruido), contextlib.redirect_stdout(ruido):
        esquema = SchemaGenerator().get_schema(request=None, public=True)
    return endpoints_del_esquema(esquema)


def endpoints_del_esquema(esquema: dict) -> set[str]:
    resultado = set()
    for ruta, operaciones in esquema.get("paths", {}).items():
        for metodo in operaciones:
            if metodo in METODOS:
                resultado.add(f"{metodo.upper()} {ruta}")
    return resultado


def _etiquetas_route(texto: str):
    """Recorre las etiquetas ``<Route ...>`` y ``</Route>`` respetando las llaves JSX.

    Un atributo como ``element={<Protegida recurso="x" />}`` contiene ``>``; por eso el cierre de
    la etiqueta es el primer ``>`` fuera de llaves. Devuelve ``(es_cierre, atributos, autocierre)``.
    """
    posicion = 0
    while True:
        inicio = texto.find("<", posicion)
        if inicio < 0:
            return
        if texto.startswith("</Route>", inicio):
            yield True, "", False
            posicion = inicio + len("</Route>")
            continue
        if not re.match(r"<Route\b", texto[inicio:]):
            posicion = inicio + 1
            continue
        profundidad = 0
        fin = inicio + len("<Route")
        while fin < len(texto):
            caracter = texto[fin]
            if caracter == "{":
                profundidad += 1
            elif caracter == "}":
                profundidad -= 1
            elif caracter == ">" and profundidad == 0:
                break
            fin += 1
        cuerpo = texto[inicio + len("<Route") : fin]
        autocierre = cuerpo.rstrip().endswith("/")
        yield False, cuerpo, autocierre
        posicion = fin + 1


def rutas_de_app(texto: str) -> set[str]:
    """Reconstruye las rutas completas de ``<Route>`` anidadas en App.tsx.

    ``<Route index>`` es la ruta de su padre (``/`` en el nivel superior); las rutas con
    ``path`` anidado heredan el prefijo de su padre. Los comodines (``*``) se ignoran.
    """
    rutas: set[str] = set()
    pila: list[str] = []
    for es_cierre, atributos, autocierre in _etiquetas_route(texto):
        if es_cierre:
            if pila:
                pila.pop()
            continue
        coincide = re.search(r'\bpath="([^"]*)"', atributos)
        segmento = coincide.group(1) if coincide else ""
        es_indice = re.search(r"\bindex\b", atributos) is not None
        prefijo = pila[-1] if pila else ""
        if segmento.startswith("/"):
            completa = segmento
        elif segmento:
            completa = prefijo.rstrip("/") + "/" + segmento
        else:
            completa = prefijo
        if es_indice:
            rutas.add(prefijo or "/")
        elif segmento and "*" not in segmento:
            rutas.add(completa)
        if not autocierre:
            pila.append(completa)
    return rutas


def contexto_real(raiz: Path) -> Contexto:
    app = (raiz / ARCHIVO_APP).read_text(encoding="utf-8")
    return Contexto(
        raiz=raiz,
        pytest_ids=recolectar_pytest(raiz),
        endpoints=recolectar_endpoints(raiz),
        rutas_frontend=rutas_de_app(app),
    )


# ---------------------------------------------------------------------------
# Validación contra lo que existe
# ---------------------------------------------------------------------------
def prueba_existe(ref: str, ctx: Contexto) -> bool:
    """Una referencia es válida si coincide exacta, es prefijo (archivo o clase) o patrón."""
    archivo, _, nombre = ref.partition("::")
    if archivo.endswith((".py", "/")):
        if "*" in ref:
            return any(fnmatch.fnmatchcase(nodo, ref + "*") for nodo in ctx.pytest_ids)
        if not (ctx.raiz / archivo.rstrip("/")).exists():
            return False
        for nodo in ctx.pytest_ids:
            if nodo == ref or nodo.startswith((ref + "::", ref + "[")):
                return True
            if ref.endswith("/") and nodo.startswith(ref):
                return True
        return False
    ruta = ctx.raiz / archivo
    if not ruta.is_file():
        return False
    if not nombre:
        return True
    texto = ruta.read_text(encoding="utf-8")
    patron = r"\b(?:it|test)(?:\.\w+)?\(\s*(['\"`])" + re.escape(nombre) + r"\1"
    return re.search(patron, texto) is not None


def validar(requisitos: list[dict], ctx: Contexto) -> list[str]:
    """Todos los errores del esquema y de las referencias, en orden estable."""
    errores = validar_esquema(requisitos)
    adrs = {p.name[4:7] for p in (ctx.raiz / "docs").glob("ADR-*.md")}
    for req in requisitos:
        if not isinstance(req, dict) or not isinstance(req.get("id"), str):
            continue
        rid = req["id"]
        pruebas = [x for x in req.get("pruebas", []) if isinstance(x, str)]
        evidencias = [x for x in req.get("evidencia", []) if isinstance(x, str)]
        pendiente = req.get("pendiente") is True
        for ref in pruebas:
            if not prueba_existe(ref, ctx):
                errores.append(f"{rid}: prueba no encontrada: {ref}")
        for ref in evidencias:
            if not (ctx.raiz / ref).exists():
                errores.append(f"{rid}: evidencia no encontrada: {ref}")
        for ref in req.get("endpoints", []) if isinstance(req.get("endpoints"), list) else []:
            if isinstance(ref, str) and PATRON_ENDPOINT.match(ref) and ref not in ctx.endpoints:
                errores.append(f"{rid}: endpoint no está en el OpenAPI: {ref}")
        for ref in req.get("pantallas", []) if isinstance(req.get("pantallas"), list) else []:
            if isinstance(ref, str) and ref not in ctx.rutas_frontend:
                errores.append(f"{rid}: ruta no está en {ARCHIVO_APP.as_posix()}: {ref}")
        for numero in PATRON_ADR.findall(str(req.get("origen", ""))):
            if numero not in adrs:
                errores.append(f"{rid}: ADR-{numero} citado en 'origen' no existe en docs/")
        if not pendiente:
            if rid.startswith("RF-") and not pruebas:
                errores.append(f"{rid}: un RF necesita al menos una prueba")
            elif rid.startswith("RNF-") and not pruebas and not evidencias:
                errores.append(f"{rid}: un RNF necesita al menos una prueba o una evidencia")
    return errores


def archivos_con_enlaces(raiz: Path) -> list[Path]:
    archivos = sorted((raiz / "docs").glob("*.md"))
    for nombre in (
        "README.md",
        "README.en.md",
        "CHANGELOG.md",
        "SECURITY.md",
        "SEGURIDAD.md",
        "CONTRIBUTING.md",
    ):
        if (raiz / nombre).is_file():
            archivos.append(raiz / nombre)
    return archivos


PATRON_ENLACE = re.compile(r"\]\((?!https?://|#|mailto:)([^)#\s]+)")


def comprobar_enlaces(raiz: Path, archivos: list[Path]) -> list[str]:
    """Enlaces ``](ruta)`` relativos que no apuntan a un archivo o carpeta existente."""
    errores = []
    for archivo in archivos:
        texto = archivo.read_text(encoding="utf-8")
        # Los bloques de código pueden contener ejemplos que parecen enlaces.
        texto = re.sub(r"```.*?```", "", texto, flags=re.DOTALL)
        for destino in PATRON_ENLACE.findall(texto):
            if not (archivo.parent / destino).exists():
                relativo = archivo.relative_to(raiz).as_posix()
                errores.append(f"{relativo}: enlace roto: {destino}")
    return errores


# ---------------------------------------------------------------------------
# Salida
# ---------------------------------------------------------------------------
def _celda(texto: str) -> str:
    return texto.replace("|", "\\|").replace("\n", " ")


def _enlace_prueba(ref: str) -> str:
    archivo = ref.partition("::")[0]
    if "*" in archivo:  # un patrón no es un archivo: se enlaza su carpeta
        archivo = archivo.rpartition("/")[0] + "/"
    return f"[`{_celda(ref)}`](../{archivo})"


def renderizar(requisitos: list[dict]) -> str:
    """Markdown determinista de la matriz (ordenada por id)."""
    ordenados = sorted(requisitos, key=lambda r: r["id"])
    total_pruebas = {p for r in ordenados for p in r.get("pruebas", [])}
    con_pruebas = sum(1 for r in ordenados if r.get("pruebas"))
    pendientes = sum(1 for r in ordenados if r.get("pendiente") is True)
    lineas = [
        "# Matriz de trazabilidad",
        "",
        "> Generado por `scripts/trazabilidad.py` a partir de [`requisitos.yml`](requisitos.yml). "
        "No editar a mano: edite el YAML y ejecute `python scripts/trazabilidad.py`.",
        "",
        "Cada fila une un requisito con las pantallas que lo muestran, los endpoints que lo sirven "
        "y las pruebas que lo cubren. `python scripts/trazabilidad.py --check` (paso del CI) "
        "falla si una prueba, un endpoint o una ruta citados no existen, si un requisito `RF` no "
        "tiene prueba o si este archivo no coincide con el YAML.",
        "",
        "## Resumen",
        "",
        f"- Requisitos: **{len(ordenados)}** "
        f"({sum(1 for r in ordenados if r['id'].startswith('RF-'))} funcionales, "
        f"{sum(1 for r in ordenados if r['id'].startswith('RNF-'))} no funcionales).",
        f"- Con al menos una prueba automatizada: **{con_pruebas}**.",
        f"- Pendientes: **{pendientes}**.",
        f"- Referencias de prueba distintas: **{len(total_pruebas)}**.",
        "",
        "## Matriz",
        "",
        "| ID | Requisito | Origen | Pantallas | Endpoints | Pruebas | Evidencia |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for req in ordenados:
        titulo = _celda(req["titulo"]) + (
            " (**Pendiente**)" if req.get("pendiente") is True else ""
        )
        pantallas = "<br>".join(f"`{_celda(p)}`" for p in req.get("pantallas", [])) or "-"
        endpoints = "<br>".join(f"`{_celda(e)}`" for e in req.get("endpoints", [])) or "-"
        pruebas = "<br>".join(_enlace_prueba(p) for p in req.get("pruebas", [])) or "-"
        evidencia = "<br>".join(f"[`{_celda(e)}`](../{e})" for e in req.get("evidencia", [])) or "-"
        origen = _celda(str(req.get("origen", ""))) or "-"
        lineas.append(
            f"| {req['id']} | {titulo} | {origen} | {pantallas} | {endpoints} | {pruebas} "
            f"| {evidencia} |"
        )
    lineas.append("")
    return "\n".join(lineas)


# ---------------------------------------------------------------------------
# Ejecución
# ---------------------------------------------------------------------------
def ejecutar(raiz: Path, comprobar: bool, ctx: Contexto | None = None) -> list[str]:
    """Devuelve la lista de errores; escribe el .md si no es ``--check`` y no hay errores."""
    requisitos = cargar_requisitos(raiz / ARCHIVO_REQUISITOS)
    errores = validar_esquema(requisitos)
    if errores:
        return errores
    ctx = ctx or contexto_real(raiz)
    errores = validar(requisitos, ctx)
    # La matriz generada se compara por texto más abajo; sus enlaces salen de referencias ya
    # validadas, así que no se revisa aquí (evita el círculo de arreglar un .md que se regenera).
    revisables = [a for a in archivos_con_enlaces(raiz) if a != raiz / ARCHIVO_SALIDA]
    errores += comprobar_enlaces(raiz, revisables)
    if errores:
        return errores
    esperado = renderizar(requisitos)
    destino = raiz / ARCHIVO_SALIDA
    if comprobar:
        actual = destino.read_text(encoding="utf-8") if destino.is_file() else ""
        if actual != esperado:
            return [
                f"{ARCHIVO_SALIDA.as_posix()} está desactualizado: "
                "ejecute 'python scripts/trazabilidad.py' y confirme el cambio"
            ]
    else:
        destino.write_text(esperado, encoding="utf-8", newline="\n")
        print(f"Escrito {ARCHIVO_SALIDA.as_posix()} ({len(requisitos)} requisitos)")
    return []


def main(argv: list[str] | None = None) -> int:
    analizador = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    analizador.add_argument(
        "--check", action="store_true", help="no escribe; falla si hay errores o el .md está viejo"
    )
    args = analizador.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    errores = ejecutar(RAIZ, args.check)
    for error in errores:
        print(error)
    if errores:
        print(f"\n{len(errores)} problema(s) en la matriz de trazabilidad.", file=sys.stderr)
        return 1
    if args.check:
        print("Matriz de trazabilidad al día.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
