"""API de roles, recursos y asignación de roles: reglas, candados y permisos."""

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import Usuario
from apps.audit.models import RegistroAuditoria
from apps.catalog.models import Puesto
from apps.notifications.models import Notificacion
from apps.orders.models import Pedido
from apps.rbac.acceso import recursos_de_usuario
from apps.rbac.models import Recurso, Rol, RolRecurso, UsuarioRol
from tests.factories import PedidoFactory, UsuarioFactory

ROLES = "/api/admin/roles/"
RECURSOS = "/api/admin/recursos/"
USUARIOS = "/api/admin/usuarios/"

pytestmark = pytest.mark.django_db


def cliente(usuario):
    c = APIClient()
    c.force_authenticate(usuario)
    return c


def ids(*codigos):
    return list(Recurso.objects.filter(codigo__in=codigos).values_list("id", flat=True))


def rol_con(nombre, *codigos):
    rol = Rol.objects.create(nombre=nombre)
    for recurso in Recurso.objects.filter(codigo__in=codigos):
        RolRecurso.objects.create(id_rol=rol, id_recurso=recurso)
    return rol


def dar_rol(usuario, rol):
    UsuarioRol.objects.create(id_usuario=usuario, id_rol=rol)


class TestPermisosPorRecurso:
    @pytest.mark.parametrize("url", [ROLES, RECURSOS, USUARIOS, "/api/admin/resumen/"])
    def test_anonimo_401(self, url):
        assert APIClient().get(url).status_code == 401

    @pytest.mark.parametrize("url", [ROLES, RECURSOS, USUARIOS, "/api/admin/resumen/"])
    @pytest.mark.parametrize("rol", ["comprador", "vendedor"])
    def test_sin_recurso_403(self, url, rol):
        assert cliente(UsuarioFactory(rol=rol)).get(url).status_code == 403

    def test_rol_personalizado_sin_recurso_403_y_con_recurso_200(self):
        usuario = UsuarioFactory()
        rol = rol_con("auditor", "admin.resumen")
        dar_rol(usuario, rol)
        c = cliente(usuario)
        assert c.get("/api/admin/resumen/").status_code == 200
        assert c.get(USUARIOS).status_code == 403
        assert c.get(ROLES).status_code == 403

    def test_cambiar_rol_y_roles_exigen_admin_roles(self):
        gestor = UsuarioFactory()
        dar_rol(gestor, rol_con("gestor", "admin.usuarios"))
        objetivo = UsuarioFactory()
        c = cliente(gestor)
        assert c.get(f"{USUARIOS}{objetivo.pk}/").status_code == 200
        r = c.post(
            f"{USUARIOS}{objetivo.pk}/cambiar-rol/",
            {"rol": "vendedor", "motivo": "Prueba de permisos"},
            format="json",
        )
        assert r.status_code == 403
        r = c.put(
            f"{USUARIOS}{objetivo.pk}/roles/", {"roles": [], "motivo": "Prueba"}, format="json"
        )
        assert r.status_code == 403
        assert (
            c.post(
                f"{USUARIOS}{objetivo.pk}/suspender/", {"motivo": "Incumple normas"}, format="json"
            ).status_code
            == 200
        )


class TestRoles:
    def test_crear_listar_y_auditar(self):
        admin = UsuarioFactory(rol="administrador")
        c = cliente(admin)
        r = c.post(ROLES, {"nombre": "  moderador ", "descripcion": "Modera"}, format="json")
        assert r.status_code == 201
        assert r.data["nombre"] == "moderador"
        assert r.data["total_usuarios"] == 0
        assert RegistroAuditoria.objects.filter(entidad="rol", accion="crear").exists()
        lista = c.get(ROLES, {"q": "moder"})
        assert [x["nombre"] for x in lista.data["results"]] == ["moderador"]

    @pytest.mark.parametrize("nombre", ["ab", "x" * 41, "Comprador", "ADMINISTRADOR"])
    def test_nombre_invalido_o_repetido(self, nombre):
        admin = UsuarioFactory(rol="administrador")
        r = cliente(admin).post(ROLES, {"nombre": nombre}, format="json")
        assert r.status_code == 400

    def test_nombre_unico_sin_distinguir_mayusculas(self):
        admin = UsuarioFactory(rol="administrador")
        c = cliente(admin)
        c.post(ROLES, {"nombre": "Moderador"}, format="json")
        assert c.post(ROLES, {"nombre": "moderador"}, format="json").status_code == 400

    def test_editar_y_desactivar_personalizado(self):
        admin = UsuarioFactory(rol="administrador")
        rol = rol_con("moderador", "admin.puestos")
        r = cliente(admin).patch(
            f"{ROLES}{rol.pk}/", {"nombre": "supervisor", "activo": False}, format="json"
        )
        assert r.status_code == 200
        rol.refresh_from_db()
        assert (rol.nombre, rol.activo) == ("supervisor", False)

    def test_rol_inactivo_no_otorga(self):
        usuario = UsuarioFactory()
        rol = rol_con("moderador", "admin.puestos")
        dar_rol(usuario, rol)
        assert "admin.puestos" in recursos_de_usuario(usuario)
        cliente(UsuarioFactory(rol="administrador")).patch(
            f"{ROLES}{rol.pk}/", {"activo": False}, format="json"
        )
        assert "admin.puestos" not in recursos_de_usuario(usuario)

    def test_rol_sistema_solo_edita_descripcion(self):
        admin = UsuarioFactory(rol="administrador")
        c = cliente(admin)
        base = Rol.objects.get(nombre="comprador")
        assert c.patch(f"{ROLES}{base.pk}/", {"nombre": "otro"}, format="json").status_code == 400
        assert c.patch(f"{ROLES}{base.pk}/", {"activo": False}, format="json").status_code == 400
        assert (
            c.patch(f"{ROLES}{base.pk}/", {"descripcion": "Nueva"}, format="json").status_code
            == 200
        )
        assert c.delete(f"{ROLES}{base.pk}/").status_code == 400

    def test_eliminar_con_usuarios_bloquea_e_indica_cuantos(self):
        admin = UsuarioFactory(rol="administrador")
        rol = rol_con("moderador")
        dar_rol(UsuarioFactory(), rol)
        r = cliente(admin).delete(f"{ROLES}{rol.pk}/")
        assert r.status_code == 400
        assert "1 usuario" in str(r.data)
        assert "desactív" in str(r.data)

    def test_eliminar_sin_usuarios(self):
        admin = UsuarioFactory(rol="administrador")
        rol = rol_con("moderador", "admin.puestos")
        assert cliente(admin).delete(f"{ROLES}{rol.pk}/").status_code == 204
        assert not Rol.objects.filter(pk=rol.pk).exists()
        assert RegistroAuditoria.objects.filter(entidad="rol", accion="eliminar").exists()

    def test_asignar_recursos(self):
        admin = UsuarioFactory(rol="administrador")
        rol = Rol.objects.create(nombre="moderador")
        r = cliente(admin).put(
            f"{ROLES}{rol.pk}/recursos/",
            {"recursos": ids("admin.puestos", "admin.productos"), "motivo": "Equipo de moderación"},
            format="json",
        )
        assert r.status_code == 200
        assert r.data["total_recursos"] == 2
        assert len(r.data["recursos"]) == 2
        log = RegistroAuditoria.objects.get(entidad="rol", id_entidad=rol.pk)
        assert log.detalle["campo"] == "recursos"
        assert log.detalle["motivo"] == "Equipo de moderación"

    def test_asignar_recursos_exige_motivo_y_ids_validos(self):
        admin = UsuarioFactory(rol="administrador")
        rol = Rol.objects.create(nombre="moderador")
        c = cliente(admin)
        assert (
            c.put(f"{ROLES}{rol.pk}/recursos/", {"recursos": []}, format="json").status_code == 400
        )
        r = c.put(
            f"{ROLES}{rol.pk}/recursos/",
            {"recursos": [999999], "motivo": "Motivo válido"},
            format="json",
        )
        assert r.status_code == 400

    def test_administrador_no_pierde_recursos_obligatorios(self):
        admin = UsuarioFactory(rol="administrador")
        rol = Rol.objects.get(nombre="administrador")
        sin_roles = [
            i for i in rol.recursos.values_list("id", flat=True) if i not in ids("admin.roles")
        ]
        r = cliente(admin).put(
            f"{ROLES}{rol.pk}/recursos/",
            {"recursos": sin_roles, "motivo": "Quitar roles"},
            format="json",
        )
        assert r.status_code == 400
        assert "admin.roles" in str(r.data)
        assert rol.recursos.filter(codigo="admin.roles").exists()

    def test_quitar_recurso_opcional_al_administrador_si_se_pierde(self):
        admin = UsuarioFactory(rol="administrador")
        rol = Rol.objects.get(nombre="administrador")
        resto = [
            i for i in rol.recursos.values_list("id", flat=True) if i not in ids("admin.auditoria")
        ]
        r = cliente(admin).put(
            f"{ROLES}{rol.pk}/recursos/",
            {"recursos": resto, "motivo": "Sin auditoría"},
            format="json",
        )
        assert r.status_code == 200
        assert "admin.auditoria" not in recursos_de_usuario(admin)

    def test_no_modifica_recursos_de_un_rol_propio_si_no_es_admin_base(self):
        gestor = UsuarioFactory()
        propio = rol_con("gestores", "admin.roles", "admin.puestos")
        dar_rol(gestor, propio)
        r = cliente(gestor).put(
            f"{ROLES}{propio.pk}/recursos/",
            {"recursos": ids("admin.roles", "admin.usuarios"), "motivo": "Auto ascenso"},
            format="json",
        )
        assert r.status_code == 403
        otro = Rol.objects.create(nombre="otro")
        r = cliente(gestor).put(
            f"{ROLES}{otro.pk}/recursos/",
            {"recursos": ids("admin.puestos"), "motivo": "Rol ajeno"},
            format="json",
        )
        assert r.status_code == 200


class TestRecursos:
    DATOS = {
        "codigo": "reportes.ventas",
        "nombre": "Reportes",
        "ambito": "panel_admin",
        "ruta": "/admin/reportes",
        "icono": "BarChart",
        "grupo": "Operación",
        "orden": 9,
    }

    def test_crud(self):
        admin = UsuarioFactory(rol="administrador")
        c = cliente(admin)
        r = c.post(RECURSOS, self.DATOS, format="json")
        assert r.status_code == 201
        assert r.data["es_sistema"] is False
        pk = r.data["id"]
        r = c.patch(f"{RECURSOS}{pk}/", {"nombre": "Ventas"}, format="json")
        assert r.data["nombre"] == "Ventas"
        assert c.get(RECURSOS, {"ambito": "panel_admin", "q": "reportes"}).data["count"] == 1
        assert c.get(RECURSOS, {"activo": "false"}).data["count"] == 0
        assert c.delete(f"{RECURSOS}{pk}/").status_code == 200

    @pytest.mark.parametrize(
        "cambio",
        [{"codigo": "Mal Codigo"}, {"codigo": "ab"}, {"ruta": "sin-barra"}, {"ambito": "otro"}],
    )
    def test_validaciones(self, cambio):
        admin = UsuarioFactory(rol="administrador")
        r = cliente(admin).post(RECURSOS, {**self.DATOS, **cambio}, format="json")
        assert r.status_code == 400

    def test_codigo_unico(self):
        admin = UsuarioFactory(rol="administrador")
        c = cliente(admin)
        c.post(RECURSOS, self.DATOS, format="json")
        assert c.post(RECURSOS, self.DATOS, format="json").status_code == 400

    def test_eliminar_borra_vinculos_e_informa_roles(self):
        admin = UsuarioFactory(rol="administrador")
        c = cliente(admin)
        pk = c.post(RECURSOS, self.DATOS, format="json").data["id"]
        for nombre in ("uno", "dos"):
            RolRecurso.objects.create(id_rol=Rol.objects.create(nombre=nombre), id_recurso_id=pk)
        r = c.delete(f"{RECURSOS}{pk}/")
        assert r.data == {"roles_afectados": 2}
        assert not RolRecurso.objects.filter(id_recurso_id=pk).exists()

    def test_recurso_sistema_candados(self):
        admin = UsuarioFactory(rol="administrador")
        c = cliente(admin)
        rec = Recurso.objects.get(codigo="admin.puestos")
        assert c.delete(f"{RECURSOS}{rec.pk}/").status_code == 400
        for cambio in (
            {"activo": False},
            {"codigo": "otro.codigo"},
            {"ruta": "/x"},
            {"ambito": "cuenta"},
            {"es_publico": True},
        ):
            assert c.patch(f"{RECURSOS}{rec.pk}/", cambio, format="json").status_code == 400
        r = c.patch(f"{RECURSOS}{rec.pk}/", {"nombre": "Puestos!", "orden": 7}, format="json")
        assert r.status_code == 200

    def test_recurso_nuevo_otorgado_a_un_rol_da_acceso(self):
        usuario = UsuarioFactory()
        rol = Rol.objects.create(nombre="reportero")
        dar_rol(usuario, rol)
        admin = UsuarioFactory(rol="administrador")
        c = cliente(admin)
        pk = c.post(RECURSOS, self.DATOS, format="json").data["id"]
        c.put(
            f"{ROLES}{rol.pk}/recursos/", {"recursos": [pk], "motivo": "Dar acceso"}, format="json"
        )
        assert "reportes.ventas" in recursos_de_usuario(usuario)


class TestUsuarios:
    def test_lista_con_roles_asignados_y_filtro(self):
        admin = UsuarioFactory(rol="administrador")
        rol = rol_con("moderador")
        u = UsuarioFactory()
        dar_rol(u, rol)
        c = cliente(admin)
        r = c.get(USUARIOS, {"rol_asignado": rol.pk})
        assert [x["id"] for x in r.data["results"]] == [u.pk]
        nombres = [a["nombre"] for a in r.data["results"][0]["roles_asignados"]]
        assert nombres == ["comprador", "moderador"]

    def test_lista_sin_n_mas_uno(self, django_assert_max_num_queries):
        admin = UsuarioFactory(rol="administrador")
        for _ in range(8):
            dar_rol(UsuarioFactory(), rol_con(f"r{_}"))
        c = cliente(admin)
        with django_assert_max_num_queries(12):
            assert c.get(USUARIOS).status_code == 200

    def test_asignar_roles_adicionales(self):
        admin = UsuarioFactory(rol="administrador")
        rol = rol_con("moderador", "admin.puestos")
        u = UsuarioFactory()
        r = cliente(admin).put(
            f"{USUARIOS}{u.pk}/roles/",
            {"roles": [rol.pk], "motivo": "Será moderador"},
            format="json",
        )
        assert r.status_code == 200
        assert "admin.puestos" in recursos_de_usuario(u)
        assert Notificacion.objects.filter(id_usuario=u).exists()
        assert RegistroAuditoria.objects.filter(
            entidad="usuario", id_entidad=u.pk, detalle__campo="roles_adicionales"
        ).exists()
        # quitar
        cliente(admin).put(
            f"{USUARIOS}{u.pk}/roles/", {"roles": [], "motivo": "Ya no aplica"}, format="json"
        )
        assert "admin.puestos" not in recursos_de_usuario(u)
        assert u.asignaciones_rol.filter(id_rol__nombre="comprador").exists()

    def test_no_asigna_roles_base_ni_inexistentes(self):
        admin = UsuarioFactory(rol="administrador")
        u = UsuarioFactory()
        base = Rol.objects.get(nombre="administrador")
        for lista in ([base.pk], [999999]):
            r = cliente(admin).put(
                f"{USUARIOS}{u.pk}/roles/",
                {"roles": lista, "motivo": "Intento inválido"},
                format="json",
            )
            assert r.status_code == 400

    def test_no_edita_sus_propios_roles(self):
        admin = UsuarioFactory(rol="administrador")
        r = cliente(admin).put(
            f"{USUARIOS}{admin.pk}/roles/", {"roles": [], "motivo": "Auto edición"}, format="json"
        )
        assert r.status_code == 400

    def test_no_admin_no_toca_a_un_admin(self):
        gestor = UsuarioFactory()
        dar_rol(gestor, rol_con("gestor", "admin.usuarios", "admin.roles"))
        admin = UsuarioFactory(rol="administrador")
        UsuarioFactory(rol="administrador")
        c = cliente(gestor)
        assert (
            c.put(
                f"{USUARIOS}{admin.pk}/roles/", {"roles": [], "motivo": "Intento"}, format="json"
            ).status_code
            == 403
        )
        assert (
            c.post(
                f"{USUARIOS}{admin.pk}/suspender/", {"motivo": "Intento banear"}, format="json"
            ).status_code
            == 403
        )
        assert c.get(f"{USUARIOS}{admin.pk}/").data["acciones_permitidas"] == []

    def test_no_admin_no_otorga_administrador(self):
        gestor = UsuarioFactory()
        dar_rol(gestor, rol_con("gestor", "admin.usuarios", "admin.roles"))
        u = UsuarioFactory()
        r = cliente(gestor).post(
            f"{USUARIOS}{u.pk}/cambiar-rol/",
            {"rol": "administrador", "motivo": "Escalada"},
            format="json",
        )
        assert r.status_code == 403
        u.refresh_from_db()
        assert u.rol == "comprador"

    def test_admin_otorga_administrador(self):
        admin = UsuarioFactory(rol="administrador")
        u = UsuarioFactory()
        r = cliente(admin).post(
            f"{USUARIOS}{u.pk}/cambiar-rol/",
            {"rol": "administrador", "motivo": "Nuevo admin"},
            format="json",
        )
        assert r.status_code == 200
        assert "admin.usuarios" in recursos_de_usuario(Usuario.objects.get(pk=u.pk))

    def test_ultimo_admin_no_se_degrada_ni_suspende(self):
        solo = UsuarioFactory(rol="administrador")
        gestor = UsuarioFactory()
        dar_rol(gestor, rol_con("gestor", "admin.usuarios", "admin.roles"))
        # gestor no es admin base: 403 por alcance; con un segundo admin se prueba el bloqueo real.
        otro = UsuarioFactory(rol="administrador", estado="suspendido")
        c = cliente(otro)
        assert c.get(USUARIOS).status_code == 403  # suspendido no administra
        c = cliente(solo)
        # el único admin activo no puede tocarse a sí mismo
        assert (
            c.post(
                f"{USUARIOS}{solo.pk}/suspender/", {"motivo": "Prueba"}, format="json"
            ).status_code
            == 400
        )

    def test_ultimo_admin_bloqueado_por_otro_actor(self):
        activo = UsuarioFactory(rol="administrador")
        segundo = UsuarioFactory(rol="administrador")
        c = cliente(activo)
        assert (
            c.post(
                f"{USUARIOS}{segundo.pk}/suspender/", {"motivo": "Baneo uno"}, format="json"
            ).status_code
            == 200
        )
        # ahora `activo` es el único; el suspendido no puede actuar y `activo` no puede quitarse.
        r = cliente(segundo).post(
            f"{USUARIOS}{activo.pk}/cambiar-rol/",
            {"rol": "comprador", "motivo": "Degradar"},
            format="json",
        )
        assert r.status_code == 400
        assert "último administrador" in str(r.data)

    def test_cambio_de_rol_base_quita_las_acciones_del_rol_anterior(self):
        admin = UsuarioFactory(rol="administrador")
        otro = UsuarioFactory(rol="administrador")
        assert cliente(otro).get(USUARIOS).status_code == 200
        cliente(admin).post(
            f"{USUARIOS}{otro.pk}/cambiar-rol/",
            {"rol": "comprador", "motivo": "Degradado"},
            format="json",
        )
        assert cliente(Usuario.objects.get(pk=otro.pk)).get(USUARIOS).status_code == 403

    def test_cambio_de_rol_bloquea_con_pedidos_activos_en_cualquier_sentido(
        self, vendedor_con_puesto
    ):
        vendedor, puesto = vendedor_con_puesto
        PedidoFactory(id_puesto=puesto, estado=Pedido.Estado.CONFIRMADO)
        admin = UsuarioFactory(rol="administrador")
        r = cliente(admin).post(
            f"{USUARIOS}{vendedor.pk}/cambiar-rol/",
            {"rol": "administrador", "motivo": "Promoción"},
            format="json",
        )
        assert r.status_code == 400
        assert "1 pedido" in str(r.data)

    def test_comprador_con_pedidos_activos_no_cambia_a_vendedor(self, vendedor_con_puesto):
        _, puesto = vendedor_con_puesto
        comprador = UsuarioFactory()
        PedidoFactory(id_comprador=comprador, id_puesto=puesto, estado=Pedido.Estado.PENDIENTE)
        admin = UsuarioFactory(rol="administrador")
        r = cliente(admin).post(
            f"{USUARIOS}{comprador.pk}/cambiar-rol/",
            {"rol": "vendedor", "motivo": "Ahora vende"},
            format="json",
        )
        assert r.status_code == 400

    def test_comprador_a_vendedor_queda_pendiente(self):
        admin = UsuarioFactory(rol="administrador")
        u = UsuarioFactory()
        RefreshToken.for_user(u)
        cliente(admin).post(
            f"{USUARIOS}{u.pk}/cambiar-rol/",
            {"rol": "vendedor", "motivo": "Ahora vende"},
            format="json",
        )
        u.refresh_from_db()
        assert u.vendedor.estado_verificacion == "pendiente"
        assert not u.puede_publicar()
        assert BlacklistedToken.objects.filter(token__user=u).exists()
        assert set(u.asignaciones_rol.values_list("id_rol__nombre", flat=True)) == {"vendedor"}

    def test_ban_conserva_roles_y_oculta_puestos(self, vendedor_con_puesto):
        vendedor, puesto = vendedor_con_puesto
        rol = rol_con("moderador", "admin.puestos")
        dar_rol(vendedor, rol)
        admin = UsuarioFactory(rol="administrador")
        cliente(admin).post(
            f"{USUARIOS}{vendedor.pk}/suspender/", {"motivo": "Fraude comprobado"}, format="json"
        )
        puesto.refresh_from_db()
        assert puesto.estado == Puesto.Estado.SUSPENDIDO
        assert vendedor.asignaciones_rol.count() == 2
        assert recursos_de_usuario(Usuario.objects.get(pk=vendedor.pk)) == {"catalogo"}


@pytest.fixture
def vendedor_con_puesto():
    from tests.factories import PuestoFactory, VendedorFactory

    vendedor = UsuarioFactory(rol="vendedor")
    VendedorFactory(id_usuario=vendedor)
    return vendedor, PuestoFactory(id_vendedor=vendedor)


class TestResumen:
    def test_consultas_acotadas(self, django_assert_max_num_queries):
        admin = UsuarioFactory(rol="administrador")
        with django_assert_max_num_queries(25):
            assert cliente(admin).get("/api/admin/resumen/").status_code == 200
