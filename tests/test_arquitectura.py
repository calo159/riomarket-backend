"""Reglas de arquitectura del backend: las apps forman capas y solo dependen hacia abajo.

Ver ``docs/ADR-017-arquitectura-en-capas.md``. Esta prueba lee los ``import`` de cada app (sin
ejecutarlos) y falla con un mensaje que dice qué dependencia sobra y cómo corregirla.
"""

import ast
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent.parent / "apps"

# Cada app depende solo de las de nivel MENOR. Una app nueva debe declararse aquí: decidir su nivel
# es justamente la decisión de diseño que esta prueba obliga a tomar.
NIVELES = {
    "common": 0,  # núcleo: excepciones, paginación, seguridad, almacenamiento (sin dominio)
    "rbac": 1,  # roles y recursos; el menú recibe sus insignias de las apps de negocio (registro)
    "accounts": 2,
    "audit": 2,
    "notifications": 2,
    "addresses": 3,
    "catalog": 3,  # sus anotaciones de reputación las registra ``reviews``
    "promotions": 4,
    "sitio": 4,  # entrega la web, robots y sitemap
    "orders": 5,
    "payments": 5,
    "reviews": 6,
    "administration": 7,
    "demo": 8,  # solo comandos de datos de demostración; nada importa de aquí
}

# Única dependencia mutua aceptada: un pedido y su cobro son el mismo proceso de compra.
# ``payments`` importa solo los modelos de ``orders``; ``orders`` importa de ``payments``
# modelos y servicios.
MUTUAS = {frozenset({"orders", "payments"})}

# Los demás ``import`` entre apps van siempre al inicio del archivo; la excepción son los ganchos de
# arranque (``AppConfig.ready``), donde una app registra su aporte en otra de nivel inferior.
ARCHIVOS_CON_IMPORTS_DIFERIDOS = {"apps.py"}


def _imports_entre_apps():
    """Genera ``(app, destino, archivo, linea, diferido)`` para cada import de otra app propia."""
    for archivo in sorted(RAIZ.rglob("*.py")):
        partes = archivo.relative_to(RAIZ).parts
        if partes[0] == "__pycache__" or "tests" in partes or "migrations" in partes:
            continue
        app = partes[0]
        arbol = ast.parse(archivo.read_text(encoding="utf-8"), filename=str(archivo))
        for nodo, dentro_de_funcion in _recorrer(arbol):
            if isinstance(nodo, ast.ImportFrom) and nodo.module and nodo.level == 0:
                modulo = nodo.module
            elif isinstance(nodo, ast.Import):
                modulo = nodo.names[0].name
            else:
                continue
            if not modulo.startswith("apps."):
                continue
            destino = modulo.split(".")[1]
            if destino != app:
                yield (
                    app,
                    destino,
                    archivo.relative_to(RAIZ.parent).as_posix(),
                    nodo.lineno,
                    dentro_de_funcion,
                )


def _recorrer(nodo, dentro=False):
    """Recorre el árbol marcando si un nodo está dentro de una función (import diferido)."""
    for hijo in ast.iter_child_nodes(nodo):
        if isinstance(hijo, ast.If) and "TYPE_CHECKING" in ast.unparse(hijo.test):
            continue  # solo para tipos: no se ejecuta
        yield hijo, dentro
        yield from _recorrer(
            hijo, dentro or isinstance(hijo, ast.FunctionDef | ast.AsyncFunctionDef)
        )


def test_toda_app_declara_su_nivel():
    existentes = {p.name for p in RAIZ.iterdir() if p.is_dir() and p.name != "__pycache__"}
    sin_nivel = existentes - NIVELES.keys()
    fantasmas = NIVELES.keys() - existentes
    assert not sin_nivel, (
        f"App(s) nueva(s) sin nivel en tests/test_arquitectura.py: {sorted(sin_nivel)}. "
        "Decide de qué apps puede depender (solo de niveles menores) y añádela a NIVELES."
    )
    assert not fantasmas, f"NIVELES nombra apps que ya no existen: {sorted(fantasmas)}"


def test_las_apps_solo_dependen_de_apps_de_nivel_inferior():
    violaciones = []
    for app, destino, archivo, linea, _ in _imports_entre_apps():
        if app not in NIVELES or destino not in NIVELES:
            continue
        if frozenset({app, destino}) in MUTUAS:
            continue
        if NIVELES[destino] >= NIVELES[app]:
            violaciones.append(
                f"{archivo}:{linea}: «{app}» (nivel {NIVELES[app]}) importa «{destino}» "
                f"(nivel {NIVELES[destino]}). Invierte la dependencia con un punto de extensión "
                "(ver apps/rbac/menu.py o apps/catalog/anotaciones.py) o mueve el código."
            )
    assert not violaciones, "\n" + "\n".join(violaciones)


def test_no_hay_imports_entre_apps_escondidos_dentro_de_funciones():
    escondidos = [
        f"{archivo}:{linea}: import de «{destino}» dentro de una función. "
        "Súbelo al inicio del archivo: si da un ciclo, la dependencia está al revés."
        for app, destino, archivo, linea, diferido in _imports_entre_apps()
        if diferido and Path(archivo).name not in ARCHIVOS_CON_IMPORTS_DIFERIDOS
    ]
    assert not escondidos, "\n" + "\n".join(escondidos)


def test_el_nucleo_y_rbac_no_conocen_el_dominio():
    dominio = set(NIVELES) - {"common", "rbac"}
    conocen = sorted(
        {
            (app, destino)
            for app, destino, *_ in _imports_entre_apps()
            if app in {"common", "rbac"} and destino in dominio
        }
    )
    assert not conocen, f"«common» y «rbac» no pueden importar apps de negocio: {conocen}"


@pytest.mark.parametrize("app", ["demo"])
def test_nada_depende_de_las_apps_solo_para_demostracion(app):
    dependientes = sorted(
        {origen for origen, destino, *_ in _imports_entre_apps() if destino == app}
    )
    assert not dependientes, (
        f"«{app}» solo tiene comandos de demostración; no debe importarse: {dependientes}"
    )
