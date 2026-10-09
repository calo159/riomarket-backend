"""Pruebas de direcciones: reglas de negocio, constraints y endpoints."""

import pytest
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError, transaction
from rest_framework import status

from apps.addresses import services
from apps.addresses.models import Direccion
from tests.factories import DireccionFactory

from .conftest import DIRECCIONES


def _datos(**extra):
    datos = {"alias": "Casa", "direccion": "Calle 1 #2-3", "referencia": "Portón azul"}
    datos.update(extra)
    return datos


@pytest.mark.django_db
class TestCrearService:
    def test_primera_direccion_es_predeterminada(self, comprador):
        direccion = services.crear_direccion(usuario=comprador, datos=_datos())
        assert direccion.es_predeterminada is True
        assert direccion.activa is True

    def test_segunda_no_desplaza_sin_pedirlo(self, comprador):
        primera = services.crear_direccion(usuario=comprador, datos=_datos())
        segunda = services.crear_direccion(usuario=comprador, datos=_datos(alias="Trabajo"))
        primera.refresh_from_db()
        assert primera.es_predeterminada is True
        assert segunda.es_predeterminada is False

    def test_nueva_predeterminada_quita_la_anterior(self, comprador):
        primera = services.crear_direccion(usuario=comprador, datos=_datos())
        segunda = services.crear_direccion(
            usuario=comprador, datos=_datos(alias="Trabajo", es_predeterminada=True)
        )
        primera.refresh_from_db()
        assert primera.es_predeterminada is False
        assert segunda.es_predeterminada is True

    def test_vendedor_no_puede_crear(self, vendedor):
        with pytest.raises(PermissionDenied):
            services.crear_direccion(usuario=vendedor, datos=_datos())

    def test_coordenadas_incompletas_fallan(self, comprador):
        with pytest.raises(ValidationError):
            services.crear_direccion(usuario=comprador, datos=_datos(latitud="11.544000"))


@pytest.mark.django_db
class TestActualizarService:
    def test_dueno_actualiza(self, comprador):
        direccion = DireccionFactory(id_usuario=comprador)
        actualizada = services.actualizar_direccion(
            direccion=direccion, usuario=comprador, datos={"alias": "Nueva"}
        )
        assert actualizada.alias == "Nueva"

    def test_otro_usuario_no_actualiza(self, comprador, otro_comprador):
        direccion = DireccionFactory(id_usuario=comprador)
        with pytest.raises(PermissionDenied):
            services.actualizar_direccion(
                direccion=direccion, usuario=otro_comprador, datos={"alias": "Mia"}
            )

    def test_desactivar_quita_predeterminada(self, comprador):
        direccion = services.crear_direccion(usuario=comprador, datos=_datos())
        assert direccion.es_predeterminada is True
        services.actualizar_direccion(
            direccion=direccion, usuario=comprador, datos={"activa": False}
        )
        direccion.refresh_from_db()
        assert direccion.activa is False
        assert direccion.es_predeterminada is False


@pytest.mark.django_db
class TestPredeterminar:
    def test_marcar_predeterminada(self, comprador):
        primera = services.crear_direccion(usuario=comprador, datos=_datos())
        segunda = services.crear_direccion(usuario=comprador, datos=_datos(alias="Trabajo"))
        services.marcar_predeterminada(direccion=segunda, usuario=comprador)
        primera.refresh_from_db()
        segunda.refresh_from_db()
        assert primera.es_predeterminada is False
        assert segunda.es_predeterminada is True

    def test_no_predetermina_inactiva(self, comprador):
        direccion = DireccionFactory(id_usuario=comprador, activa=False)
        with pytest.raises(ValidationError):
            services.marcar_predeterminada(direccion=direccion, usuario=comprador)


@pytest.mark.django_db
class TestVisibilidad:
    def test_usuario_solo_ve_las_suyas(self, comprador, otro_comprador):
        propia = DireccionFactory(id_usuario=comprador)
        DireccionFactory(id_usuario=otro_comprador)
        qs = services.visibles_direcciones(comprador, Direccion.objects.all())
        assert list(qs) == [propia]

    def test_admin_ve_todas(self, comprador, otro_comprador, admin):
        DireccionFactory(id_usuario=comprador)
        DireccionFactory(id_usuario=otro_comprador)
        qs = services.visibles_direcciones(admin, Direccion.objects.all())
        assert qs.count() == 2

    def test_anonimo_no_ve_nada(self):
        DireccionFactory()
        qs = services.visibles_direcciones(None, Direccion.objects.all())
        assert qs.count() == 0


@pytest.mark.django_db
class TestConstraints:
    def test_dos_predeterminadas_fallan(self, comprador):
        DireccionFactory(id_usuario=comprador, es_predeterminada=True)
        with pytest.raises(IntegrityError), transaction.atomic():
            DireccionFactory(id_usuario=comprador, es_predeterminada=True)

    def test_predeterminada_inactiva_falla(self, comprador):
        with pytest.raises(IntegrityError), transaction.atomic():
            Direccion.objects.create(
                id_usuario=comprador,
                alias="Casa",
                direccion="Calle 1",
                es_predeterminada=True,
                activa=False,
            )

    def test_coordenadas_parciales_fallan(self, comprador):
        with pytest.raises(IntegrityError), transaction.atomic():
            Direccion.objects.create(
                id_usuario=comprador, alias="Casa", direccion="Calle 1", latitud="11.544000"
            )


@pytest.mark.django_db
class TestEndpoints:
    def test_anonimo_no_lista(self, cliente_anon):
        assert cliente_anon.get(DIRECCIONES).status_code == status.HTTP_401_UNAUTHORIZED

    def test_comprador_lista_las_suyas(self, cliente_comprador, comprador):
        DireccionFactory(id_usuario=comprador)
        DireccionFactory()  # de otro usuario
        respuesta = cliente_comprador.get(DIRECCIONES)
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["count"] == 1
        assert respuesta.data["results"][0]["id_usuario"] == comprador.pk

    def test_admin_lista_todas(self, cliente_admin):
        DireccionFactory()
        DireccionFactory()
        respuesta = cliente_admin.get(DIRECCIONES)
        assert respuesta.data["count"] == 2

    def test_comprador_crea_ok(self, cliente_comprador):
        respuesta = cliente_comprador.post(DIRECCIONES, _datos(), format="json")
        assert respuesta.status_code == status.HTTP_201_CREATED
        assert respuesta.data["es_predeterminada"] is True
        assert respuesta.data["alias"] == "Casa"

    def test_vendedor_no_crea(self, cliente_vendedor):
        respuesta = cliente_vendedor.post(DIRECCIONES, _datos(), format="json")
        assert respuesta.status_code == status.HTTP_403_FORBIDDEN

    def test_datos_invalidos_400(self, cliente_comprador):
        respuesta = cliente_comprador.post(DIRECCIONES, {"alias": "Casa"}, format="json")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "errors" in respuesta.data

    def test_actualizar_direccion_ajena_404(self, cliente_otro_comprador, comprador):
        direccion = DireccionFactory(id_usuario=comprador)
        respuesta = cliente_otro_comprador.patch(
            f"{DIRECCIONES}{direccion.pk}/", {"alias": "Hack"}, format="json"
        )
        assert respuesta.status_code == status.HTTP_404_NOT_FOUND

    def test_accion_predeterminar(self, cliente_comprador, comprador):
        services.crear_direccion(usuario=comprador, datos=_datos())
        otra = services.crear_direccion(usuario=comprador, datos=_datos(alias="Trabajo"))
        respuesta = cliente_comprador.post(f"{DIRECCIONES}{otra.pk}/predeterminar/")
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["es_predeterminada"] is True
        assert Direccion.objects.filter(id_usuario=comprador, es_predeterminada=True).count() == 1

    def test_accion_predeterminar_inactiva_400(self, cliente_comprador, comprador):
        direccion = DireccionFactory(id_usuario=comprador, activa=False)
        respuesta = cliente_comprador.post(f"{DIRECCIONES}{direccion.pk}/predeterminar/")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST

    def test_eliminar_propia(self, cliente_comprador, comprador):
        direccion = DireccionFactory(id_usuario=comprador)
        respuesta = cliente_comprador.delete(f"{DIRECCIONES}{direccion.pk}/")
        assert respuesta.status_code == status.HTTP_204_NO_CONTENT
        assert not Direccion.objects.filter(pk=direccion.pk).exists()

    def test_otro_usuario_no_ve_detalle(self, cliente_otro_comprador, comprador):
        direccion = DireccionFactory(id_usuario=comprador)
        respuesta = cliente_otro_comprador.get(f"{DIRECCIONES}{direccion.pk}/")
        assert respuesta.status_code == status.HTTP_404_NOT_FOUND

    def test_ordenamiento_invalido_400(self, cliente_comprador, comprador):
        DireccionFactory(id_usuario=comprador)
        respuesta = cliente_comprador.get(DIRECCIONES, {"ordering": "hack"})
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST

    def test_usuario_inactivo_no_crea(self, comprador):
        from rest_framework.test import APIClient

        from apps.accounts.models import Usuario

        comprador.estado = Usuario.Estado.SUSPENDIDO
        comprador.save(update_fields=["estado"])
        cliente = APIClient()
        cliente.force_authenticate(comprador)
        assert cliente.post(DIRECCIONES, _datos(), format="json").status_code == 403
