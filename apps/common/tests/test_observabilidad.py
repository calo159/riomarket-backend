"""Pruebas de la observabilidad (ADR-015): identificador de petición y registro estructurado."""

import io
import json
import logging
import logging.config
import re
import sys

import pytest
from django.db import connection
from django.http import HttpResponse
from django.test import Client
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.accounts.models import Usuario
from apps.common.observabilidad import (
    JsonFormatter,
    RedactarSecretos,
    RequestIdFilter,
    RequestIdMiddleware,
    request_id_actual,
)
from config.logs import construir_logging
from tests.factories import UsuarioFactory

pytestmark = pytest.mark.django_db

FORMATO_ID = re.compile(r"^[A-Za-z0-9-]{8,64}$")
JWT_FALSO = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo3fQ.firmaDeEjemplo123"


@pytest.fixture
def registros(caplog):
    caplog.set_level(logging.INFO, logger="apps.acceso")
    return caplog


def _acceso(caplog):
    return [r for r in caplog.records if r.name == "apps.acceso"]


def _registro_con_excepcion(mensaje):
    try:
        raise ValueError(mensaje)
    except ValueError:
        return logging.LogRecord("apps.x", logging.ERROR, __file__, 1, "falló", (), sys.exc_info())


# --- Identificador de petición ------------------------------------------------------------------


def test_genera_request_id_si_no_viene(client):
    respuesta = client.get("/api/catalog/categorias/")
    assert FORMATO_ID.match(respuesta["X-Request-ID"])


def test_dos_peticiones_reciben_identificadores_distintos(client):
    primero = client.get("/api/catalog/categorias/")["X-Request-ID"]
    segundo = client.get("/api/catalog/categorias/")["X-Request-ID"]
    assert primero != segundo


def test_respeta_request_id_valido(client):
    respuesta = client.get("/api/catalog/categorias/", headers={"X-Request-ID": "prueba-12345678"})
    assert respuesta["X-Request-ID"] == "prueba-12345678"


@pytest.mark.parametrize(
    "malo",
    [
        "corto",
        "a" * 65,
        "con espacios  1234",
        "con\tTab12345",
        "tilde-ñandú-1234",
        "punto.y.coma;1234",
        "<script>alert1</script>",
    ],
)
def test_rechaza_request_id_invalido(client, malo):
    respuesta = client.get("/api/catalog/categorias/", headers={"X-Request-ID": malo})
    assert respuesta["X-Request-ID"] != malo
    assert FORMATO_ID.match(respuesta["X-Request-ID"])


def test_rechaza_request_id_con_saltos_de_linea(rf):
    """Un valor con CR/LF (inyección en cabeceras o registros) nunca se refleja."""
    peticion = rf.get("/x/", HTTP_X_REQUEST_ID="abcdefgh\r\nSet-Cookie: x=1")
    respuesta = RequestIdMiddleware(lambda r: HttpResponse("ok"))(peticion)
    assert FORMATO_ID.match(respuesta["X-Request-ID"])
    assert "Set-Cookie" not in respuesta["X-Request-ID"]
    assert peticion.request_id == respuesta["X-Request-ID"]


def test_el_identificador_queda_en_la_peticion_y_se_limpia_al_terminar(rf):
    vistos = []

    def vista(request):
        vistos.append((request.request_id, request_id_actual.get()))
        return HttpResponse("ok")

    respuesta = RequestIdMiddleware(vista)(rf.get("/x/", HTTP_X_REQUEST_ID="valido-123456"))
    assert vistos == [("valido-123456", "valido-123456")]
    assert respuesta["X-Request-ID"] == "valido-123456"
    assert request_id_actual.get() is None


def test_la_respuesta_de_error_tambien_lleva_el_identificador(client):
    respuesta = client.get("/api/orders/pedidos/", headers={"X-Request-ID": "prueba-12345678"})
    assert respuesta.status_code == 401
    assert respuesta["X-Request-ID"] == "prueba-12345678"


def test_el_middleware_no_agrega_consultas(client):
    with CaptureQueriesContext(connection) as primera:
        client.get("/api/catalog/categorias/")
    with CaptureQueriesContext(connection) as segunda:
        client.get("/api/catalog/categorias/", headers={"X-Request-ID": "prueba-12345678"})
    assert len(segunda) == len(primera)


def test_es_el_primer_middleware(settings):
    assert settings.MIDDLEWARE[0] == "apps.common.observabilidad.RequestIdMiddleware"


# --- Registro de acceso -------------------------------------------------------------------------


def test_registro_de_acceso_con_los_campos_esperados(client, registros):
    client.get("/api/catalog/categorias/", headers={"X-Request-ID": "prueba-12345678"})
    (registro,) = _acceso(registros)
    assert registro.request_id == "prueba-12345678"
    assert registro.metodo == "GET"
    assert registro.ruta == "/api/catalog/categorias/"
    assert registro.estado == 200
    assert isinstance(registro.duracion_ms, int)
    assert registro.usuario_id is None


def test_registro_de_acceso_sin_query_string(client, registros):
    client.get("/api/catalog/categorias/?token=SECRETO123&q=lo-que-sea")
    (registro,) = _acceso(registros)
    assert registro.ruta == "/api/catalog/categorias/"
    assert "SECRETO123" not in registros.text
    assert "lo-que-sea" not in registros.text


def test_registro_de_acceso_lleva_solo_el_numero_de_usuario(registros):
    usuario = UsuarioFactory(rol=Usuario.Rol.COMPRADOR)
    cliente = APIClient()
    cliente.force_authenticate(usuario)
    respuesta = cliente.get("/api/orders/pedidos/")
    assert respuesta.status_code == 200
    (registro,) = _acceso(registros)
    assert registro.usuario_id == usuario.pk
    assert usuario.correo not in registros.text


def test_el_registro_no_contiene_datos_personales_ni_secretos(api_client, registros):
    """Petición con Authorization, cookies y un cuerpo con contraseña: nada llega al registro."""
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {JWT_FALSO}")
    api_client.cookies["sessionid"] = "COOKIE-SECRETA-777"
    api_client.cookies["rm_refresh"] = JWT_FALSO
    api_client.post(
        "/api/auth/login/",
        {"correo": "intruso@correo.test", "password": "ContraseñaSecreta#9"},
        format="json",
        headers={"X-Request-ID": "prueba-12345678"},
    )
    (registro,) = _acceso(registros)
    assert registro.metodo == "POST"
    assert registro.ruta == "/api/auth/login/"
    texto = registros.text + "\n".join(str(r.__dict__) for r in registros.records)
    for prohibido in (
        JWT_FALSO,
        "Bearer",
        "COOKIE-SECRETA-777",
        "ContraseñaSecreta#9",
        "intruso@correo.test",
    ):
        assert prohibido not in texto


def test_health_no_registra_acceso(client, registros):
    client.get("/api/health/")
    assert _acceso(registros) == []


def test_los_assets_no_registran_acceso(client, registros):
    client.get("/assets/index-abc123.js")
    assert _acceso(registros) == []


def test_un_500_deja_registro_con_estado_500_y_el_mismo_identificador(registros, monkeypatch):
    def romper(*args, **kwargs):
        raise RuntimeError("fallo inesperado")

    monkeypatch.setattr("apps.catalog.views.CategoriaViewSet.list", romper)
    cliente = Client(raise_request_exception=False)
    respuesta = cliente.get("/api/catalog/categorias/", headers={"X-Request-ID": "prueba-12345678"})
    assert respuesta.status_code == 500
    assert respuesta["X-Request-ID"] == "prueba-12345678"
    (registro,) = _acceso(registros)
    assert registro.estado == 500
    assert registro.request_id == "prueba-12345678"


# --- Formateador JSON y filtros -----------------------------------------------------------------


def _formatear(**extras):
    registro = logging.LogRecord("apps.x", logging.WARNING, __file__, 1, "mensaje %s", ("a",), None)
    for clave, valor in extras.items():
        setattr(registro, clave, valor)
    return JsonFormatter().format(registro)


def test_formatter_json_es_una_linea_valida():
    salida = _formatear(metodo="GET", estado=200)
    assert "\n" not in salida
    datos = json.loads(salida)
    assert datos["nivel"] == "WARNING"
    assert datos["logger"] == "apps.x"
    assert datos["msg"] == "mensaje a"
    assert datos["metodo"] == "GET"
    assert datos["estado"] == 200
    assert datos["request_id"] == "-"
    assert datos["ts"].endswith("Z")


def test_formatter_usa_el_request_id_del_contexto():
    token = request_id_actual.set("contexto-12345678")
    try:
        assert json.loads(_formatear())["request_id"] == "contexto-12345678"
    finally:
        request_id_actual.reset(token)


def test_formatter_no_vuelca_campos_no_permitidos():
    datos = json.loads(
        _formatear(request=object(), cookies="sessionid=abc", authorization="Bearer x")
    )
    assert "request" not in datos
    assert "cookies" not in datos
    assert "authorization" not in datos


def test_formatter_con_excepcion_sigue_en_una_linea():
    salida = JsonFormatter().format(_registro_con_excepcion("boom\ncon salto"))
    assert "\n" not in salida
    assert "ValueError" in json.loads(salida)["error"]


def test_formatter_redacta_secretos_de_la_excepcion():
    salida = JsonFormatter().format(_registro_con_excepcion(f"token {JWT_FALSO}"))
    assert JWT_FALSO not in salida


def test_redacta_jwt_en_el_mensaje():
    registro = logging.LogRecord("apps.x", logging.INFO, __file__, 1, f"tok {JWT_FALSO}", (), None)
    assert RedactarSecretos().filter(registro) is True
    assert JWT_FALSO not in registro.getMessage()
    assert "[oculto]" in registro.getMessage()


def test_redacta_password_en_el_mensaje():
    registro = logging.LogRecord(
        "apps.x", logging.INFO, __file__, 1, "datos password=Clave123 y password: otra", (), None
    )
    RedactarSecretos().filter(registro)
    assert "Clave123" not in registro.getMessage()
    assert "otra" not in registro.getMessage()


def test_request_id_filter_agrega_el_atributo():
    registro = logging.LogRecord("apps.x", logging.INFO, __file__, 1, "m", (), None)
    RequestIdFilter().filter(registro)
    assert registro.request_id == "-"


# --- Configuración ------------------------------------------------------------------------------


def test_construir_logging_texto_es_legible_como_hoy():
    config = construir_logging("texto", debug=False, nivel="INFO")
    assert config["handlers"]["console"]["formatter"] == "verbose"
    assert config["formatters"]["verbose"]["format"] == "{levelname} {asctime} {module} {message}"


def test_construir_logging_json_y_registros_existentes_siguen_funcionando():
    """Con el formato JSON, un registro de ``vencimientos`` sale como una línea válida."""
    config = construir_logging("json", debug=False, nivel="INFO")
    assert config["handlers"]["console"]["formatter"] == "json"
    salida = io.StringIO()
    try:
        logging.config.dictConfig(config)
        logging.getLogger().handlers[0].setStream(salida)
        logger = logging.getLogger("apps.orders.vencimientos")
        try:
            raise RuntimeError(f"fallo con {JWT_FALSO}")
        except RuntimeError:
            logger.exception("No se pudo cancelar por plazo el pedido %s", 12)
    finally:
        logging.config.dictConfig(construir_logging("texto", debug=False, nivel="INFO"))
    lineas = salida.getvalue().strip().splitlines()
    assert len(lineas) == 1
    datos = json.loads(lineas[0])
    assert datos["logger"] == "apps.orders.vencimientos"
    assert datos["msg"] == "No se pudo cancelar por plazo el pedido 12"
    assert JWT_FALSO not in lineas[0]


def test_produccion_usa_json_por_defecto():
    """``prod.py`` arma el registro con ``LOG_FORMAT`` por defecto en ``json``."""
    from django.conf import settings

    fuente = (settings.BASE_DIR / "config" / "settings" / "prod.py").read_text(encoding="utf-8")
    assert 'env("LOG_FORMAT", default="json")' in fuente


def test_dev_y_test_conservan_el_formato_de_texto(settings):
    assert settings.LOGGING["handlers"]["console"]["formatter"] == "verbose"
