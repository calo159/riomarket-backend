"""El administrador cambia comisión, tarifa y límites de atraso desde el panel (ADR-022)."""

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Usuario
from apps.audit.models import RegistroAuditoria
from apps.common import pricing
from apps.configuracion import lectura
from apps.configuracion.models import ConfiguracionPlataforma
from apps.rbac.models import Recurso, Rol, RolRecurso, UsuarioRol
from tests.factories import UsuarioFactory

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("ajustes_del_panel")]

URL = "/api/admin/configuracion/"
MOTIVO = "Acuerdo con los vendedores"


@pytest.fixture(autouse=True)
def _valores_del_servidor(settings):
    settings.PLATFORM_COMMISSION_PERCENTAGE = "8.00"
    settings.DOMICILIO_TARIFA_BASE = "3000.00"
    settings.COMISION_LIMITE_AVISO = "50000"
    settings.COMISION_LIMITE_BLOQUEO = "150000"


def _guardar(cliente, valores, motivo=MOTIVO):
    return cliente.put(URL, {"valores": valores, "motivo": motivo}, format="json")


def _errores(respuesta):
    return respuesta.json()["errors"]


def _campo(respuesta, clave):
    return next(c for c in respuesta.json()["campos"] if c["clave"] == clave)


class TestVer:
    def test_sin_cambios_rige_el_valor_del_servidor(self, cliente_admin):
        respuesta = cliente_admin.get(URL)

        assert respuesta.status_code == 200
        comision = _campo(respuesta, "comision_porcentaje")
        assert comision["valor"] == "8.00"
        assert comision["origen"] == "servidor"
        assert comision["unidad"] == "%"
        assert _campo(respuesta, "tarifa_domicilio")["valor"] == "3000.00"
        assert respuesta.json()["vendedores"] == {"al_dia": 0, "aviso": 0, "bloqueado": 0}
        assert respuesta.json()["actualizado"] is None

    def test_no_crea_la_fila_solo_por_mirar(self, cliente_admin):
        cliente_admin.get(URL)

        assert not ConfiguracionPlataforma.objects.exists()


class TestCambiar:
    def test_el_valor_del_panel_gana_al_del_servidor(self, cliente_admin):
        respuesta = _guardar(cliente_admin, {"comision_porcentaje": "5.50"})

        assert respuesta.status_code == 200
        comision = _campo(respuesta, "comision_porcentaje")
        assert comision["valor"] == "5.50"
        assert comision["origen"] == "panel"
        assert comision["del_servidor"] == "8.00"
        assert _campo(respuesta, "tarifa_domicilio")["origen"] == "servidor"
        assert respuesta.json()["actualizado"] is not None

    def test_solo_cambia_lo_enviado(self, cliente_admin):
        _guardar(cliente_admin, {"comision_porcentaje": "5"})
        respuesta = _guardar(cliente_admin, {"tarifa_domicilio": "4000"})

        assert _campo(respuesta, "comision_porcentaje")["valor"] == "5.00"
        assert _campo(respuesta, "tarifa_domicilio")["valor"] == "4000.00"

    def test_null_vuelve_al_valor_del_servidor(self, cliente_admin):
        _guardar(cliente_admin, {"comision_porcentaje": "5"})

        respuesta = _guardar(cliente_admin, {"comision_porcentaje": None})

        comision = _campo(respuesta, "comision_porcentaje")
        assert comision["valor"] == "8.00"
        assert comision["origen"] == "servidor"
        assert ConfiguracionPlataforma.obtener().comision_porcentaje is None

    def test_el_cambio_se_ve_al_instante_en_el_mismo_proceso(self, cliente_admin):
        assert pricing.comision_plataforma(Decimal("10000")) == Decimal("800.00")

        _guardar(cliente_admin, {"comision_porcentaje": "5"})

        assert pricing.comision_plataforma(Decimal("10000")) == Decimal("500.00")

    def test_cero_es_un_valor_valido_y_apaga(self, cliente_admin):
        _guardar(cliente_admin, {"comision_porcentaje": "0"})

        assert pricing.comision_plataforma(Decimal("10000")) == Decimal("0.00")
        assert _campo(cliente_admin.get(URL), "comision_porcentaje")["origen"] == "panel"

    def test_con_la_lectura_apagada_se_ignora_el_panel(self, cliente_admin, settings):
        _guardar(cliente_admin, {"comision_porcentaje": "5"})
        settings.AJUSTES_EN_BASE_DE_DATOS = False
        lectura.invalidar()

        comision = _campo(cliente_admin.get(URL), "comision_porcentaje")

        assert comision["valor"] == "8.00"
        assert comision["origen"] == "servidor"


class TestValidacion:
    @pytest.mark.parametrize(
        ("campo", "valor"),
        [
            ("comision_porcentaje", "-1"),
            ("comision_porcentaje", "50.01"),
            ("comision_porcentaje", "80"),
            ("tarifa_domicilio", "-500"),
            ("tarifa_domicilio", "100001"),
            ("limite_aviso", "10000001"),
            ("limite_bloqueo", "-1"),
        ],
    )
    def test_fuera_de_rango_se_rechaza(self, cliente_admin, campo, valor):
        respuesta = _guardar(cliente_admin, {campo: valor})

        assert respuesta.status_code == 400
        assert campo in _errores(respuesta)
        assert not ConfiguracionPlataforma.objects.filter(**{f"{campo}__isnull": False}).exists()

    def test_la_pausa_no_puede_ser_menor_que_el_aviso(self, cliente_admin):
        respuesta = _guardar(cliente_admin, {"limite_aviso": "100000", "limite_bloqueo": "60000"})

        assert respuesta.status_code == 400
        assert "limite_bloqueo" in _errores(respuesta)

    def test_la_regla_mira_tambien_lo_que_ya_rige(self, cliente_admin):
        # El aviso vigente es 50.000 (servidor): una pausa en 10.000 quedaría por debajo.
        respuesta = _guardar(cliente_admin, {"limite_bloqueo": "10000"})

        assert respuesta.status_code == 400

    def test_apagar_la_pausa_con_cero_es_valido_aunque_haya_aviso(self, cliente_admin):
        respuesta = _guardar(cliente_admin, {"limite_bloqueo": "0"})

        assert respuesta.status_code == 200

    def test_exige_motivo(self, cliente_admin):
        respuesta = _guardar(cliente_admin, {"comision_porcentaje": "5"}, motivo="no")

        assert respuesta.status_code == 400
        assert "motivo" in _errores(respuesta)

    def test_sin_ningun_valor_no_hay_nada_que_guardar(self, cliente_admin):
        assert _guardar(cliente_admin, {}).status_code == 400

    def test_enviar_lo_mismo_que_ya_hay_no_es_un_cambio(self, cliente_admin):
        _guardar(cliente_admin, {"comision_porcentaje": "5"})

        respuesta = _guardar(cliente_admin, {"comision_porcentaje": "5.00"})

        assert respuesta.status_code == 400
        assert RegistroAuditoria.objects.filter(entidad="configuracion").count() == 1

    def test_texto_no_numerico(self, cliente_admin):
        assert _guardar(cliente_admin, {"comision_porcentaje": "mucho"}).status_code == 400


class TestAuditoria:
    def test_cada_cambio_queda_registrado_con_antes_despues_y_motivo(self, cliente_admin, admin):
        _guardar(cliente_admin, {"comision_porcentaje": "5", "tarifa_domicilio": "3500"})

        registros = RegistroAuditoria.objects.filter(entidad="configuracion", id_usuario=admin)
        assert registros.count() == 2
        comision = registros.get(detalle__campo="Comisión de la plataforma")
        assert comision.accion == "actualizar"
        assert comision.detalle["de"] == "8.00"
        assert comision.detalle["a"] == "5.00"
        assert comision.detalle["origen"] == "panel"
        assert comision.detalle["motivo"] == MOTIVO

    def test_volver_al_servidor_tambien_se_registra(self, cliente_admin):
        _guardar(cliente_admin, {"comision_porcentaje": "5"})

        _guardar(cliente_admin, {"comision_porcentaje": None})

        ultimo = RegistroAuditoria.objects.filter(entidad="configuracion").latest("id")
        assert ultimo.detalle["de"] == "5.00"
        assert ultimo.detalle["a"] == "8.00"
        assert ultimo.detalle["origen"] == "servidor"

    def test_un_rechazo_no_deja_registro_ni_cambio(self, cliente_admin):
        _guardar(cliente_admin, {"comision_porcentaje": "5", "tarifa_domicilio": "999999"})

        assert not RegistroAuditoria.objects.filter(entidad="configuracion").exists()
        assert not ConfiguracionPlataforma.objects.filter(
            comision_porcentaje__isnull=False
        ).exists()


class TestPermisos:
    def test_sin_sesion(self, cliente_anon):
        assert cliente_anon.get(URL).status_code == 401
        assert _guardar(cliente_anon, {"comision_porcentaje": "1"}).status_code == 401

    def test_comprador_y_vendedor_no_entran(self, cliente_comprador, cliente_vendedor):
        for cliente in (cliente_comprador, cliente_vendedor):
            assert cliente.get(URL).status_code == 403
            assert _guardar(cliente, {"comision_porcentaje": "1"}).status_code == 403
        assert not ConfiguracionPlataforma.objects.exists()

    def test_un_rol_con_el_recurso_si_entra_y_sin_el_no(self):
        usuario = UsuarioFactory(rol=Usuario.Rol.COMPRADOR)
        rol = Rol.objects.create(nombre="finanzas")
        UsuarioRol.objects.create(id_usuario=usuario, id_rol=rol)
        cliente = APIClient()
        cliente.force_authenticate(usuario)
        assert cliente.get(URL).status_code == 403

        RolRecurso.objects.create(
            id_rol=rol, id_recurso=Recurso.objects.get(codigo="admin.configuracion")
        )

        assert cliente.get(URL).status_code == 200

    def test_el_recurso_existe_y_es_del_panel_de_administracion(self):
        recurso = Recurso.objects.get(codigo="admin.configuracion")

        assert recurso.ruta == "/admin/configuracion"
        assert recurso.ambito == "panel_admin"
        assert recurso.es_sistema
        assert recurso.roles.filter(nombre="administrador").exists()


class TestPublica:
    def test_la_tarifa_publica_es_la_que_cobra_el_servidor(self, cliente_admin, cliente_anon):
        _guardar(cliente_admin, {"tarifa_domicilio": "4500"})

        respuesta = cliente_anon.get("/api/configuracion/publica/")

        assert respuesta.status_code == 200
        assert respuesta.json() == {"tarifa_domicilio": "4500.00"}

    def test_no_expone_comision_ni_limites(self, cliente_anon):
        cuerpo = cliente_anon.get("/api/configuracion/publica/").json()

        assert set(cuerpo) == {"tarifa_domicilio"}
