"""Prueba de humo contra el sistema desplegado: ¿arrancó, está al día y protege lo que debe?

Solo lecturas y sin credenciales, así que es seguro correrla contra producción. Sale con
código 1 si algo falla (el CI usa eso para avisar). Solo usa la biblioteca estándar.

    python scripts/humo_produccion.py https://riomarket.onrender.com
    python scripts/humo_produccion.py https://riomarket.onrender.com --version c253dae

Con ``--version`` espera (hasta ``--espera`` segundos) a que el despliegue de ese commit esté
sirviendo antes de probar: Render tarda unos minutos y el primer arranque de un servicio
dormido otros tantos.
"""

import argparse
import contextlib
import json
import sys
import time
import urllib.error
import urllib.request

# Rutas que exigen sesión: sin ella deben responder 401 (nunca 200 ni 500).
PROTEGIDAS = (
    "/api/orders/pedidos/",
    "/api/payments/pagos/",
    "/api/admin/usuarios/",
    "/api/admin/usuarios/exportar/",
    "/api/audit/registros/",
    "/api/audit/registros/exportar/",
)
CABECERAS_DE_SEGURIDAD = (
    "content-security-policy",
    "strict-transport-security",
    "x-content-type-options",
)


def pedir(url: str, timeout: int = 90) -> tuple[int, dict[str, str], bytes]:
    """GET sin seguir redirecciones raras; devuelve (estado, cabeceras en minúsculas, cuerpo)."""
    peticion = urllib.request.Request(url, headers={"User-Agent": "riomarket-humo/1.0"})
    try:
        with urllib.request.urlopen(peticion, timeout=timeout) as r:
            return r.status, {k.lower(): v for k, v in r.headers.items()}, r.read()
    except urllib.error.HTTPError as e:
        return e.code, {k.lower(): v for k, v in e.headers.items()}, e.read()


def esperar_salud(base: str, version: str | None, espera: int) -> dict:
    """Consulta /api/health/ hasta que responda (y, si se pidió, hasta que sea esa versión)."""
    limite = time.monotonic() + espera
    ultimo = "sin respuesta"
    while True:
        try:
            estado, _, cuerpo = pedir(f"{base}/api/health/", timeout=30)
            if estado == 200:
                datos = json.loads(cuerpo)
                if not version or str(datos.get("version", "")).startswith(version[:7]):
                    return datos
                ultimo = f"sirve la versión {datos.get('version')}, se espera {version[:7]}"
            else:
                ultimo = f"HTTP {estado}"
        except (OSError, ValueError) as e:
            ultimo = f"{type(e).__name__}: {e}"
        if time.monotonic() > limite:
            raise SystemExit(f"FALLA: el servicio no quedó listo en {espera}s ({ultimo})")
        print(f"  … esperando ({ultimo})", flush=True)
        time.sleep(15)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("base", help="URL base, sin barra final")
    parser.add_argument("--version", help="commit que debe estar sirviéndose (7 caracteres bastan)")
    parser.add_argument(
        "--espera", type=int, default=900, help="segundos máximos de espera (por defecto 900)"
    )
    args = parser.parse_args()
    base = args.base.rstrip("/")

    fallos: list[str] = []

    def comprobar(descripcion: str, ok: bool, detalle: str = "") -> None:
        marca = "OK   " if ok else "FALLA"
        extra = f" — {detalle}" if detalle and not ok else ""
        print(f"  {marca} {descripcion}{extra}")
        if not ok:
            fallos.append(descripcion)

    print(f"Prueba de humo en {base}")
    salud = esperar_salud(base, args.version, args.espera)
    comprobar(
        "el servicio responde y la base de datos está arriba",
        salud.get("status") == "ok" and salud.get("database") == "up",
        str(salud),
    )
    comprobar(
        "migraciones al día", salud.get("migraciones") == "al_dia", str(salud.get("migraciones"))
    )

    estado, cabeceras, cuerpo = pedir(f"{base}/")
    comprobar("la aplicación web carga", estado == 200 and b'id="root"' in cuerpo, f"HTTP {estado}")
    faltan = [c for c in CABECERAS_DE_SEGURIDAD if c not in cabeceras]
    comprobar("cabeceras de seguridad presentes", not faltan, f"faltan {', '.join(faltan)}")

    estado, _, cuerpo = pedir(f"{base}/api/catalog/productos/?page_size=1")
    publico_ok = False
    if estado == 200:
        with contextlib.suppress(ValueError):
            publico_ok = "results" in json.loads(cuerpo)
    comprobar("el catálogo público responde", publico_ok, f"HTTP {estado}")

    estado, _, _ = pedir(f"{base}/api/schema/")
    comprobar("la documentación de la API (OpenAPI) responde", estado == 200, f"HTTP {estado}")

    for ruta in PROTEGIDAS:
        estado, _, _ = pedir(f"{base}{ruta}")
        comprobar(f"{ruta} exige sesión", estado == 401, f"HTTP {estado}")

    if fallos:
        print(f"\n{len(fallos)} comprobación(es) fallaron.")
        return 1
    print("\nTodo en orden.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
