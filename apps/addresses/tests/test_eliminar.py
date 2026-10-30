"""Pruebas de eliminación de direcciones: promoción de la predeterminada y pertenencia."""

import pytest
from rest_framework import status

from apps.addresses import services
from apps.addresses.models import Direccion
from tests.factories import DireccionFactory

from .conftest import DIRECCIONES


@pytest.mark.django_db
class TestEliminarService:
    def test_borrar_predeterminada_promueve_otra_activa(self, comprador):
        predeterminada = DireccionFactory(id_usuario=comprador, es_predeterminada=True)
        otra = DireccionFactory(id_usuario=comprador)
        services.eliminar_direccion(direccion=predeterminada, usuario=comprador)
        otra.refresh_from_db()
        assert otra.es_predeterminada is True
        assert not Direccion.objects.filter(pk=predeterminada.pk).exists()

    def test_no_promueve_inactivas(self, comprador):
        predeterminada = DireccionFactory(id_usuario=comprador, es_predeterminada=True)
        inactiva = DireccionFactory(id_usuario=comprador, activa=False)
        services.eliminar_direccion(direccion=predeterminada, usuario=comprador)
        inactiva.refresh_from_db()
        assert inactiva.es_predeterminada is False
        assert not Direccion.objects.filter(id_usuario=comprador, es_predeterminada=True).exists()

    def test_borrar_no_predeterminada_conserva_la_predeterminada(self, comprador):
        predeterminada = DireccionFactory(id_usuario=comprador, es_predeterminada=True)
        otra = DireccionFactory(id_usuario=comprador)
        services.eliminar_direccion(direccion=otra, usuario=comprador)
        predeterminada.refresh_from_db()
        assert predeterminada.es_predeterminada is True

    def test_no_promueve_direcciones_ajenas(self, comprador, otro_comprador):
        predeterminada = DireccionFactory(id_usuario=comprador, es_predeterminada=True)
        ajena = DireccionFactory(id_usuario=otro_comprador)
        services.eliminar_direccion(direccion=predeterminada, usuario=comprador)
        ajena.refresh_from_db()
        assert ajena.es_predeterminada is False


@pytest.mark.django_db
class TestEliminarEndpoint:
    def test_borrar_unica_direccion(self, cliente_comprador, comprador):
        direccion = DireccionFactory(id_usuario=comprador, es_predeterminada=True)
        respuesta = cliente_comprador.delete(f"{DIRECCIONES}{direccion.pk}/")
        assert respuesta.status_code == status.HTTP_204_NO_CONTENT
        assert not Direccion.objects.filter(id_usuario=comprador).exists()

    def test_endpoint_promueve_otra(self, cliente_comprador, comprador):
        predeterminada = DireccionFactory(id_usuario=comprador, es_predeterminada=True)
        otra = DireccionFactory(id_usuario=comprador)
        respuesta = cliente_comprador.delete(f"{DIRECCIONES}{predeterminada.pk}/")
        assert respuesta.status_code == status.HTTP_204_NO_CONTENT
        otra.refresh_from_db()
        assert otra.es_predeterminada is True

    def test_no_borra_la_ajena(self, cliente_otro_comprador, comprador):
        direccion = DireccionFactory(id_usuario=comprador)
        respuesta = cliente_otro_comprador.delete(f"{DIRECCIONES}{direccion.pk}/")
        assert respuesta.status_code == status.HTTP_404_NOT_FOUND
        assert Direccion.objects.filter(pk=direccion.pk).exists()
