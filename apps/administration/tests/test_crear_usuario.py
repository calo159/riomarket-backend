"""El administrador crea cuentas con un botón: el sistema genera una contraseña temporal."""

import string

import pytest
from django.contrib.auth import password_validation
from rest_framework.test import APIClient

from apps.accounts.models import Usuario
from apps.administration import services
from apps.audit.models import RegistroAuditoria
from apps.rbac.acceso import tiene_recurso
from apps.rbac.models import Recurso, Rol, RolRecurso, UsuarioRol
from tests.factories import UsuarioFactory

pytestmark = pytest.mark.django_db

USUARIOS = "/api/admin/usuarios/"


def _datos(**extra):
    datos = {
        "nombre": "Marta Gómez",
        "correo": "marta@example.com",
        "celular": "3105550101",
        "rol": "comprador",
    }
    datos.update(extra)
    return datos


def _gestor():
    """Usuario con admin.usuarios pero sin ser administrador base (rol personalizado)."""
    usuario = UsuarioFactory(rol=Usuario.Rol.COMPRADOR)
    rol = Rol.objects.create(nombre=f"gestor{usuario.pk}")
    RolRecurso.objects.create(id_rol=rol, id_recurso=Recurso.objects.get(codigo="admin.usuarios"))
    UsuarioRol.objects.create(id_usuario=usuario, id_rol=rol)
    cliente = APIClient()
    cliente.force_authenticate(usuario)
    return usuario, cliente


class TestCrearCuenta:
    def test_crea_un_comprador_activo_con_contraseña_temporal(self, cliente_admin):
        respuesta = cliente_admin.post(USUARIOS, _datos(), format="json")

        assert respuesta.status_code == 201
        usuario = Usuario.objects.get(correo="marta@example.com")
        assert (usuario.nombre, usuario.rol, usuario.estado) == (
            "Marta Gómez",
            "comprador",
            "activo",
        )
        assert respuesta.data["id"] == usuario.pk
        assert usuario.check_password(respuesta.data["password_temporal"])

    def test_la_persona_entra_con_la_contraseña_temporal(self, cliente_admin):
        respuesta = cliente_admin.post(USUARIOS, _datos(), format="json")

        ingreso = APIClient().post(
            "/api/auth/login/",
            {"correo": "marta@example.com", "password": respuesta.data["password_temporal"]},
            format="json",
        )
        assert ingreso.status_code == 200
        assert ingreso.data["usuario"]["rol"] == "comprador"

    def test_un_vendedor_nace_pendiente_de_verificacion(self, cliente_admin):
        respuesta = cliente_admin.post(USUARIOS, _datos(rol="vendedor"), format="json")

        assert respuesta.status_code == 201
        assert respuesta.data["estado_verificacion"] == "pendiente"

    def test_un_administrador_crea_a_otro_administrador_con_sus_accesos(self, cliente_admin):
        respuesta = cliente_admin.post(USUARIOS, _datos(rol="administrador"), format="json")

        assert respuesta.status_code == 201
        nuevo = Usuario.objects.get(correo="marta@example.com")
        assert tiene_recurso(nuevo, "admin.usuarios")

    def test_normaliza_el_correo_y_el_celular(self, cliente_admin):
        cliente_admin.post(
            USUARIOS,
            _datos(correo="  Marta@Example.COM ", celular="+57 310 555 0101"),
            format="json",
        )

        assert Usuario.objects.filter(correo="marta@example.com").exists()

    def test_el_listado_nunca_trae_contraseñas(self, cliente_admin):
        cliente_admin.post(USUARIOS, _datos(), format="json")

        listado = cliente_admin.get(USUARIOS)

        assert listado.status_code == 200
        assert all("password_temporal" not in fila for fila in listado.data["results"])


class TestContraseñaTemporal:
    def test_es_distinta_cada_vez_y_valida(self, cliente_admin):
        a = cliente_admin.post(USUARIOS, _datos(), format="json").data["password_temporal"]
        b = cliente_admin.post(
            USUARIOS, _datos(correo="otra@example.com", celular="3105550102"), format="json"
        ).data["password_temporal"]

        assert a != b
        for password in (a, b):
            password_validation.validate_password(password)  # no lanza

    @pytest.mark.parametrize("_", range(25))
    def test_largo_y_caracteres_legibles(self, _):
        password = services.generar_password_temporal()

        assert len(password) == services.LARGO_PASSWORD_TEMPORAL
        assert any(c in string.ascii_letters for c in password)
        assert any(c in string.digits for c in password)
        assert not set(password) & set("0O1lI")  # nada que se confunda al dictarla

    def test_no_queda_en_la_auditoria(self, cliente_admin):
        password = cliente_admin.post(USUARIOS, _datos(), format="json").data["password_temporal"]

        registro = RegistroAuditoria.objects.get(accion="crear", entidad="usuario")
        assert password not in str(registro.detalle)
        assert registro.detalle["rol"] == "comprador"
        assert registro.id_usuario is not None  # queda quién la creó


class TestValidaciones:
    def test_correo_repetido_sin_importar_mayusculas(self, cliente_admin, comprador):
        respuesta = cliente_admin.post(
            USUARIOS, _datos(correo=comprador.correo.upper()), format="json"
        )

        assert respuesta.status_code == 400
        assert "correo" in str(respuesta.data)

    def test_celular_repetido(self, cliente_admin, comprador):
        respuesta = cliente_admin.post(USUARIOS, _datos(celular=comprador.celular), format="json")

        assert respuesta.status_code == 400
        assert "celular" in str(respuesta.data)

    @pytest.mark.parametrize(
        "cambio",
        [
            {"rol": "superusuario"},
            {"correo": "no-es-correo"},
            {"celular": "abc"},
            {"nombre": ""},
        ],
    )
    def test_datos_invalidos(self, cliente_admin, cambio):
        respuesta = cliente_admin.post(USUARIOS, _datos(**cambio), format="json")

        assert respuesta.status_code == 400
        assert not Usuario.objects.filter(correo="marta@example.com").exists()

    def test_faltan_campos(self, cliente_admin):
        respuesta = cliente_admin.post(USUARIOS, {"nombre": "Solo nombre"}, format="json")

        assert respuesta.status_code == 400
        for campo in ("correo", "celular", "rol"):
            assert campo in str(respuesta.data)


class TestQuienPuede:
    def test_el_comprador_el_vendedor_y_el_anonimo_no(
        self, cliente_comprador, cliente_vendedor, cliente_anon
    ):
        assert cliente_comprador.post(USUARIOS, _datos(), format="json").status_code == 403
        assert cliente_vendedor.post(USUARIOS, _datos(), format="json").status_code == 403
        assert cliente_anon.post(USUARIOS, _datos(), format="json").status_code in (401, 403)
        assert not Usuario.objects.filter(correo="marta@example.com").exists()

    def test_quien_gestiona_usuarios_sin_ser_admin_crea_cuentas_pero_no_administradores(self):
        _, cliente = _gestor()

        assert cliente.post(USUARIOS, _datos(), format="json").status_code == 201
        respuesta = cliente.post(
            USUARIOS,
            _datos(correo="jefe@example.com", celular="3105550199", rol="administrador"),
            format="json",
        )

        assert respuesta.status_code == 403
        assert not Usuario.objects.filter(correo="jefe@example.com").exists()
