"""Pruebas aisladas de las reglas de negocio del catálogo (services.py)."""

import pytest
from django.core.exceptions import ValidationError as DjangoValidationError

from apps.catalog import services
from apps.catalog.models import Categoria, Producto, Puesto
from apps.common.query import aplicar_ordenamiento, parametro_entero
from tests.factories import CategoriaFactory, ProductoFactory, PuestoFactory


def datos_puesto():
    return {
        "nombre": "Mi puesto",
        "descripcion": "Comida criolla",
        "direccion": "Calle 9 #4-20",
        "horario": "Lun-Sáb 8-14",
        "ofrece_domicilio": False,
    }


def datos_producto():
    return {
        "nombre": "Arepa de huevo",
        "descripcion": "Con queso costeño",
        "precio": "3500.00",
        "stock": 8,
        "unidad_medida": "unidad",
        "estado": "activo",
    }


@pytest.mark.django_db
class TestRegla1:
    def test_comprador_no_puede_crear_puesto(self, comprador):
        with pytest.raises(DjangoValidationError):
            services.crear_puesto(usuario=comprador, datos=datos_puesto())

    def test_vendedor_suspendido_no_puede_crear_puesto(self, vendedor):
        vendedor.suspendir()
        with pytest.raises(DjangoValidationError):
            services.crear_puesto(usuario=vendedor, datos=datos_puesto())

    def test_vendedor_crea_puesto(self, vendedor):
        puesto = services.crear_puesto(usuario=vendedor, datos=datos_puesto())
        assert puesto.id_vendedor == vendedor
        assert puesto.estado == Puesto.Estado.ACTIVO

    def test_no_se_edita_puesto_ajeno(self, vendedor, otro_vendedor):
        ajeno = PuestoFactory(id_vendedor=otro_vendedor)
        with pytest.raises(DjangoValidationError):
            services.actualizar_puesto(puesto=ajeno, usuario=vendedor, datos={"nombre": "Hack"})


@pytest.mark.django_db
class TestRegla3:
    def test_domicilio_sin_coordenadas_rechazado(self, vendedor):
        datos = {**datos_puesto(), "ofrece_domicilio": True}
        with pytest.raises(DjangoValidationError) as error:
            services.crear_puesto(usuario=vendedor, datos=datos)
        assert "latitud" in error.value.message_dict


@pytest.mark.django_db
class TestRegla2:
    def test_producto_con_categoria_no_asignada_rechazado(self, vendedor, categoria):
        puesto = PuestoFactory(id_vendedor=vendedor)  # sin categorías asignadas
        with pytest.raises(DjangoValidationError) as error:
            services.crear_producto(
                puesto=puesto,
                categoria=categoria,
                usuario=vendedor,
                datos=datos_producto(),
            )
        assert "id_categoria" in error.value.message_dict

    def test_producto_en_puesto_ajeno_rechazado(self, vendedor, otro_vendedor, categoria):
        ajeno = PuestoFactory(id_vendedor=otro_vendedor, nombre="Ajeno")
        services.asignar_categoria(puesto=ajeno, categoria=categoria)
        with pytest.raises(DjangoValidationError) as error:
            services.crear_producto(
                puesto=ajeno,
                categoria=categoria,
                usuario=vendedor,
                datos=datos_producto(),
            )
        assert "El puesto no te pertenece" in str(error.value.message_dict)

    def test_producto_ok(self, vendedor, puesto, categoria):
        producto = services.crear_producto(
            puesto=puesto, categoria=categoria, usuario=vendedor, datos=datos_producto()
        )
        assert producto.id_puesto == puesto
        assert producto.id_categoria == categoria

    def test_cambiando_categoria_a_una_no_asignada_rechazado(self, vendedor, puesto, categoria):
        otra = CategoriaFactory(nombre="Ropa")
        producto = ProductoFactory(id_puesto=puesto, id_categoria=categoria)
        with pytest.raises(DjangoValidationError) as error:
            services.actualizar_producto(
                producto=producto, usuario=vendedor, datos={"id_categoria": otra}
            )
        assert "id_categoria" in error.value.message_dict

    def test_precio_negativo_rechazado(self, vendedor, puesto, categoria):
        with pytest.raises(DjangoValidationError):
            services.crear_producto(
                puesto=puesto,
                categoria=categoria,
                usuario=vendedor,
                datos={**datos_producto(), "precio": "-1.00"},
            )

    def test_mover_producto_a_otro_puesto_rechazado(self, vendedor, puesto, categoria):
        otro = PuestoFactory(id_vendedor=vendedor, nombre="Otro puesto mío")
        services.asignar_categoria(puesto=otro, categoria=categoria)
        producto = ProductoFactory(id_puesto=puesto, id_categoria=categoria)
        with pytest.raises(DjangoValidationError):
            services.actualizar_producto(
                producto=producto, usuario=vendedor, datos={"id_puesto": otro}
            )


@pytest.mark.django_db
class TestRegla7:
    def test_borrar_categoria_con_productos_activos_rechazado(self, producto, categoria):
        with pytest.raises(DjangoValidationError) as error:
            services.eliminar_categoria(categoria=categoria)
        assert "desactív" in str(error.value.message_dict)

    def test_borrar_categoria_con_productos_inactivos_rechazado(self, puesto, categoria):
        ProductoFactory(
            id_puesto=puesto,
            id_categoria=categoria,
            estado=Producto.Estado.INACTIVO,
        )
        with pytest.raises(DjangoValidationError):
            services.eliminar_categoria(categoria=categoria)

    def test_borrar_categoria_sin_productos_ok(self, categoria):
        services.eliminar_categoria(categoria=categoria)
        assert not Categoria.objects.filter(pk=categoria.pk).exists()


@pytest.mark.django_db
class TestAsignacionCategorias:
    def test_asignar_categoria_idempotente(self, puesto, categoria):
        services.asignar_categoria(puesto=puesto, categoria=categoria)
        assert puesto.categorias_asignadas.count() == 1

    def test_quitar_categoria_con_productos_rechazado(self, producto, categoria):
        with pytest.raises(DjangoValidationError):
            services.quitar_categoria(puesto=producto.id_puesto, categoria=categoria)

    def test_quitar_categoria_sin_productos_ok(self, puesto, categoria):
        services.quitar_categoria(puesto=puesto, categoria=categoria)
        assert puesto.categorias_asignadas.count() == 0


@pytest.mark.django_db
class TestBusquedaYOrdenamiento:
    def test_ordering_no_permitido_lanza_400(self, puesto):
        qs = Puesto.objects.all()
        with pytest.raises(DjangoValidationError):
            aplicar_ordenamiento(qs, "password", services.ORDENAMIENTO_PUESTO)

    def test_ordering_permitido_aplica(self, puesto):
        qs = Puesto.objects.all()
        resultado = aplicar_ordenamiento(qs, "nombre", services.ORDENAMIENTO_PUESTO)
        assert list(resultado) == list(Puesto.objects.order_by("nombre"))

    def test_parametro_entero_invalido(self):
        from django.http import QueryDict

        params = QueryDict("categoria=abc")
        with pytest.raises(DjangoValidationError):
            parametro_entero(params, "categoria")
