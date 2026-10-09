"""Pruebas de la verificación de identidad de vendedores (Incremento 2).

Cubre regla 6 (la cédula no se repite entre cuentas), cifrado en reposo,
foto privada (ADR-002) y el flujo completo: solicitud → revisión → aprobación
o rechazo, más la vista protegida de la cédula.
"""

import base64
import io

import pytest
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.test import override_settings
from PIL import Image
from rest_framework import status
from rest_framework.test import APIRequestFactory

from apps.accounts import services
from apps.accounts.models import Usuario, Vendedor
from apps.common import crypto
from apps.common.permissions import EsVendedorAprobado
from tests.factories import (
    UsuarioFactory,
    VendedorFactory,
    VendedorPendienteFactory,
    VendedorRechazadoFactory,
)

PNG_BYTES = base64.b64decode(
    b"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)

SOLICITUD = "/api/verificacion/mi-verificacion/"
SOLICITUDES = "/api/verificacion/solicitudes/"


def _imagen(nombre="cedula.png"):
    return SimpleUploadedFile(nombre, PNG_BYTES, content_type="image/png")


def _vendedor():
    return UsuarioFactory(rol=Usuario.Rol.VENDEDOR, password="ClaveSegura1!")


def _permiso_request(usuario):
    request = APIRequestFactory().get("/")
    request.user = usuario
    return request


@pytest.fixture
def media_privada(tmp_path):
    """PRIVATE_MEDIA_ROOT temporal (PrivateMediaStorage la lee en vivo)."""
    with override_settings(PRIVATE_MEDIA_ROOT=str(tmp_path)):
        yield tmp_path


@pytest.mark.django_db
class TestModeloVendedor:
    def test_reverse_related_name_es_vendedor(self):
        usuario = _vendedor()
        fila = VendedorFactory(id_usuario=usuario)
        assert usuario.vendedor.pk == fila.pk

    def test_estado_invalido_rechazado_por_choices(self):
        fila = VendedorPendienteFactory()
        fila.estado_verificacion = "volando"
        with pytest.raises(DjangoValidationError):
            fila.full_clean()

    def test_huella_unica_a_nivel_db(self):
        primero = VendedorFactory()
        services.solicitar_verificacion(
            usuario=primero.id_usuario, numero_cedula="1020304050", foto=_imagen()
        )
        otro = VendedorPendienteFactory()
        otro.cedula_huella = crypto.huella_deterministica("1020304050")
        with pytest.raises(IntegrityError), transaction.atomic():
            otro.save()


@pytest.mark.django_db
class TestServicioSolicitud:
    def test_crea_solicitud_cifrando_datos(self, media_privada):
        usuario = _vendedor()
        fila = services.solicitar_verificacion(
            usuario=usuario, numero_cedula="1.023.456.789", foto=_imagen()
        )
        assert fila.estado_verificacion == Vendedor.EstadoVerificacion.PENDIENTE
        assert fila.id_revisor is None
        assert fila.motivo_rechazo == ""
        assert fila.fecha_revision is None
        # Cifrado en reposo: nunca se guarda el número en claro.
        assert fila.numero_cedula != b"1023456789"
        assert crypto.descifrar(fila.numero_cedula) == "1023456789"
        # Huella determinística para unicidad (regla 6).
        assert fila.cedula_huella == crypto.huella_deterministica("1023456789")
        # La foto cayó en la raíz PRIVADA (no en MEDIA_ROOT público).
        assert "media_privado" not in fila.foto_cedula.path

    def test_verifica_la_foto_es_imagen_valida(self, media_privada):
        no_imagen = SimpleUploadedFile("malo.txt", b"no soy una imagen", content_type="text/plain")
        with pytest.raises(DjangoValidationError):
            services.solicitar_verificacion(
                usuario=_vendedor(), numero_cedula="1020304050", foto=no_imagen
            )

    def test_comprador_o_suspendido_rechazados(self, media_privada):
        comprador = UsuarioFactory(rol=Usuario.Rol.COMPRADOR)
        with pytest.raises(DjangoValidationError):
            services.solicitar_verificacion(
                usuario=comprador, numero_cedula="1020304050", foto=_imagen()
            )
        suspendido = UsuarioFactory(rol=Usuario.Rol.VENDEDOR)
        suspendido.suspendir()
        with pytest.raises(DjangoValidationError):
            services.solicitar_verificacion(
                usuario=suspendido, numero_cedula="1020304050", foto=_imagen()
            )

    def test_numero_vacio_rechazado(self, media_privada):
        with pytest.raises(DjangoValidationError):
            services.solicitar_verificacion(
                usuario=_vendedor(), numero_cedula="ABC!", foto=_imagen()
            )

    def test_misma_cedula_entre_cuentas_rechazada(self, media_privada):
        """Regla 6: el número no se repite aunque cambie el formato."""
        services.solicitar_verificacion(
            usuario=_vendedor(), numero_cedula="1.023.456.789", foto=_imagen()
        )
        segunda = _vendedor()
        with pytest.raises(DjangoValidationError) as exc:
            services.solicitar_verificacion(
                usuario=segunda, numero_cedula="1023456789", foto=_imagen()
            )
        assert "cédula" in str(exc.value)

    def test_el_mismo_vendedor_puede_reabrir(self, media_privada):
        usuario = _vendedor()
        fila = services.solicitar_verificacion(
            usuario=usuario, numero_cedula="1023456789", foto=_imagen()
        )
        revisor = UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)
        services.rechazar_verificacion(vendedor=fila, revisor=revisor, motivo="Foto borrosa.")
        reabierta = services.solicitar_verificacion(
            usuario=usuario, numero_cedula="1023456789", foto=_imagen()
        )
        assert reabierta.estado_verificacion == Vendedor.EstadoVerificacion.PENDIENTE
        assert reabierta.motivo_rechazo == ""
        assert reabierta.id_revisor is None


@pytest.mark.django_db
class TestServicioDecision:
    def test_aprobar(self, media_privada):
        admin = UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)
        fila = services.solicitar_verificacion(
            usuario=_vendedor(), numero_cedula="1023456789", foto=_imagen()
        )
        resultado = services.aprobar_verificacion(vendedor=fila, revisor=admin)
        assert resultado.estado_verificacion == Vendedor.EstadoVerificacion.APROBADO
        assert resultado.id_revisor.pk == admin.pk
        assert resultado.fecha_revision is not None
        assert resultado.id_usuario.puede_publicar() is True

    def test_rechazar_requiere_motivo(self, media_privada):
        admin = UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)
        fila = services.solicitar_verificacion(
            usuario=_vendedor(), numero_cedula="1023456789", foto=_imagen()
        )
        with pytest.raises(DjangoValidationError):
            services.rechazar_verificacion(vendedor=fila, revisor=admin, motivo="  ")
        rechazada = services.rechazar_verificacion(
            vendedor=fila, revisor=admin, motivo="Documento ilegible."
        )
        assert rechazada.estado_verificacion == Vendedor.EstadoVerificacion.RECHAZADO
        assert rechazada.id_usuario.puede_publicar() is False

    def test_sin_foto_no_se_puede_revisar(self):
        admin = UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)
        fila = VendedorPendienteFactory()  # sin número ni foto
        with pytest.raises(DjangoValidationError):
            services.aprobar_verificacion(vendedor=fila, revisor=admin)


@pytest.mark.django_db
class TestReglaUnoReal:
    def test_vendedor_aprobado_pasa_permiso(self):
        fila = VendedorFactory()
        assert EsVendedorAprobado().has_permission(_permiso_request(fila.id_usuario), None) is True

    def test_vendedor_pendiente_no_pasa(self):
        fila = VendedorPendienteFactory()
        assert EsVendedorAprobado().has_permission(_permiso_request(fila.id_usuario), None) is False


@pytest.mark.django_db
class TestEndpointSolicitud:
    def test_vendedor_envia_solicitud(self, api_client, media_privada):
        vendedor = _vendedor()
        api_client.force_authenticate(vendedor)
        respuesta = api_client.post(
            SOLICITUD,
            {"numero_cedula": "1.023.456.789", "foto_cedula": _imagen()},
            format="multipart",
        )
        assert respuesta.status_code == status.HTTP_201_CREATED
        assert respuesta.data["estado_verificacion"] == Vendedor.EstadoVerificacion.PENDIENTE
        # Los datos sensibles jamás se devuelven al cliente.
        assert "numero_cedula" not in respuesta.data
        assert "foto_cedula" not in respuesta.data

    def test_reenvio_devuelve_200(self, api_client, media_privada):
        vendedor = _vendedor()
        api_client.force_authenticate(vendedor)
        api_client.post(
            SOLICITUD,
            {"numero_cedula": "1023456789", "foto_cedula": _imagen()},
            format="multipart",
        )
        segunda = api_client.post(
            SOLICITUD,
            {"numero_cedula": "1023456789", "foto_cedula": _imagen()},
            format="multipart",
        )
        assert segunda.status_code == status.HTTP_200_OK

    def test_comprador_no_puede_solicitar(self, api_client):
        api_client.force_authenticate(UsuarioFactory(rol=Usuario.Rol.COMPRADOR))
        respuesta = api_client.post(SOLICITUD, {}, format="multipart")
        assert respuesta.status_code == status.HTTP_403_FORBIDDEN

    def test_get_mi_verificacion(self, api_client):
        vendedor = _vendedor()
        VendedorPendienteFactory(id_usuario=vendedor)
        api_client.force_authenticate(vendedor)
        respuesta = api_client.get(SOLICITUD)
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["estado_verificacion"] == Vendedor.EstadoVerificacion.PENDIENTE

    def test_cedula_repetida_por_api_devuelve_400(self, api_client):
        primero = _vendedor()
        api_client.force_authenticate(primero)
        api_client.post(
            SOLICITUD,
            {"numero_cedula": "1023456789", "foto_cedula": _imagen()},
            format="multipart",
        )
        segundo = _vendedor()
        api_client.force_authenticate(segundo)
        respuesta = api_client.post(
            SOLICITUD,
            {"numero_cedula": "10.234.567-89", "foto_cedula": _imagen()},
            format="multipart",
        )
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestEndpointColaAdmin:
    def test_requiere_admin(self, api_client):
        api_client.force_authenticate(UsuarioFactory(rol=Usuario.Rol.COMPRADOR))
        assert api_client.get(SOLICITUDES).status_code == status.HTTP_403_FORBIDDEN

    def test_lista_y_filtra_por_estado(self, api_client):
        admin = UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)
        VendedorPendienteFactory()
        VendedorRechazadoFactory()
        api_client.force_authenticate(admin)
        respuesta = api_client.get(f"{SOLICITUDES}?estado=rechazado")
        assert respuesta.status_code == status.HTTP_200_OK
        assert all(s["estado_verificacion"] == "rechazado" for s in respuesta.data["results"])
        # No expone datos sensibles.
        assert "numero_cedula" not in respuesta.data["results"][0]

    def test_estado_invalido_devuelve_400(self, api_client):
        admin = UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)
        api_client.force_authenticate(admin)
        respuesta = api_client.get(f"{SOLICITUDES}?estado=noexiste")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST

    def test_admin_aprueba_solicitud(self, api_client, media_privada):
        admin = UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)
        usuario = _vendedor()
        solicitud = services.solicitar_verificacion(
            usuario=usuario, numero_cedula="1023456789", foto=_imagen()
        )
        api_client.force_authenticate(admin)
        respuesta = api_client.patch(
            f"{SOLICITUDES}{solicitud.pk}/", {"estado": "aprobado"}, format="json"
        )
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["estado_verificacion"] == Vendedor.EstadoVerificacion.APROBADO
        assert respuesta.data["id_revisor"] == admin.pk
        usuario.refresh_from_db()
        assert usuario.puede_publicar() is True

    def test_admin_rechaza_sin_motivo_devuelve_400(self, api_client, media_privada):
        admin = UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)
        solicitud = Vendedor.objects.create(id_usuario=_vendedor())
        api_client.force_authenticate(admin)
        respuesta = api_client.patch(
            f"{SOLICITUDES}{solicitud.pk}/", {"estado": "rechazado"}, format="json"
        )
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "motivo_rechazo" in respuesta.data["errors"]

    def test_vendedor_no_decide(self, api_client):
        vendedor = _vendedor()
        solicitud = VendedorPendienteFactory(id_usuario=vendedor)
        api_client.force_authenticate(vendedor)
        respuesta = api_client.patch(
            f"{SOLICITUDES}{solicitud.pk}/", {"estado": "aprobado"}, format="json"
        )
        assert respuesta.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestCedulaPrivada:
    def _subir(self, api_client, usuario):
        api_client.force_authenticate(usuario)
        api_client.post(
            SOLICITUD,
            {"numero_cedula": "1023456789", "foto_cedula": _imagen()},
            format="multipart",
        )

    def test_admin_ve_la_foto(self, api_client, media_privada):
        usuario = _vendedor()
        self._subir(api_client, usuario)
        solicitud = Vendedor.objects.get(id_usuario=usuario)
        api_client.force_authenticate(UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR))
        respuesta = api_client.get(f"{SOLICITUDES}{solicitud.pk}/cedula/")
        assert respuesta.status_code == status.HTTP_200_OK
        contenido = b"".join(respuesta.streaming_content)
        with Image.open(io.BytesIO(contenido)) as img:
            img.verify()

    def test_vendedor_dueño_no_ve_la_foto(self, api_client, media_privada):
        usuario = _vendedor()
        self._subir(api_client, usuario)
        solicitud = Vendedor.objects.get(id_usuario=usuario)
        api_client.force_authenticate(usuario)
        respuesta = api_client.get(f"{SOLICITUDES}{solicitud.pk}/cedula/")
        assert respuesta.status_code == status.HTTP_403_FORBIDDEN

    def test_tras_revision_solo_el_revisor_la_ve(self, api_client, media_privada):
        usuario = _vendedor()
        self._subir(api_client, usuario)
        solicitud = Vendedor.objects.get(id_usuario=usuario)
        revisor = UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)
        otro_admin = UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)
        services.aprobar_verificacion(vendedor=solicitud, revisor=revisor)

        api_client.force_authenticate(otro_admin)
        assert (
            api_client.get(f"{SOLICITUDES}{solicitud.pk}/cedula/").status_code
            == status.HTTP_403_FORBIDDEN
        )
        api_client.force_authenticate(revisor)
        assert (
            api_client.get(f"{SOLICITUDES}{solicitud.pk}/cedula/").status_code == status.HTTP_200_OK
        )

    def test_anonimo_no_ve_la_foto(self, api_client):
        solicitud = VendedorPendienteFactory()
        respuesta = api_client.get(f"{SOLICITUDES}{solicitud.pk}/cedula/")
        assert respuesta.status_code in (status.HTTP_401_UNAUTHORIZED, 403)


@pytest.mark.django_db
def test_registro_vendedor_crea_solicitud_pendiente(api_client):
    respuesta = api_client.post(
        "/api/auth/registro/",
        {
            "nombre": "Nueva Vendedora",
            "correo": "nueva@riomarket.test",
            "celular": "3007654321",
            "rol": "vendedor",
            "password": "ClaveSegura1!",
        },
        format="json",
    )
    assert respuesta.status_code == status.HTTP_201_CREATED
    fila = Vendedor.objects.get(id_usuario__correo="nueva@riomarket.test")
    assert fila.estado_verificacion == Vendedor.EstadoVerificacion.PENDIENTE
    assert fila.id_usuario.puede_publicar() is False


@pytest.mark.django_db
def test_perfil_incluye_estado_verificacion(api_client):
    usuario = _vendedor()
    VendedorPendienteFactory(id_usuario=usuario)
    api_client.force_authenticate(usuario)
    respuesta = api_client.get("/api/auth/perfil/")
    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.data["estado_verificacion"] == "pendiente"
