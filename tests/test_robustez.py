"""Entradas mal formadas que antes daban 500 o pasaban sin validar (L-06..L-10, L-13, L-17,
L-18, S-14)."""

import io
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import Usuario
from apps.addresses.serializers import DireccionEscrituraSerializer
from apps.catalog.models import Categoria
from apps.common import crypto
from apps.common.exceptions import api_exception_handler
from apps.common.validators import validate_image_file
from apps.promotions.serializers import CuponSerializer
from apps.reviews.serializers import ResenaEscrituraSerializer
from tests.factories import ProductoFactory, PuestoFactory, UsuarioFactory, VendedorFactory

pytestmark = pytest.mark.django_db


def _png(ancho=4, alto=4, formato="PNG", nombre="a.png", tipo="image/png"):
    buf = io.BytesIO()
    Image.new("RGB", (ancho, alto), "red").save(buf, formato)
    return SimpleUploadedFile(nombre, buf.getvalue(), content_type=tipo)


class TestParametrosMalFormados:
    @pytest.mark.parametrize(
        "query",
        ["calificacion_min=abc", "calificacion_max=x", "vendedor=abc", "puesto=%C2%B2"],
    )
    def test_filtros_de_resenas_devuelven_400(self, query):
        assert APIClient().get(f"/api/reviews/resenas/?{query}").status_code == 400

    @pytest.mark.parametrize("orden", [5, ["a"], {}, [None], [True]])
    def test_reordenar_imagenes_valida_la_lista(self, orden):
        vendedor = UsuarioFactory(rol="vendedor")
        VendedorFactory(id_usuario=vendedor)
        producto = ProductoFactory(id_puesto=PuestoFactory(id_vendedor=vendedor))
        cliente = APIClient()
        cliente.force_authenticate(vendedor)
        respuesta = cliente.post(
            f"/api/catalog/productos/{producto.pk}/imagenes/reordenar/",
            {"orden": orden},
            format="json",
        )
        assert respuesta.status_code == 400

    @pytest.mark.parametrize("imagen_id", ["abc", "9999"])
    def test_marcar_principal_con_imagen_invalida_no_da_500(self, imagen_id):
        vendedor = UsuarioFactory(rol="vendedor")
        VendedorFactory(id_usuario=vendedor)
        producto = ProductoFactory(id_puesto=PuestoFactory(id_vendedor=vendedor))
        cliente = APIClient()
        cliente.force_authenticate(vendedor)
        respuesta = cliente.post(
            f"/api/catalog/productos/{producto.pk}/imagenes/{imagen_id}/principal/"
        )
        assert respuesta.status_code in (400, 404)

    def test_integrity_error_se_convierte_en_400(self):
        respuesta = api_exception_handler(IntegrityError("duplicado"), {})
        assert respuesta is not None and respuesta.status_code == 400


class TestValidaciones:
    @pytest.mark.parametrize("calificacion", [0, 6, -1])
    def test_calificacion_fuera_de_rango_es_error_de_campo(self, calificacion):
        serializer = ResenaEscrituraSerializer(
            data={"id_puesto": 1, "calificacion": calificacion, "comentario": "x"}
        )
        assert not serializer.is_valid()
        assert "calificacion" in serializer.errors

    @pytest.mark.parametrize("campo", ["monto_minimo_pedido", "tope_descuento"])
    def test_cupon_rechaza_montos_negativos(self, campo):
        serializer = CuponSerializer(
            data={"codigo": "NEG", "tipo_descuento": "monto", "valor": "100.00", campo: "-5"}
        )
        assert not serializer.is_valid()
        assert campo in serializer.errors

    @pytest.mark.parametrize(
        ("campo", "valor"), [("latitud", "500"), ("latitud", "-91"), ("longitud", "181")]
    )
    def test_direccion_con_coordenadas_fuera_de_rango(self, campo, valor):
        datos = {"alias": "Casa", "direccion": "Calle 1", "latitud": "11.5", "longitud": "-72.9"}
        datos[campo] = valor
        serializer = DireccionEscrituraSerializer(data=datos)
        assert not serializer.is_valid()
        assert campo in serializer.errors

    def test_categoria_no_puede_ser_su_propio_padre_ni_formar_ciclos(self):
        admin = UsuarioFactory(rol="administrador")
        a = Categoria.objects.create(nombre="A")
        b = Categoria.objects.create(nombre="B", id_categoria_padre=a)
        cliente = APIClient()
        cliente.force_authenticate(admin)
        propio = cliente.patch(
            f"/api/catalog/categorias/{a.pk}/", {"id_categoria_padre": a.pk}, format="json"
        )
        ciclo = cliente.patch(
            f"/api/catalog/categorias/{a.pk}/", {"id_categoria_padre": b.pk}, format="json"
        )
        assert propio.status_code == 400
        assert ciclo.status_code == 400


class TestDigitosUnicode:
    def test_cedula_con_digitos_arabes_normaliza_igual(self):
        assert crypto.normalizar_cedula("١٢٣٤٥٦") == crypto.normalizar_cedula("123456") == "123456"

    def test_celular_con_digitos_arabes_normaliza_igual(self):
        assert Usuario.normalizar_celular("٣٠٠١٢٣٤٥٦٧") == "3001234567"

    def test_superindices_no_cuentan_como_digitos(self):
        assert Usuario.normalizar_celular("3²") == "3"


class TestImagenes:
    def test_rechaza_imagenes_con_demasiados_pixeles(self, settings):
        settings.MAX_IMAGE_PIXELS = 100
        with pytest.raises(DjangoValidationError):
            validate_image_file(_png(20, 20))

    def test_rechaza_formatos_no_permitidos_aunque_el_tipo_mienta(self):
        with pytest.raises(DjangoValidationError):
            validate_image_file(_png(formato="GIF", nombre="a.png", tipo="image/png"))

    def test_acepta_una_imagen_normal(self):
        validate_image_file(_png())


def test_el_neto_no_se_calcula_con_float():
    # Guardia de L-11: el módulo de precios trabaja solo con Decimal.
    from apps.common import pricing

    assert isinstance(pricing.neto_vendedor(Decimal("10000.00"), Decimal("5.00")), Decimal)
