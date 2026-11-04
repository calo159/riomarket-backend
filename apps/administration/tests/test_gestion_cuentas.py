"""El administrador corrige los datos de una cuenta y le restablece la contraseña."""

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import Usuario
from apps.audit.models import RegistroAuditoria
from apps.notifications.models import Notificacion
from apps.rbac.models import Recurso, Rol, RolRecurso, UsuarioRol
from tests.factories import UsuarioFactory

pytestmark = pytest.mark.django_db

USUARIOS = "/api/admin/usuarios/"
MOTIVO = "Lo pidió por teléfono"


def _datos(usuario, **extra):
    datos = {
        "nombre": usuario.nombre,
        "correo": usuario.correo,
        "celular": usuario.celular,
        "motivo": MOTIVO,
    }
    datos.update(extra)
    return datos


def _gestor():
    """Gestiona usuarios por un rol personalizado, sin ser administrador base."""
    usuario = UsuarioFactory(rol=Usuario.Rol.COMPRADOR)
    rol = Rol.objects.create(nombre=f"gestor{usuario.pk}")
    RolRecurso.objects.create(id_rol=rol, id_recurso=Recurso.objects.get(codigo="admin.usuarios"))
    UsuarioRol.objects.create(id_usuario=usuario, id_rol=rol)
    cliente = APIClient()
    cliente.force_authenticate(usuario)
    return cliente


class TestEditarDatos:
    def test_cambia_nombre_correo_y_celular(self, cliente_admin, comprador):
        respuesta = cliente_admin.put(
            f"{USUARIOS}{comprador.pk}/datos/",
            _datos(
                comprador,
                nombre="Nombre Nuevo",
                correo="  Nuevo@Example.COM ",
                celular="310 555 0000",
            ),
            format="json",
        )

        assert respuesta.status_code == 200
        comprador.refresh_from_db()
        assert comprador.nombre == "Nombre Nuevo"
        assert comprador.correo == "nuevo@example.com"
        assert comprador.celular == "3105550000"

    def test_cada_campo_cambiado_queda_en_la_auditoria_con_el_motivo(
        self, cliente_admin, comprador
    ):
        correo_anterior = comprador.correo
        cliente_admin.put(
            f"{USUARIOS}{comprador.pk}/datos/",
            _datos(comprador, correo="otro@example.com", nombre="Otro Nombre"),
            format="json",
        )

        registros = RegistroAuditoria.objects.filter(entidad="usuario", id_entidad=comprador.pk)
        cambios = {r.detalle["campo"]: r.detalle for r in registros}
        assert set(cambios) == {"correo", "nombre"}
        assert cambios["correo"]["de"] == correo_anterior
        assert cambios["correo"]["a"] == "otro@example.com"
        assert cambios["correo"]["motivo"] == MOTIVO

    def test_avisa_a_la_persona(self, cliente_admin, comprador):
        cliente_admin.put(
            f"{USUARIOS}{comprador.pk}/datos/", _datos(comprador, nombre="Otro"), format="json"
        )

        assert Notificacion.objects.filter(
            id_usuario=comprador, titulo="Actualizaron los datos de tu cuenta"
        ).exists()

    def test_sin_cambios_no_hace_nada(self, cliente_admin, comprador):
        respuesta = cliente_admin.put(
            f"{USUARIOS}{comprador.pk}/datos/", _datos(comprador), format="json"
        )

        assert respuesta.status_code == 400
        assert "datos" in respuesta.data["errors"]
        assert not RegistroAuditoria.objects.filter(entidad="usuario", id_entidad=comprador.pk)

    def test_correo_o_celular_de_otra_cuenta_se_rechaza(self, cliente_admin, comprador, vendedor):
        for campo in ("correo", "celular"):
            respuesta = cliente_admin.put(
                f"{USUARIOS}{comprador.pk}/datos/",
                _datos(comprador, **{campo: getattr(vendedor, campo)}),
                format="json",
            )
            assert respuesta.status_code == 400
            assert campo in str(respuesta.data)

    def test_exige_motivo_y_datos_validos(self, cliente_admin, comprador):
        sin_motivo = _datos(comprador, nombre="X")
        sin_motivo.pop("motivo")
        assert (
            cliente_admin.put(
                f"{USUARIOS}{comprador.pk}/datos/", sin_motivo, format="json"
            ).status_code
            == 400
        )
        for malo in ({"correo": "no-es-correo"}, {"celular": "abc"}, {"nombre": ""}):
            respuesta = cliente_admin.put(
                f"{USUARIOS}{comprador.pk}/datos/", _datos(comprador, **malo), format="json"
            )
            assert respuesta.status_code == 400

    def test_no_edita_su_propia_cuenta_desde_aqui(self, cliente_admin, admin):
        respuesta = cliente_admin.put(
            f"{USUARIOS}{admin.pk}/datos/", _datos(admin, nombre="Yo mismo"), format="json"
        )

        assert respuesta.status_code == 400
        assert "Mi perfil" in str(respuesta.data)

    def test_quien_gestiona_por_rol_personalizado_no_toca_a_un_administrador(self, admin):
        respuesta = _gestor().put(
            f"{USUARIOS}{admin.pk}/datos/", _datos(admin, nombre="Hackeado"), format="json"
        )

        assert respuesta.status_code == 403
        admin.refresh_from_db()
        assert admin.nombre != "Hackeado"

    def test_comprador_y_anonimo_no(self, cliente_comprador, cliente_anon, vendedor):
        for cliente in (cliente_comprador, cliente_anon):
            respuesta = cliente.put(
                f"{USUARIOS}{vendedor.pk}/datos/", _datos(vendedor, nombre="X"), format="json"
            )
            assert respuesta.status_code in (401, 403)


class TestRestablecerContrasena:
    def _restablecer(self, cliente, usuario, motivo=MOTIVO):
        return cliente.post(
            f"{USUARIOS}{usuario.pk}/restablecer-contrasena/", {"motivo": motivo}, format="json"
        )

    def test_pone_una_contraseña_temporal_que_funciona(self, cliente_admin, comprador):
        respuesta = self._restablecer(cliente_admin, comprador)

        assert respuesta.status_code == 200
        comprador.refresh_from_db()
        assert comprador.check_password(respuesta.data["password_temporal"])
        ingreso = APIClient().post(
            "/api/auth/login/",
            {"correo": comprador.correo, "password": respuesta.data["password_temporal"]},
            format="json",
        )
        assert ingreso.status_code == 200

    def test_la_contraseña_anterior_deja_de_servir(self, cliente_admin):
        comprador = UsuarioFactory(rol=Usuario.Rol.COMPRADOR, password="ClaveSegura1!")

        self._restablecer(cliente_admin, comprador)

        comprador.refresh_from_db()
        assert not comprador.check_password("ClaveSegura1!")

    def test_cierra_las_sesiones_abiertas(self, cliente_admin, comprador):
        RefreshToken.for_user(comprador)  # una sesión abierta
        assert not BlacklistedToken.objects.exists()

        self._restablecer(cliente_admin, comprador)

        assert BlacklistedToken.objects.filter(token__user=comprador).count() == 1

    def test_queda_auditado_sin_la_contraseña_y_se_avisa(self, cliente_admin, comprador):
        password = self._restablecer(cliente_admin, comprador).data["password_temporal"]

        registro = RegistroAuditoria.objects.get(entidad="usuario", id_entidad=comprador.pk)
        assert registro.detalle["campo"] == "contraseña"
        assert registro.detalle["motivo"] == MOTIVO
        assert password not in str(registro.detalle)
        assert Notificacion.objects.filter(
            id_usuario=comprador, titulo="Restablecieron tu contraseña"
        ).exists()

    def test_exige_motivo(self, cliente_admin, comprador):
        respuesta = cliente_admin.post(
            f"{USUARIOS}{comprador.pk}/restablecer-contrasena/", {}, format="json"
        )

        assert respuesta.status_code == 400

    def test_no_la_restablece_a_si_mismo(self, cliente_admin, admin):
        respuesta = self._restablecer(cliente_admin, admin)

        assert respuesta.status_code == 400
        assert "Mi perfil" in str(respuesta.data)

    def test_quien_gestiona_por_rol_personalizado_no_toca_a_un_administrador(self, admin):
        respuesta = self._restablecer(_gestor(), admin)

        assert respuesta.status_code == 403

    def test_comprador_y_vendedor_no(self, cliente_comprador, cliente_vendedor, comprador):
        assert self._restablecer(cliente_comprador, comprador).status_code == 403
        assert self._restablecer(cliente_vendedor, comprador).status_code == 403


class TestAccionesPermitidas:
    def test_las_dos_acciones_nuevas_se_ofrecen_en_cuentas_ajenas_activas(
        self, cliente_admin, comprador, admin
    ):
        propia = cliente_admin.get(f"{USUARIOS}{admin.pk}/").data["acciones_permitidas"]
        ajena = cliente_admin.get(f"{USUARIOS}{comprador.pk}/").data["acciones_permitidas"]

        assert propia == []
        assert "editar-datos" in ajena and "restablecer-contrasena" in ajena
