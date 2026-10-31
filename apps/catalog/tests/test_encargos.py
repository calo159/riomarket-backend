"""Productos por encargo (ADR-013): modalidad, tiempo de preparación y detalles."""

import pytest
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import status

from apps.catalog import services
from apps.catalog.models import Producto
from tests.factories import ProductoFactory

pytestmark = pytest.mark.django_db

PRODUCTOS = "/api/catalog/productos/"


def datos_encargo(**extra):
    datos = {
        "nombre": "Torta de chocolate",
        "descripcion": "Se hace por pedido",
        "precio": "50000.00",
        "stock": 7,
        "unidad_medida": "unidad",
        "estado": "activo",
        "modalidad": "encargo",
        "preparacion_horas": 24,
        "pide_detalles": True,
        "etiqueta_detalles": "Sabor y mensaje",
    }
    datos.update(extra)
    return datos


def _crear(vendedor, puesto, categoria, **extra):
    return services.crear_producto(
        puesto=puesto, categoria=categoria, usuario=vendedor, datos=datos_encargo(**extra)
    )


class TestCrearEncargo:
    def test_crear_producto_por_encargo(self, vendedor, puesto, categoria):
        producto = _crear(vendedor, puesto, categoria)
        assert producto.modalidad == "encargo"
        assert producto.preparacion_horas == 24
        assert producto.pide_detalles is True
        assert producto.etiqueta_detalles == "Sabor y mensaje"
        # Un encargo no maneja existencias: no se muestra «Quedan N».
        assert producto.stock == 0

    def test_crear_producto_por_encargo_requiere_preparacion(self, vendedor, puesto, categoria):
        with pytest.raises(DjangoValidationError) as error:
            _crear(vendedor, puesto, categoria, preparacion_horas=None)
        assert "preparacion_horas" in error.value.message_dict

    @pytest.mark.parametrize("horas", [0, 337, -1])
    def test_preparacion_fuera_de_rango_rechazada(self, vendedor, puesto, categoria, horas):
        with pytest.raises(DjangoValidationError) as error:
            _crear(vendedor, puesto, categoria, preparacion_horas=horas)
        assert "preparacion_horas" in error.value.message_dict

    def test_limites_validos_de_preparacion(self, vendedor, puesto, categoria):
        assert _crear(vendedor, puesto, categoria, preparacion_horas=1).preparacion_horas == 1
        assert _crear(vendedor, puesto, categoria, preparacion_horas=336).preparacion_horas == 336

    def test_pide_detalles_sin_etiqueta_usa_la_por_defecto(self, vendedor, puesto, categoria):
        producto = _crear(vendedor, puesto, categoria, etiqueta_detalles="   ")
        assert producto.etiqueta_detalles == "Detalles del encargo"

    def test_etiqueta_se_recorta(self, vendedor, puesto, categoria):
        producto = _crear(vendedor, puesto, categoria, etiqueta_detalles="  Sabor  ")
        assert producto.etiqueta_detalles == "Sabor"

    def test_sin_pedir_detalles_la_etiqueta_se_limpia(self, vendedor, puesto, categoria):
        producto = _crear(vendedor, puesto, categoria, pide_detalles=False)
        assert producto.pide_detalles is False
        assert producto.etiqueta_detalles == ""

    def test_producto_de_stock_ignora_los_campos_de_encargo(self, vendedor, puesto, categoria):
        producto = _crear(vendedor, puesto, categoria, modalidad="stock", stock=5)
        assert producto.modalidad == "stock"
        assert producto.preparacion_horas is None
        assert producto.pide_detalles is False
        assert producto.etiqueta_detalles == ""
        assert producto.stock == 5

    def test_producto_sin_modalidad_es_de_stock(self, vendedor, puesto, categoria):
        datos = datos_encargo()
        for campo in ("modalidad", "preparacion_horas", "pide_detalles", "etiqueta_detalles"):
            datos.pop(campo)
        producto = services.crear_producto(
            puesto=puesto, categoria=categoria, usuario=vendedor, datos=datos
        )
        assert producto.modalidad == "stock"


class TestCambiarModalidad:
    def test_pasar_a_encargo_pone_stock_en_cero(self, vendedor, puesto, categoria):
        producto = ProductoFactory(id_puesto=puesto, id_categoria=categoria, stock=9)
        services.actualizar_producto(
            producto=producto,
            usuario=vendedor,
            datos={"modalidad": "encargo", "preparacion_horas": 48},
        )
        producto.refresh_from_db()
        assert producto.modalidad == "encargo"
        assert producto.stock == 0
        assert producto.preparacion_horas == 48

    def test_pasar_a_stock_limpia_campos_de_encargo(self, vendedor, puesto, categoria):
        producto = _crear(vendedor, puesto, categoria)
        services.actualizar_producto(
            producto=producto, usuario=vendedor, datos={"modalidad": "stock", "stock": 4}
        )
        producto.refresh_from_db()
        assert producto.modalidad == "stock"
        assert producto.preparacion_horas is None
        assert producto.pide_detalles is False
        assert producto.etiqueta_detalles == ""
        assert producto.stock == 4

    def test_editar_otro_campo_no_toca_la_modalidad(self, vendedor, puesto, categoria):
        producto = _crear(vendedor, puesto, categoria)
        services.actualizar_producto(producto=producto, usuario=vendedor, datos={"precio": "55000"})
        producto.refresh_from_db()
        assert producto.modalidad == "encargo"
        assert producto.preparacion_horas == 24
        assert producto.pide_detalles is True
        assert producto.stock == 0

    def test_editar_encargo_no_permite_dejarlo_sin_preparacion(self, vendedor, puesto, categoria):
        producto = _crear(vendedor, puesto, categoria)
        with pytest.raises(DjangoValidationError) as error:
            services.actualizar_producto(
                producto=producto, usuario=vendedor, datos={"preparacion_horas": None}
            )
        assert "preparacion_horas" in error.value.message_dict

    def test_encargo_no_acepta_cambiar_el_stock(self, vendedor, puesto, categoria):
        producto = _crear(vendedor, puesto, categoria)
        services.actualizar_producto(producto=producto, usuario=vendedor, datos={"stock": 30})
        producto.refresh_from_db()
        assert producto.stock == 0


class TestRestriccionesEnBd:
    def test_constraint_encargo_sin_preparacion_falla_en_bd(self, puesto, categoria):
        with pytest.raises(IntegrityError), transaction.atomic():
            Producto.objects.bulk_create(
                [
                    Producto(
                        id_puesto=puesto,
                        id_categoria=categoria,
                        nombre="Torta",
                        precio=1,
                        modalidad="encargo",
                        preparacion_horas=None,
                    )
                ]
            )

    def test_constraint_preparacion_fuera_de_rango_falla_en_bd(self, puesto, categoria):
        with pytest.raises(IntegrityError), transaction.atomic():
            Producto.objects.bulk_create(
                [
                    Producto(
                        id_puesto=puesto,
                        id_categoria=categoria,
                        nombre="Torta",
                        precio=1,
                        modalidad="encargo",
                        preparacion_horas=400,
                    )
                ]
            )

    def test_constraint_modalidad_invalida_falla_en_bd(self, puesto, categoria):
        with pytest.raises(IntegrityError), transaction.atomic():
            Producto.objects.bulk_create(
                [
                    Producto(
                        id_puesto=puesto,
                        id_categoria=categoria,
                        nombre="Torta",
                        precio=1,
                        modalidad="otra",
                    )
                ]
            )


class TestFiltroModalidad:
    def test_filtro_modalidad(self, cliente_anon, puesto, categoria):
        normal = ProductoFactory(id_puesto=puesto, id_categoria=categoria)
        encargo = ProductoFactory(
            id_puesto=puesto,
            id_categoria=categoria,
            modalidad="encargo",
            preparacion_horas=24,
            stock=0,
        )
        respuesta = cliente_anon.get(PRODUCTOS, {"modalidad": "encargo"})
        assert respuesta.status_code == status.HTTP_200_OK
        assert [p["id"] for p in respuesta.data["results"]] == [encargo.pk]
        respuesta = cliente_anon.get(PRODUCTOS, {"modalidad": "stock"})
        assert [p["id"] for p in respuesta.data["results"]] == [normal.pk]

    def test_filtro_modalidad_invalido_da_400(self, cliente_anon):
        respuesta = cliente_anon.get(PRODUCTOS, {"modalidad": "gratis"})
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST


class TestApi:
    def test_el_serializer_expone_y_guarda_los_campos(self, cliente_vendedor, puesto, categoria):
        respuesta = cliente_vendedor.post(
            PRODUCTOS,
            {
                "id_puesto": puesto.pk,
                "id_categoria": categoria.pk,
                "nombre": "Pudín de pan",
                "precio": "30000",
                "modalidad": "encargo",
                "preparacion_horas": 48,
                "pide_detalles": True,
                "etiqueta_detalles": "Mensaje",
            },
            format="json",
        )
        assert respuesta.status_code == status.HTTP_201_CREATED, respuesta.data
        assert respuesta.data["modalidad"] == "encargo"
        assert respuesta.data["preparacion_horas"] == 48
        assert respuesta.data["pide_detalles"] is True
        assert respuesta.data["etiqueta_detalles"] == "Mensaje"
        assert respuesta.data["stock"] == 0

    def test_api_rechaza_encargo_sin_preparacion(self, cliente_vendedor, puesto, categoria):
        respuesta = cliente_vendedor.post(
            PRODUCTOS,
            {
                "id_puesto": puesto.pk,
                "id_categoria": categoria.pk,
                "nombre": "Pudín",
                "precio": "30000",
                "modalidad": "encargo",
            },
            format="json",
        )
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST

    def test_producto_existente_es_de_stock_por_defecto(self, cliente_anon, puesto, categoria):
        producto = ProductoFactory(id_puesto=puesto, id_categoria=categoria)
        respuesta = cliente_anon.get(f"{PRODUCTOS}{producto.pk}/")
        assert respuesta.data["modalidad"] == "stock"
        assert respuesta.data["preparacion_horas"] is None
        assert respuesta.data["pide_detalles"] is False
