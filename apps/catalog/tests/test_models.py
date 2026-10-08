"""Pruebas de los modelos del catálogo y sus constraints de base de datos."""

import pytest
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.test import override_settings

from apps.catalog.models import Categoria, ImagenProducto, Producto, Puesto, PuestoCategoria
from tests.factories import CategoriaFactory, PuestoFactory

from .conftest import PNG_BYTES


@pytest.mark.django_db
class TestPuesto:
    def test_checkconstraints_existen(self):
        nombres = {c.name for c in Puesto._meta.constraints}
        assert {"puesto_estado_valido", "puesto_domicilio_requiere_coordenadas"} <= nombres

    def test_estado_invalido_rechazado_en_bd(self, vendedor):
        with pytest.raises(IntegrityError), transaction.atomic():
            Puesto.objects.create(id_vendedor=vendedor, nombre="X", direccion="y", estado="volando")

    def test_domicilio_sin_coordenadas_rechazado_en_bd(self, vendedor):
        """Regla 3 a nivel de CHECK de la BD (defensa tras el servicio)."""
        with pytest.raises(IntegrityError), transaction.atomic():
            Puesto.objects.create(
                id_vendedor=vendedor,
                nombre="Sin mapa",
                direccion="N/A",
                ofrece_domicilio=True,
            )

    def test_domicilio_con_coordenadas_ok(self, vendedor):
        puesto = Puesto.objects.create(
            id_vendedor=vendedor,
            nombre="Con mapa",
            direccion="N/A",
            ofrece_domicilio=True,
            latitud="11.544",
            longitud="-72.907",
        )
        assert puesto.ofrece_domicilio is True

    def test_full_clean_rechaza_coordenadas_fuera_de_rango(self, vendedor):
        puesto = Puesto(
            id_vendedor=vendedor,
            nombre="Marte",
            direccion="x",
            latitud="95.0",
            longitud="-72.0",
        )
        with pytest.raises(DjangoValidationError):
            puesto.full_clean()


@pytest.mark.django_db
class TestCategoria:
    def test_nombre_duplicado_rechazado_en_bd(self):
        CategoriaFactory(nombre="Comida")
        with pytest.raises(IntegrityError), transaction.atomic():
            Categoria.objects.create(nombre="Comida")

    def test_padre_con_productos_no_se_borra(self, categoria):
        CategoriaFactory(nombre="Arepas", id_categoria_padre=categoria)
        with pytest.raises(IntegrityError), transaction.atomic():
            categoria.delete()


@pytest.mark.django_db
class TestPuestoCategoria:
    def test_pareja_duplicada_rechazada_en_bd(self, puesto, categoria):
        # El fixture ``puesto`` ya asignó la categoría: duplicarla debe fallar.
        with pytest.raises(IntegrityError), transaction.atomic():
            PuestoCategoria.objects.create(id_puesto=puesto, id_categoria=categoria)


@pytest.mark.django_db
class TestProducto:
    def test_precio_negativo_rechazado_en_bd(self, puesto, categoria):
        with pytest.raises(IntegrityError), transaction.atomic():
            Producto.objects.create(
                id_puesto=puesto, id_categoria=categoria, nombre="X", precio="-1.00"
            )

    def test_stock_negativo_rechazado_en_bd(self, puesto, categoria):
        with pytest.raises(IntegrityError), transaction.atomic():
            Producto.objects.create(
                id_puesto=puesto, id_categoria=categoria, nombre="X", precio="1.00", stock=-3
            )

    def test_regla2_categoria_no_asignada_rechazada_por_clean(self, vendedor, categoria):
        """Regla 2: producto sin categoría asignada al puesto falla en clean()."""
        puesto = PuestoFactory(id_vendedor=vendedor)  # sin categorías
        producto = Producto(id_puesto=puesto, id_categoria=categoria, nombre="X", precio="1.00")
        with pytest.raises(DjangoValidationError) as error:
            producto.full_clean()
        assert "id_categoria" in error.value.message_dict

    def test_regla2_categoria_asignada_ok(self, puesto, categoria):
        producto = Producto(
            id_puesto=puesto,
            id_categoria=categoria,
            nombre="X",
            precio="1.00",
            stock=1,
        )
        producto.full_clean()  # no lanza
        producto.save()
        assert Producto.objects.filter(pk=producto.pk).exists()


@pytest.mark.django_db
class TestImagenProducto:
    def test_borrar_elimina_el_archivo_fisico(self, producto, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            imagen = ImagenProducto.objects.create(
                id_producto=producto,
                archivo=SimpleUploadedFile("foto.png", PNG_BYTES, "image/png"),
            )
            assert tmp_path.joinpath(imagen.archivo.name).exists()
            imagen.delete()
            assert not tmp_path.joinpath(imagen.archivo.name).exists()

    def test_archivo_publico_existe_url(self, producto, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            imagen = ImagenProducto.objects.create(
                id_producto=producto,
                archivo=SimpleUploadedFile("foto.png", PNG_BYTES, "image/png"),
            )
            assert imagen.archivo.url.startswith("/media/")
