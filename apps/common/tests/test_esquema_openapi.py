"""El esquema OpenAPI se genera sin avisos.

Los avisos de drf-spectacular no rompen nada hoy, pero esconden problemas reales: nombres de
enumeraciones con un sufijo que cambia al tocar las opciones (rompe los tipos del frontend) y
parámetros sin tipo. Esta prueba falla si vuelven.
"""

from io import StringIO

from django.core.management import call_command


def test_el_esquema_se_genera_sin_avisos(tmp_path):
    salida = tmp_path / "schema.yaml"
    errores = StringIO()

    call_command("spectacular", "--validate", "--fail-on-warn", file=str(salida), stderr=errores)

    assert salida.exists()
    assert "Warning" not in errores.getvalue()


def test_las_enumeraciones_compartidas_tienen_nombre_fijo(tmp_path):
    salida = tmp_path / "schema.yaml"
    call_command("spectacular", file=str(salida))
    texto = salida.read_text(encoding="utf-8")

    for nombre in ("EstadoUsuarioEnum", "RolUsuarioEnum", "DecisionAprobadoRechazadoEnum"):
        assert f"    {nombre}:" in texto
    assert "EstadoB1eEnum" not in texto
    assert "Rol9f8Enum" not in texto
