"""Pruebas de reseñas: reglas de negocio, visibilidad, reputación y endpoints."""

import pytest
from django.core.exceptions import PermissionDenied, ValidationError
from rest_framework import status

from apps.reviews import services
from apps.reviews.models import Resena
from tests.factories import ResenaFactory, UsuarioFactory

from .conftest import PUESTOS, RESENAS


def _datos(puesto, **extra):
    datos = {"id_puesto": puesto.pk, "calificacion": 5, "comentario": "Excelente"}
    datos.update(extra)
    return datos


def _pedido_entregado_ajeno():
    from apps.orders.models import Pedido
    from tests.factories import PedidoFactory

    return PedidoFactory(id_comprador=UsuarioFactory(), estado=Pedido.Estado.ENTREGADO)


@pytest.mark.django_db
class TestCrear:
    def test_requiere_pedido_entregado(self, comprador, puesto):
        with pytest.raises(ValidationError):
            services.crear_resena(usuario=comprador, datos=_datos(puesto))

    def test_crea_con_pedido_entregado(self, comprador, puesto, pedido_entregado):
        resena = services.crear_resena(
            usuario=comprador,
            datos={**_datos(puesto), "id_pedido": pedido_entregado},
        )
        assert resena.pk is not None
        assert resena.id_pedido_id == pedido_entregado.pk

    def test_vendedor_no_resena(self, vendedor, pedido_entregado, puesto):
        with pytest.raises(PermissionDenied):
            services.crear_resena(usuario=vendedor, datos=_datos(puesto))

    def test_duplicada_no_se_crea(self, comprador, pedido_entregado, puesto):
        services.crear_resena(usuario=comprador, datos=_datos(puesto))
        with pytest.raises(ValidationError):
            services.crear_resena(usuario=comprador, datos=_datos(puesto))

    def test_pedido_ajeno_no_valido(self, comprador, puesto, pedido_entregado):
        with pytest.raises(ValidationError):
            services.crear_resena(
                usuario=comprador, datos={**_datos(puesto), "id_pedido": _pedido_entregado_ajeno()}
            )


@pytest.mark.django_db
class TestGestion:
    def test_autor_edita(self, comprador, resena):
        actualizada = services.actualizar_resena(
            resena=resena, usuario=comprador, datos={"calificacion": 4, "comentario": "Mejoró"}
        )
        assert actualizada.calificacion == 4

    def test_otro_comprador_no_edita(self, otro_comprador, resena):
        with pytest.raises(PermissionDenied):
            services.actualizar_resena(
                resena=resena, usuario=otro_comprador, datos={"calificacion": 1}
            )

    def test_vendedor_responde(self, vendedor, resena):
        respondida = services.responder_resena(
            resena=resena, usuario=vendedor, datos={"respuesta": "Gracias!"}
        )
        assert respondida.respuesta == "Gracias!"
        assert respondida.fecha_respuesta is not None

    def test_otro_vendedor_no_responde(self, otro_vendedor, resena):
        with pytest.raises(PermissionDenied):
            services.responder_resena(
                resena=resena, usuario=otro_vendedor, datos={"respuesta": "x"}
            )

    def test_respuesta_vacia_invalida(self, vendedor, resena):
        with pytest.raises(ValidationError):
            services.responder_resena(resena=resena, usuario=vendedor, datos={"respuesta": "  "})

    def test_autor_elimina(self, comprador, resena):
        services.eliminar_resena(resena=resena, usuario=comprador)
        assert not Resena.objects.filter(pk=resena.pk).exists()

    def test_admin_borra_cualquiera(self, admin, resena):
        services.eliminar_resena(resena=resena, usuario=admin)
        assert not Resena.objects.filter(pk=resena.pk).exists()


@pytest.mark.django_db
class TestVisibilidad:
    def test_anonimo_solo_ve_visibles(self, puesto):
        ResenaFactory(id_usuario=UsuarioFactory(), id_puesto=puesto, calificacion=5)
        ResenaFactory(id_usuario=UsuarioFactory(), id_puesto=puesto, visible=False)
        qs = services.visibles_resenas(None, Resena.objects.all())
        assert qs.count() == 1

    def test_vendedor_ve_incluidas_ocultas_de_su_puesto(self, vendedor, puesto):
        ResenaFactory(id_usuario=UsuarioFactory(), id_puesto=puesto, visible=False)
        qs = services.visibles_resenas(vendedor, Resena.objects.all())
        assert qs.count() == 1

    def test_vendedor_no_ve_ocultas_de_otro_puesto(self, vendedor, otro_puesto):
        ResenaFactory(id_usuario=UsuarioFactory(), id_puesto=otro_puesto, visible=False)
        qs = services.visibles_resenas(vendedor, Resena.objects.all())
        assert qs.count() == 0

    def test_admin_ve_todas(self, admin):
        ResenaFactory(visible=False)
        qs = services.visibles_resenas(admin, Resena.objects.all())
        assert qs.count() == 1


@pytest.mark.django_db
class TestReputacionPuesto:
    def test_promedio_cuenta_solo_visibles(self, puesto):
        ResenaFactory(id_usuario=UsuarioFactory(), id_puesto=puesto, calificacion=5)
        ResenaFactory(id_usuario=UsuarioFactory(), id_puesto=puesto, calificacion=3)
        ResenaFactory(id_usuario=UsuarioFactory(), id_puesto=puesto, calificacion=1, visible=False)
        from apps.catalog.models import Puesto

        puesto = services.anotar_reputacion(Puesto.objects.filter(pk=puesto.pk)).get()
        assert puesto.cantidad_resenas == 2
        assert puesto.calificacion_promedio == 4.0

    def test_sin_resenas_vale_cero(self, puesto):
        from apps.catalog.models import Puesto

        puesto = services.anotar_reputacion(Puesto.objects.filter(pk=puesto.pk)).get()
        assert puesto.cantidad_resenas == 0
        assert puesto.calificacion_promedio is None


@pytest.mark.django_db
class TestEndpoints:
    def test_listado_publico(self, cliente_anon, puesto):
        ResenaFactory(id_usuario=UsuarioFactory(), id_puesto=puesto)
        respuesta = cliente_anon.get(RESENAS)
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["count"] == 1

    def test_anonimo_no_crea(self, cliente_anon, puesto):
        assert cliente_anon.post(RESENAS, _datos(puesto), format="json").status_code == 401

    def test_sin_pedido_entregado_400(self, cliente_comprador, puesto):
        respuesta = cliente_comprador.post(RESENAS, _datos(puesto), format="json")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST

    def test_comprador_crea_ok(self, cliente_comprador, pedido_entregado, puesto):
        respuesta = cliente_comprador.post(
            RESENAS, _datos(puesto, id_pedido=pedido_entregado.pk), format="json"
        )
        assert respuesta.status_code == status.HTTP_201_CREATED
        assert respuesta.data["calificacion"] == 5
        assert respuesta.data["usuario_nombre"] == pedido_entregado.id_comprador.nombre

    def test_duplicada_400(self, cliente_comprador, pedido_entregado, puesto):
        cliente_comprador.post(
            RESENAS, _datos(puesto, id_pedido=pedido_entregado.pk), format="json"
        )
        respuesta = cliente_comprador.post(
            RESENAS, _datos(puesto, id_pedido=pedido_entregado.pk), format="json"
        )
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST

    def test_autor_edita_ok(self, cliente_comprador, resena):
        respuesta = cliente_comprador.patch(
            f"{RESENAS}{resena.pk}/", {"calificacion": 2}, format="json"
        )
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["calificacion"] == 2

    def test_otro_comprador_no_edita(self, cliente_otro_comprador, resena):
        respuesta = cliente_otro_comprador.patch(
            f"{RESENAS}{resena.pk}/", {"calificacion": 1}, format="json"
        )
        assert respuesta.status_code == status.HTTP_403_FORBIDDEN

    def test_vendedor_responde_por_api(self, cliente_vendedor, resena):
        respuesta = cliente_vendedor.post(
            f"{RESENAS}{resena.pk}/responder/", {"respuesta": "Gracias!"}, format="json"
        )
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["respuesta"] == "Gracias!"

    def test_otro_vendedor_no_responde(self, cliente_otro_vendedor, resena):
        # La visibilidad no le deja siquiera ver la reseña ajena (404).
        respuesta = cliente_otro_vendedor.post(
            f"{RESENAS}{resena.pk}/responder/", {"respuesta": "hack"}, format="json"
        )
        assert respuesta.status_code == status.HTTP_404_NOT_FOUND

    def test_admin_elimina(self, cliente_admin, resena):
        assert (
            cliente_admin.delete(f"{RESENAS}{resena.pk}/").status_code == status.HTTP_204_NO_CONTENT
        )

    def test_filtro_por_puesto(self, cliente_anon, puesto, otro_puesto):
        ResenaFactory(id_usuario=UsuarioFactory(), id_puesto=puesto)
        ResenaFactory(id_usuario=UsuarioFactory(), id_puesto=otro_puesto)
        respuesta = cliente_anon.get(RESENAS, {"puesto": puesto.pk})
        assert respuesta.data["count"] == 1

    def test_puesto_publica_reputacion(self, cliente_anon, puesto):
        ResenaFactory(id_usuario=UsuarioFactory(), id_puesto=puesto, calificacion=5)
        respuesta = cliente_anon.get(f"{PUESTOS}{puesto.pk}/")
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["calificacion_promedio"] == 5.0
        assert respuesta.data["cantidad_resenas"] == 1
