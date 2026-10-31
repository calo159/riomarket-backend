"""Pruebas de scripts/trazabilidad.py con repositorios de juguete (sin depender del repo real)."""

import importlib.util
import sys
import textwrap
from pathlib import Path

import pytest

RUTA_SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "trazabilidad.py"
_spec = importlib.util.spec_from_file_location("trazabilidad", RUTA_SCRIPT)
tz = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = tz  # los dataclasses con anotaciones diferidas lo necesitan
_spec.loader.exec_module(tz)

APP_TSX = """
<Routes>
  <Route index element={<Landing />} />
  <Route element={<Layout />}>
    <Route path="tienda" element={<Inicio />} />
    <Route element={<Protegida recurso="x" />}>
      <Route path="pedidos/:id" element={<Detalle />} />
    </Route>
  </Route>
  <Route path="vendedor" element={<Panel />}>
    <Route element={<Protegida recurso="vendedor.resumen" />}>
      <Route index element={<PanelVendedor />} />
    </Route>
    <Route path="ventas" element={<Ventas />} />
  </Route>
  <Route path="*" element={<NoEncontrado />} />
</Routes>
"""

PRUEBA_PY = "def test_uno():\n    pass\n\n\nclass TestA:\n    def test_dos(self):\n        pass\n"
PRUEBA_TS = "it('hace algo útil', () => {});\ntest(\"otra cosa\", async () => {});\n"

YAML_BASE = textwrap.dedent(
    """
    - id: RF-01
      titulo: Primer requisito
      origen: ADR-009
      pantallas: ["/tienda", "/vendedor/ventas"]
      endpoints: ["GET /api/cosas/", "POST /api/cosas/{id}/hacer/"]
      pruebas:
        - "apps/x/tests/test_x.py::TestA::test_dos"
        - "frontend/src/a.test.tsx::hace algo útil"
    - id: RNF-01
      titulo: Un no funcional
      evidencia: ["docs/nota.md"]
    """
)


@pytest.fixture
def repo(tmp_path):
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs" / "ADR-009-retiro.md").write_text("# ADR\n", encoding="utf-8")
    (tmp_path / "docs" / "nota.md").write_text("# Nota\n", encoding="utf-8")
    (tmp_path / "docs" / "requisitos.yml").write_text(YAML_BASE, encoding="utf-8")
    (tmp_path / "apps" / "x" / "tests").mkdir(parents=True)
    (tmp_path / "apps" / "x" / "tests" / "test_x.py").write_text(PRUEBA_PY, encoding="utf-8")
    (tmp_path / "frontend" / "src").mkdir(parents=True)
    (tmp_path / "frontend" / "src" / "a.test.tsx").write_text(PRUEBA_TS, encoding="utf-8")
    (tmp_path / "frontend" / "src" / "App.tsx").write_text(APP_TSX, encoding="utf-8")
    return tmp_path


def _yaml(texto):
    import yaml

    return yaml.safe_load(texto)


def contexto(raiz):
    return tz.Contexto(
        raiz=raiz,
        pytest_ids={
            "apps/x/tests/test_x.py::test_uno",
            "apps/x/tests/test_x.py::TestA::test_dos",
            "apps/x/tests/test_x.py::TestA::test_param[caso-1]",
        },
        endpoints={"GET /api/cosas/", "POST /api/cosas/{id}/hacer/"},
        rutas_frontend=tz.rutas_de_app(APP_TSX),
    )


def errores_de(raiz, yaml_texto=None):
    if yaml_texto is not None:
        (raiz / "docs" / "requisitos.yml").write_text(yaml_texto, encoding="utf-8")
    requisitos = tz.cargar_requisitos(raiz / "docs" / "requisitos.yml")
    return tz.validar(requisitos, contexto(raiz))


def test_un_repositorio_correcto_no_da_errores(repo):
    assert errores_de(repo) == []


def test_las_rutas_del_frontend_se_reconstruyen_con_su_anidacion():
    assert tz.rutas_de_app(APP_TSX) == {
        "/",
        "/tienda",
        "/pedidos/:id",
        "/vendedor",
        "/vendedor/ventas",
    }


def test_detecta_prueba_inexistente(repo):
    yaml_roto = YAML_BASE.replace("TestA::test_dos", "TestA::test_no_existe")
    assert errores_de(repo, yaml_roto) == [
        "RF-01: prueba no encontrada: apps/x/tests/test_x.py::TestA::test_no_existe"
    ]


def test_detecta_prueba_de_frontend_inexistente(repo):
    yaml_roto = YAML_BASE.replace("hace algo útil", "no está en el archivo")
    errores = errores_de(repo, yaml_roto)
    assert errores == [
        "RF-01: prueba no encontrada: frontend/src/a.test.tsx::no está en el archivo"
    ]


def test_acepta_pruebas_de_frontend_con_test_y_comillas_dobles(repo):
    yaml_ok = YAML_BASE.replace("hace algo útil", "otra cosa")
    assert errores_de(repo, yaml_ok) == []


def test_detecta_archivo_de_prueba_inexistente(repo):
    yaml_roto = YAML_BASE.replace("apps/x/tests/test_x.py::TestA::test_dos", "apps/x/tests/nada.py")
    assert errores_de(repo, yaml_roto) == ["RF-01: prueba no encontrada: apps/x/tests/nada.py"]


def test_acepta_clase_archivo_y_parametros_como_prefijo(repo):
    for ref in (
        "apps/x/tests/test_x.py::TestA",
        "apps/x/tests/test_x.py",
        "apps/x/tests/test_x.py::TestA::test_param",
        "apps/x/tests/",
        "apps/x/tests/test_*.py",
    ):
        yaml_ok = YAML_BASE.replace("apps/x/tests/test_x.py::TestA::test_dos", ref)
        assert errores_de(repo, yaml_ok) == [], ref


def test_detecta_endpoint_inexistente(repo):
    yaml_roto = YAML_BASE.replace("POST /api/cosas/{id}/hacer/", "POST /api/cosas/{id}/borrar/")
    assert errores_de(repo, yaml_roto) == [
        "RF-01: endpoint no está en el OpenAPI: POST /api/cosas/{id}/borrar/"
    ]


def test_el_metodo_del_endpoint_cuenta(repo):
    yaml_roto = YAML_BASE.replace("GET /api/cosas/", "DELETE /api/cosas/")
    assert errores_de(repo, yaml_roto) == [
        "RF-01: endpoint no está en el OpenAPI: DELETE /api/cosas/"
    ]


def test_detecta_ruta_frontend_inexistente(repo):
    yaml_roto = YAML_BASE.replace('"/tienda"', '"/no-existe"')
    assert errores_de(repo, yaml_roto) == [
        "RF-01: ruta no está en frontend/src/App.tsx: /no-existe"
    ]


def test_detecta_evidencia_y_adr_inexistentes(repo):
    yaml_roto = YAML_BASE.replace("docs/nota.md", "docs/falta.md").replace("ADR-009", "ADR-099")
    assert errores_de(repo, yaml_roto) == [
        "RF-01: ADR-099 citado en 'origen' no existe en docs/",
        "RNF-01: evidencia no encontrada: docs/falta.md",
    ]


def test_un_rf_sin_pruebas_falla_y_un_rnf_sin_nada_tambien(repo):
    yaml_roto = textwrap.dedent(
        """
        - id: RF-02
          titulo: Sin pruebas
        - id: RNF-02
          titulo: Sin nada
        """
    )
    assert errores_de(repo, yaml_roto) == [
        "RF-02: un RF necesita al menos una prueba",
        "RNF-02: un RNF necesita al menos una prueba o una evidencia",
    ]


def test_pendiente_no_falla_el_check(repo):
    yaml_pendiente = textwrap.dedent(
        """
        - id: RF-02
          titulo: Aún no hecho
          pendiente: true
        """
    )
    assert errores_de(repo, yaml_pendiente) == []
    salida = tz.renderizar(tz.cargar_requisitos(repo / "docs" / "requisitos.yml"))
    assert "Aún no hecho (**Pendiente**)" in salida
    assert "- Pendientes: **1**." in salida


@pytest.mark.parametrize(
    "bloque",
    [
        "- id: RF-1\n  titulo: id corto\n",
        "- id: XX-01\n  titulo: prefijo raro\n",
        "- id: RF-01\n  titulo: ''\n",
        "- id: RF-01\n  titulo: x\n  pruebas: 'no es lista'\n",
        "- id: RF-01\n  titulo: x\n  endpoints: ['sin metodo']\n",
        "- id: RF-01\n  titulo: x\n  inventado: 1\n",
        "- id: RF-01\n  titulo: x\n  pendiente: si\n",
    ],
)
def test_esquema_invalido(bloque):
    assert tz.validar_esquema(_yaml(bloque))


def test_id_repetido():
    errores = tz.validar_esquema(_yaml("- id: RF-01\n  titulo: a\n- id: RF-01\n  titulo: b\n"))
    assert "RF-01: id repetido" in errores


def test_detecta_enlace_roto(tmp_path):
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs" / "bueno.md").write_text("# Bueno\n", encoding="utf-8")
    (tmp_path / "docs" / "a.md").write_text(
        "[ok](bueno.md) [ancla](#x) [web](https://example.com/a) "
        "[roto](no-existe.md) [carpeta](../docs)\n"
        "```\n[en codigo](tampoco.md)\n```\n",
        encoding="utf-8",
    )
    errores = tz.comprobar_enlaces(tmp_path, tz.archivos_con_enlaces(tmp_path))
    assert errores == ["docs/a.md: enlace roto: no-existe.md"]


def test_salida_es_determinista(repo):
    requisitos = tz.cargar_requisitos(repo / "docs" / "requisitos.yml")
    primera = tz.renderizar(requisitos)
    assert tz.renderizar(list(reversed(requisitos))) == primera
    assert tz.renderizar(requisitos) == primera
    assert primera.index("| RF-01 |") < primera.index("| RNF-01 |")
    assert "Generado por `scripts/trazabilidad.py`" in primera.replace("> ", "")


def test_check_detecta_el_markdown_desactualizado_y_el_modo_escritura_lo_arregla(repo):
    ctx = contexto(repo)
    errores = tz.ejecutar(repo, comprobar=True, ctx=ctx)
    assert len(errores) == 1
    assert "está desactualizado" in errores[0]
    assert tz.ejecutar(repo, comprobar=False, ctx=ctx) == []
    assert tz.ejecutar(repo, comprobar=True, ctx=ctx) == []
    (repo / "docs" / "trazabilidad.md").write_text("editado a mano\n", encoding="utf-8")
    assert len(tz.ejecutar(repo, comprobar=True, ctx=ctx)) == 1


def test_el_check_falla_con_una_referencia_rota_aunque_el_markdown_este_al_dia(repo):
    ctx = contexto(repo)
    tz.ejecutar(repo, comprobar=False, ctx=ctx)
    texto = (repo / "docs" / "requisitos.yml").read_text(encoding="utf-8")
    (repo / "docs" / "requisitos.yml").write_text(
        texto.replace("TestA::test_dos", "TestA::roto"), encoding="utf-8"
    )
    errores = tz.ejecutar(repo, comprobar=True, ctx=ctx)
    assert errores == ["RF-01: prueba no encontrada: apps/x/tests/test_x.py::TestA::roto"]
