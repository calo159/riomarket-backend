"""La versión del código y la del CHANGELOG no pueden desincronizarse."""

import re
from pathlib import Path

from config.version import __version__

RAIZ = Path(__file__).resolve().parents[3]


def _primera_version_del_changelog() -> str:
    texto = (RAIZ / "CHANGELOG.md").read_text(encoding="utf-8")
    encontrada = re.search(r"^## \[(\d+\.\d+\.\d+)\]", texto, flags=re.MULTILINE)
    assert encontrada, "CHANGELOG.md no tiene ninguna sección «## [X.Y.Z]»"
    return encontrada.group(1)


def test_la_version_sigue_el_formato_semantico():
    assert re.fullmatch(r"\d+\.\d+\.\d+", __version__)


def test_la_version_del_codigo_es_la_ultima_del_changelog():
    assert _primera_version_del_changelog() == __version__, (
        "config/version.py y la primera sección versionada de CHANGELOG.md deben coincidir: "
        "al publicar una versión se actualizan ambos y se crea el tag vX.Y.Z."
    )
