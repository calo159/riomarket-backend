"""Exportar a CSV usuarios, auditoría, pedidos y pagos, con los mismos filtros del listado."""

import csv
import io
from decimal import Decimal

import pytest

from apps.accounts.models import Usuario
from apps.audit.models import RegistroAuditoria
from apps.common import exportacion
from tests.factories import PagoFactory, PedidoFactory, PuestoFactory, UsuarioFactory

pytestmark = pytest.mark.django_db


def _filas(respuesta):
    contenido = respuesta.content.decode("utf-8-sig")
    return list(csv.reader(io.StringIO(contenido)))


class TestCelda:
    @pytest.mark.parametrize("peligroso", ["=1+1", "+cmd", "-2+3", "@SUM(A1)", "\tx", "\rx"])
    def test_un_texto_que_parece_formula_se_neutraliza(self, peligroso):
        assert exportacion.celda(peligroso) == "'" + peligroso

    def test_los_numeros_negativos_no_se_tocan(self):
        assert exportacion.celda(-200) == "-200"
        assert exportacion.celda(Decimal("-5.50")) == "-5.50"

    def test_tipos_comunes(self):
        assert exportacion.celda(None) == ""
        assert exportacion.celda(True) == "sí"
        assert exportacion.celda("Gómez") == "Gómez"


class TestExportarUsuarios:
    def test_descarga_un_csv_con_encabezados_y_tildes(self, cliente_admin):
        UsuarioFactory(nombre="María Gómez", rol=Usuario.Rol.COMPRADOR)

        respuesta = cliente_admin.get("/api/admin/usuarios/exportar/")

        assert respuesta.status_code == 200
        assert respuesta["Content-Type"].startswith("text/csv")
        assert respuesta["Content-Disposition"].startswith('attachment; filename="usuarios-')
        assert respuesta.content.startswith("﻿".encode())  # Excel lee bien las tildes
        filas = _filas(respuesta)
        assert filas[0][:3] == ["ID", "Nombre", "Correo"]
        assert any("María Gómez" in fila for fila in filas)

    def test_respeta_los_filtros_del_listado(self, cliente_admin, comprador, vendedor):
        filas = _filas(cliente_admin.get("/api/admin/usuarios/exportar/", {"rol": "vendedor"}))

        correos = {fila[2] for fila in filas[1:]}
        assert vendedor.correo in correos
        assert comprador.correo not in correos

    def test_un_nombre_malicioso_no_ejecuta_formulas(self, cliente_admin):
        UsuarioFactory(nombre='=HYPERLINK("http://x")', rol=Usuario.Rol.COMPRADOR)

        filas = _filas(cliente_admin.get("/api/admin/usuarios/exportar/"))

        nombres = {fila[1] for fila in filas[1:]}
        assert '\'=HYPERLINK("http://x")' in nombres

    def test_solo_quien_gestiona_usuarios(self, cliente_comprador, cliente_vendedor, cliente_anon):
        for cliente in (cliente_comprador, cliente_vendedor, cliente_anon):
            assert cliente.get("/api/admin/usuarios/exportar/").status_code in (401, 403)

    def test_avisa_cuando_corta_en_el_tope(self, cliente_admin, monkeypatch):
        monkeypatch.setattr(exportacion, "LIMITE_FILAS", 2)
        UsuarioFactory.create_batch(4, rol=Usuario.Rol.COMPRADOR)

        respuesta = cliente_admin.get("/api/admin/usuarios/exportar/")

        assert respuesta["X-Exportacion-Truncada"] == "1"
        assert respuesta["X-Total-Filas"] == "2"
        assert len(_filas(respuesta)) == 3  # encabezado + 2


class TestBusquedaYExportacionDeAuditoria:
    def _registro(self, usuario, accion="actualizar", entidad="usuario", **detalle):
        return RegistroAuditoria.objects.create(
            id_usuario=usuario, accion=accion, entidad=entidad, id_entidad=1, detalle=detalle
        )

    def test_busca_por_correo_nombre_o_entidad(self, cliente_admin, admin, comprador):
        self._registro(admin, entidad="usuario")
        self._registro(comprador, entidad="pedido")

        por_correo = cliente_admin.get("/api/audit/registros/", {"q": comprador.correo})
        por_entidad = cliente_admin.get("/api/audit/registros/", {"q": "pedido"})

        assert [r["entidad"] for r in por_correo.data["results"]] == ["pedido"]
        assert [r["entidad"] for r in por_entidad.data["results"]] == ["pedido"]

    def test_descarga_el_detalle_y_marca_las_acciones_del_sistema(self, cliente_admin, admin):
        self._registro(admin, campo="rol", de="comprador", a="vendedor", motivo="Pidió vender")
        self._registro(None, accion="vencimiento", entidad="pedido")

        filas = _filas(cliente_admin.get("/api/audit/registros/exportar/"))

        assert filas[0] == ["Fecha", "Usuario", "Acción", "Entidad", "ID", "Detalle", "IP"]
        usuarios = {fila[1] for fila in filas[1:]}
        assert {admin.correo, "Sistema"} <= usuarios
        assert any("Pidió vender" in fila[5] for fila in filas[1:])

    def test_la_exportacion_respeta_los_filtros(self, cliente_admin, admin):
        self._registro(admin, accion="actualizar")
        self._registro(admin, accion="crear")

        filas = _filas(cliente_admin.get("/api/audit/registros/exportar/", {"accion": "crear"}))

        assert [fila[2] for fila in filas[1:]] == ["crear"]

    def test_solo_quien_ve_la_auditoria(self, cliente_comprador, cliente_anon):
        for cliente in (cliente_comprador, cliente_anon):
            assert cliente.get("/api/audit/registros/exportar/").status_code in (401, 403)


class TestExportarPedidosYPagos:
    def _pedido_con_pago(self):
        puesto = PuestoFactory(nombre="=Peligro")
        pedido = PedidoFactory(id_puesto=puesto)
        PagoFactory(
            id_pedido=pedido,
            subtotal_pedido=Decimal("12000.00"),
            total_cobrado=Decimal("12000.00"),
        )
        return pedido

    def test_pagos(self, cliente_admin):
        pedido = self._pedido_con_pago()

        respuesta = cliente_admin.get("/api/payments/pagos/exportar/")

        assert respuesta.status_code == 200
        filas = _filas(respuesta)
        assert filas[0][:3] == ["ID", "Pedido", "Puesto"]
        assert filas[1][1] == str(pedido.pk)
        assert filas[1][2] == "'=Peligro"
        assert "12000.00" in filas[1]

    def test_pedidos(self, cliente_admin):
        pedido = self._pedido_con_pago()

        respuesta = cliente_admin.get("/api/orders/pedidos/exportar/")

        assert respuesta.status_code == 200
        filas = _filas(respuesta)
        assert filas[0][:3] == ["ID", "Comprador", "Puesto"]
        assert filas[1][0] == str(pedido.pk)

    def test_el_filtro_de_estado_aplica_a_los_pedidos(self, cliente_admin):
        PedidoFactory(estado="pendiente")
        PedidoFactory(estado="entregado")

        filas = _filas(cliente_admin.get("/api/orders/pedidos/exportar/", {"estado": "entregado"}))

        assert [fila[4] for fila in filas[1:]] == ["entregado"]

    def test_solo_administradores_no_el_comprador_ni_el_vendedor(
        self, cliente_comprador, cliente_vendedor, cliente_anon
    ):
        for ruta in ("/api/payments/pagos/exportar/", "/api/orders/pedidos/exportar/"):
            for cliente in (cliente_comprador, cliente_vendedor, cliente_anon):
                assert cliente.get(ruta).status_code in (401, 403)


class TestEncabezadosParaElNavegador:
    def test_la_app_en_otro_origen_puede_leer_el_nombre_y_el_conteo(self, cliente_admin, settings):
        settings.CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]

        respuesta = cliente_admin.get(
            "/api/admin/usuarios/exportar/", HTTP_ORIGIN="http://localhost:3000"
        )

        assert respuesta.status_code == 200
        expuestos = {
            h.strip().lower() for h in respuesta["Access-Control-Expose-Headers"].split(",")
        }
        assert {"content-disposition", "x-total-filas", "x-exportacion-truncada"} <= expuestos
