"""Pruebas de los endpoints del catálogo (permisos, reglas y búsqueda)."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status

from apps.catalog.models import Categoria, ImagenProducto, Producto, Puesto
from tests.factories import (
    CategoriaFactory,
    ProductoFactory,
    PuestoCategoriaFactory,
    PuestoFactory,
)

from .conftest import PNG_BYTES

PUESTOS = "/api/catalog/puestos/"
PRODUCTOS = "/api/catalog/productos/"
CATEGORIAS = "/api/catalog/categorias/"
IMAGENES = "/api/catalog/imagenes/"


def _cuerpo_producto(puesto, categoria, **extra):
    datos = {
        "id_puesto": puesto.pk,
        "id_categoria": categoria.pk,
        "nombre": "Producto de prueba",
        "precio": "3500.00",
        "stock": 5,
        "unidad_medida": "unidad",
    }
    datos.update(extra)
    return datos


@pytest.mark.django_db
class TestPuestos:
    def test_lectura_publica_solo_activos(self, cliente_anon, vendedor):
        activo = PuestoFactory(id_vendedor=vendedor, estado=Puesto.Estado.ACTIVO)
        suspendido = PuestoFactory(id_vendedor=vendedor, estado=Puesto.Estado.SUSPENDIDO)
        respuesta = cliente_anon.get(PUESTOS)
        assert respuesta.status_code == status.HTTP_200_OK
        ids = [p["id"] for p in respuesta.data["results"]]
        assert activo.pk in ids
        assert suspendido.pk not in ids

    def test_anonimo_no_crea(self, cliente_anon):
        assert cliente_anon.post(PUESTOS, {}, format="json").status_code == 401

    def test_comprador_no_crea(self, cliente_comprador):
        assert cliente_comprador.post(PUESTOS, {}, format="json").status_code == 403

    def test_vendedor_suspendido_no_crea(self, vendedor, cliente_vendedor):
        vendedor.suspendir()
        respuesta = cliente_vendedor.post(PUESTOS, {}, format="json")
        assert respuesta.status_code == 403

    def test_vendedor_pendiente_de_verificacion_no_crea(
        self, cliente_vendedor_pendiente
    ):
        respuesta = cliente_vendedor_pendiente.post(
            PUESTOS,
            {
                "nombre": "Déjame publicar",
                "descripcion": "Sigo pendiente",
                "direccion": "Calle 9 #1-20",
            },
            format="json",
        )
        assert respuesta.status_code == status.HTTP_403_FORBIDDEN

    def test_vendedor_crea_puesto(self, cliente_vendedor, vendedor):
        cuerpo = {
            "nombre": "Frutería La Playa",
            "descripcion": "Frutas de la guajira",
            "direccion": "Calle 3 #5-10",
            "ofrece_domicilio": True,
            "latitud": "11.544",
            "longitud": "-72.907",
        }
        respuesta = cliente_vendedor.post(PUESTOS, cuerpo, format="json")
        assert respuesta.status_code == status.HTTP_201_CREATED
        assert respuesta.data["id_vendedor"] == vendedor.pk
        assert respuesta.data["categorias"] == []

    def test_domicilio_sin_coordenadas_400(self, cliente_vendedor):
        cuerpo = {
            "nombre": "Sin coordenadas",
            "direccion": "X",
            "ofrece_domicilio": True,
        }
        respuesta = cliente_vendedor.post(PUESTOS, cuerpo, format="json")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "latitud" in respuesta.data["errors"]

    def test_vendedor_no_edita_puesto_ajeno(self, cliente_vendedor, otro_vendedor):
        ajeno = PuestoFactory(id_vendedor=otro_vendedor)
        respuesta = cliente_vendedor.patch(
            f"{PUESTOS}{ajeno.pk}/", {"nombre": "Robado"}, format="json"
        )
        assert respuesta.status_code == 403

    def test_vendedor_edita_su_puesto(self, cliente_vendedor, vendedor):
        propio = PuestoFactory(id_vendedor=vendedor)
        respuesta = cliente_vendedor.patch(
            f"{PUESTOS}{propio.pk}/", {"nombre": "Renombrado"}, format="json"
        )
        assert respuesta.status_code == status.HTTP_200_OK
        propio.refresh_from_db()
        assert propio.nombre == "Renombrado"

    def test_vendedor_no_cambia_estado_propio(self, cliente_vendedor, vendedor):
        propio = PuestoFactory(id_vendedor=vendedor)
        respuesta = cliente_vendedor.patch(
            f"{PUESTOS}{propio.pk}/", {"estado": "suspendido"}, format="json"
        )
        assert respuesta.status_code == status.HTTP_200_OK
        propio.refresh_from_db()
        assert propio.estado == Puesto.Estado.ACTIVO  # read-only

    def test_borrar_puesto_propio(self, cliente_vendedor, vendedor):
        propio = PuestoFactory(id_vendedor=vendedor)
        respuesta = cliente_vendedor.delete(f"{PUESTOS}{propio.pk}/")
        assert respuesta.status_code == status.HTTP_204_NO_CONTENT

    def test_borrar_puesto_ajeno_403(self, cliente_vendedor, otro_vendedor):
        ajeno = PuestoFactory(id_vendedor=otro_vendedor)
        respuesta = cliente_vendedor.delete(f"{PUESTOS}{ajeno.pk}/")
        assert respuesta.status_code == 403

    def test_busqueda_por_categoria(self, cliente_anon, vendedor, categoria):
        objetivo = PuestoFactory(id_vendedor=vendedor, nombre="Comida Casa")
        PuestoCategoriaFactory(id_puesto=objetivo, id_categoria=categoria)
        otro = PuestoFactory(id_vendedor=vendedor, nombre="Otro Puesto")
        respuesta = cliente_anon.get(PUESTOS, {"categoria": categoria.pk})
        ids = [p["id"] for p in respuesta.data["results"]]
        assert objetivo.pk in ids
        assert otro.pk not in ids

    def test_busqueda_por_texto(self, cliente_anon, vendedor):
        PuestoFactory(id_vendedor=vendedor, nombre="Frutería La Playa")
        PuestoFactory(id_vendedor=vendedor, nombre="Carnicería Don José")
        respuesta = cliente_anon.get(PUESTOS, {"q": "la playa"})
        nombres = [p["nombre"] for p in respuesta.data["results"]]
        assert nombres == ["Frutería La Playa"]

    def test_publico_ve_vacio_con_estado_suspendido(self, cliente_anon, vendedor):
        PuestoFactory(id_vendedor=vendedor, estado=Puesto.Estado.SUSPENDIDO)
        respuesta = cliente_anon.get(PUESTOS, {"estado": "suspendido"})
        assert respuesta.data["results"] == []

    def test_ordering_invalido_400(self, cliente_anon, vendedor):
        PuestoFactory(id_vendedor=vendedor)
        respuesta = cliente_anon.get(PUESTOS, {"ordering": "password"})
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestProductos:
    def test_lectura_publica_solo_activos_de_puestos_activos(
        self, cliente_anon, vendedor, puesto, categoria
    ):
        activo = ProductoFactory(
            id_puesto=puesto, id_categoria=categoria, estado=Producto.Estado.ACTIVO
        )
        inactivo = ProductoFactory(
            id_puesto=puesto, id_categoria=categoria, estado=Producto.Estado.INACTIVO
        )
        respuesta = cliente_anon.get(PRODUCTOS)
        ids = [p["id"] for p in respuesta.data["results"]]
        assert activo.pk in ids
        assert inactivo.pk not in ids

    def test_oculta_productos_de_puestos_suspendidos(self, cliente_anon, vendedor, categoria):
        puesto_inactivo = PuestoFactory(id_vendedor=vendedor, estado=Puesto.Estado.INACTIVO)
        PuestoCategoriaFactory(id_puesto=puesto_inactivo, id_categoria=categoria)
        ProductoFactory(id_puesto=puesto_inactivo, id_categoria=categoria)
        respuesta = cliente_anon.get(PRODUCTOS)
        assert respuesta.data["results"] == []

    def test_anonimo_no_publica(self, cliente_anon):
        assert cliente_anon.post(PRODUCTOS, {}, format="json").status_code == 401

    def test_comprador_no_publica(self, cliente_comprador, puesto, categoria):
        respuesta = cliente_comprador.post(
            PRODUCTOS, _cuerpo_producto(puesto, categoria), format="json"
        )
        assert respuesta.status_code == 403

    def test_vendedor_publica_ok(self, cliente_vendedor, puesto, categoria):
        respuesta = cliente_vendedor.post(
            PRODUCTOS, _cuerpo_producto(puesto, categoria), format="json"
        )
        assert respuesta.status_code == status.HTTP_201_CREATED
        assert respuesta.data["id_puesto"] == puesto.pk

    def test_regla2_categoria_no_asignada(self, cliente_vendedor, vendedor, categoria):
        puesto_sin_categoria = PuestoFactory(id_vendedor=vendedor)
        respuesta = cliente_vendedor.post(
            PRODUCTOS, _cuerpo_producto(puesto_sin_categoria, categoria), format="json"
        )
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "id_categoria" in respuesta.data["errors"]

    def test_producto_en_puesto_ajeno(self, cliente_vendedor, otro_vendedor, categoria):
        ajeno = PuestoFactory(id_vendedor=otro_vendedor)
        PuestoCategoriaFactory(id_puesto=ajeno, id_categoria=categoria)
        respuesta = cliente_vendedor.post(
            PRODUCTOS, _cuerpo_producto(ajeno, categoria), format="json"
        )
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "El puesto no te pertenece" in str(respuesta.data["errors"])

    def test_precio_negativo_400(self, cliente_vendedor, puesto, categoria):
        respuesta = cliente_vendedor.post(
            PRODUCTOS, _cuerpo_producto(puesto, categoria, precio="-1.00"), format="json"
        )
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST

    def test_stock_negativo_400(self, cliente_vendedor, puesto, categoria):
        respuesta = cliente_vendedor.post(
            PRODUCTOS, _cuerpo_producto(puesto, categoria, stock=-1), format="json"
        )
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST

    def test_vendedor_edita_su_producto(self, cliente_vendedor, producto):
        respuesta = cliente_vendedor.patch(
            f"{PRODUCTOS}{producto.pk}/", {"precio": "4200.00"}, format="json"
        )
        assert respuesta.status_code == status.HTTP_200_OK
        producto.refresh_from_db()
        assert producto.precio == 4200

    def test_vendedor_no_edita_producto_ajeno(self, cliente_otro_vendedor, producto):
        respuesta = cliente_otro_vendedor.patch(
            f"{PRODUCTOS}{producto.pk}/", {"precio": "1.00"}, format="json"
        )
        assert respuesta.status_code == 403

    def test_filtros_precio_y_texto(self, cliente_anon, puesto, categoria):
        ProductoFactory(id_puesto=puesto, id_categoria=categoria, nombre="Arepa", precio="3000.00")
        ProductoFactory(id_puesto=puesto, id_categoria=categoria, nombre="Friche", precio="8000.00")
        respuesta = cliente_anon.get(
            PRODUCTOS, {"precio_min": "3000", "precio_max": "5000", "q": "arep"}
        )
        nombres = [p["nombre"] for p in respuesta.data["results"]]
        assert nombres == ["Arepa"]

    def test_ordering_por_precio(self, cliente_anon, puesto, categoria):
        ProductoFactory(id_puesto=puesto, id_categoria=categoria, precio="9000.00")
        ProductoFactory(id_puesto=puesto, id_categoria=categoria, precio="1000.00")
        respuesta = cliente_anon.get(PRODUCTOS, {"ordering": "precio"})
        precios = [p["precio"] for p in respuesta.data["results"]]
        assert precios == sorted(precios)
        assert respuesta.data["results"][0]["precio"] == "1000.00"

    def test_dueño_ve_sus_no_activos_pero_publico_no(
        self, cliente_anon, cliente_vendedor, vendedor, puesto, categoria
    ):
        inactivo = ProductoFactory(
            id_puesto=puesto, id_categoria=categoria, estado=Producto.Estado.INACTIVO
        )
        publico = cliente_anon.get(PRODUCTOS, {"estado": "inactivo"})
        assert publico.data["results"] == []
        dueño = cliente_vendedor.get(PRODUCTOS, {"estado": "inactivo"})
        assert [p["id"] for p in dueño.data["results"]] == [inactivo.pk]


@pytest.mark.django_db
class TestCategorias:
    def test_lectura_publica(self, cliente_anon, categoria):
        respuesta = cliente_anon.get(CATEGORIAS)
        assert respuesta.status_code == status.HTTP_200_OK
        assert any(c["id"] == categoria.pk for c in respuesta.data["results"])

    def test_publico_no_ve_inactivas(self, cliente_anon):
        CategoriaFactory(nombre="OCulta", activa=False)
        respuesta = cliente_anon.get(CATEGORIAS)
        assert all(c["activa"] for c in respuesta.data["results"])

    def test_admin_si_ve_inactivas(self, cliente_admin):
        CategoriaFactory(nombre="OCulta", activa=False)
        respuesta = cliente_admin.get(CATEGORIAS)
        assert any(not c["activa"] for c in respuesta.data["results"])

    def test_anonimo_no_crea(self, cliente_anon):
        assert cliente_anon.post(CATEGORIAS, {"nombre": "X"}, format="json").status_code == 401

    def test_comprador_no_crea(self, cliente_comprador):
        respuesta = cliente_comprador.post(CATEGORIAS, {"nombre": "X"}, format="json")
        assert respuesta.status_code == 403

    def test_admin_crea(self, cliente_admin):
        respuesta = cliente_admin.post(CATEGORIAS, {"nombre": "Joyería"}, format="json")
        assert respuesta.status_code == status.HTTP_201_CREATED
        assert Categoria.objects.filter(nombre="Joyería").exists()

    def test_admin_no_borra_categoria_con_productos_activos(
        self, cliente_admin, producto, categoria
    ):
        respuesta = cliente_admin.delete(f"{CATEGORIAS}{categoria.pk}/")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert Categoria.objects.filter(pk=categoria.pk).exists()

    def test_admin_borra_categoria_sin_productos(self, cliente_admin, categoria):
        respuesta = cliente_admin.delete(f"{CATEGORIAS}{categoria.pk}/")
        assert respuesta.status_code == status.HTTP_204_NO_CONTENT

    def test_comprador_no_borra(self, cliente_comprador, categoria):
        respuesta = cliente_comprador.delete(f"{CATEGORIAS}{categoria.pk}/")
        assert respuesta.status_code == 403


@pytest.mark.django_db
class TestCategoriasDePuesto:
    def test_asignar_categoria_dueño(self, cliente_vendedor, vendedor, categoria):
        propio = PuestoFactory(id_vendedor=vendedor)
        respuesta = cliente_vendedor.post(
            f"{PUESTOS}{propio.pk}/categorias/", {"categoria": categoria.pk}, format="json"
        )
        assert respuesta.status_code == status.HTTP_201_CREATED
        assert any(c["id"] == categoria.pk for c in respuesta.data["categorias"])

    def test_asignar_a_puesto_ajeno(self, cliente_vendedor, otro_vendedor, categoria):
        ajeno = PuestoFactory(id_vendedor=otro_vendedor)
        respuesta = cliente_vendedor.post(
            f"{PUESTOS}{ajeno.pk}/categorias/", {"categoria": categoria.pk}, format="json"
        )
        assert respuesta.status_code == 403

    def test_quitar_categoria(self, cliente_vendedor, vendedor, categoria):
        propio = PuestoFactory(id_vendedor=vendedor)
        propia2 = CategoriaFactory(nombre="Otra")
        PuestoCategoriaFactory(id_puesto=propio, id_categoria=categoria)
        PuestoCategoriaFactory(id_puesto=propio, id_categoria=propia2)
        respuesta = cliente_vendedor.delete(f"{PUESTOS}{propio.pk}/categorias/{categoria.pk}/")
        assert respuesta.status_code == status.HTTP_200_OK
        ids = [c["id"] for c in respuesta.data["categorias"]]
        assert categoria.pk not in ids

    def test_quitar_categoria_con_productos(self, cliente_vendedor, producto, categoria):
        respuesta = cliente_vendedor.delete(
            f"{PUESTOS}{producto.id_puesto.pk}/categorias/{categoria.pk}/"
        )
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestImagenes:
    def _subir(self, cliente, url, nombre="foto.png", contenido=None, tipo="image/png"):
        return cliente.post(
            url,
            {"archivo": SimpleUploadedFile(nombre, contenido or PNG_BYTES, tipo)},
            format="multipart",
        )

    def test_subir_imagen_dueño(self, cliente_vendedor, producto, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            respuesta = self._subir(cliente_vendedor, f"{PRODUCTOS}{producto.pk}/imagenes/")
            assert respuesta.status_code == status.HTTP_201_CREATED
            assert respuesta.data["url"].startswith("/media/")
            assert respuesta.data["id_producto"] == producto.pk

    def test_subir_imagen_no_imagen(self, cliente_vendedor, producto, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            respuesta = self._subir(
                cliente_vendedor,
                f"{PRODUCTOS}{producto.pk}/imagenes/",
                nombre="documento.pdf",
                contenido=b"%PDF-1.4 ...",
                tipo="application/pdf",
            )
            assert respuesta.status_code == status.HTTP_400_BAD_REQUEST

    def test_subir_a_producto_ajeno(self, cliente_otro_vendedor, producto, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            respuesta = self._subir(cliente_otro_vendedor, f"{PRODUCTOS}{producto.pk}/imagenes/")
            assert respuesta.status_code == 403

    def test_subida_plana_por_imagenes(self, cliente_vendedor, producto, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            respuesta = cliente_vendedor.post(
                IMAGENES,
                {
                    "id_producto": producto.pk,
                    "archivo": SimpleUploadedFile("foto.png", PNG_BYTES, "image/png"),
                },
                format="multipart",
            )
            assert respuesta.status_code == status.HTTP_201_CREATED
            assert respuesta.data["id_producto"] == producto.pk

    def test_lectura_publica_de_imagenes(self, cliente_anon, producto, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            ImagenProducto.objects.create(
                id_producto=producto,
                archivo=SimpleUploadedFile("foto.png", PNG_BYTES, "image/png"),
            )
            respuesta = cliente_anon.get(IMAGENES)
            assert respuesta.status_code == status.HTTP_200_OK
            assert respuesta.data["results"][0]["url"].startswith("/media/")

    def test_borrar_imagen_ajena(self, cliente_otro_vendedor, producto, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            imagen = ImagenProducto.objects.create(
                id_producto=producto,
                archivo=SimpleUploadedFile("foto.png", PNG_BYTES, "image/png"),
            )
            respuesta = cliente_otro_vendedor.delete(f"{IMAGENES}{imagen.pk}/")
            assert respuesta.status_code == 403

    def test_borrar_imagen_propia_elimina_archivo(self, cliente_vendedor, producto, tmp_path):
        with override_settings(MEDIA_ROOT=tmp_path):
            imagen = ImagenProducto.objects.create(
                id_producto=producto,
                archivo=SimpleUploadedFile("foto.png", PNG_BYTES, "image/png"),
            )
            respuesta = cliente_vendedor.delete(f"{IMAGENES}{imagen.pk}/")
            assert respuesta.status_code == status.HTTP_204_NO_CONTENT
            assert not ImagenProducto.objects.filter(pk=imagen.pk).exists()
