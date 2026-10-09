"""Reglas de negocio de cuentas: registro y edición de perfil.

Los serializers validan FORMATO (correo, celular, largos); aquí se validan
las REGLAS de negocio (unicidad, rol no asignable, fortaleza de contraseña)
de forma verificable aisladamente desde tests.
"""

from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone

from apps.accounts.models import Usuario, Vendedor
from apps.common import crypto
from apps.common.validators import renombrar_archivo, validate_image_file

# El registro nunca asigna el rol administrador (se crean por createsuperuser).
ROLES_REGISTRABLES = (Usuario.Rol.COMPRADOR, Usuario.Rol.VENDEDOR)


def registrar_usuario(*, nombre, correo, celular, rol, password) -> Usuario:
    correo = Usuario.normalizar_correo(correo)
    celular = Usuario.normalizar_celular(celular)

    if rol not in ROLES_REGISTRABLES:
        raise ValidationError(
            {"rol": "El rol en el registro solo puede ser 'comprador' o 'vendedor'."}
        )
    if Usuario.objects.filter(correo=correo).exists():
        raise ValidationError({"correo": "Ya existe una cuenta con ese correo."})
    if Usuario.objects.filter(celular=celular).exists():
        raise ValidationError({"celular": "Ya existe una cuenta con ese celular."})
    password_validation.validate_password(password)

    try:
        # create_user aplica de nuevo la normalización (defensa doble).
        usuario = Usuario.objects.create_user(
            nombre=nombre,
            correo=correo,
            celular=celular,
            rol=rol,
            password=password,
        )
        # Incremento 2: al registrarse como vendedor nace su solicitud de
        # verificación en estado "pendiente" (no puede publicar hasta aprobarse).
        if rol == Usuario.Rol.VENDEDOR:
            Vendedor.objects.create(id_usuario=usuario)
        return usuario
    except IntegrityError as exc:  # carrera entre registros simultáneos
        raise ValidationError({"correo": "Ya existe una cuenta con ese correo o celular."}) from exc


def actualizar_perfil(*, usuario: Usuario, datos: dict) -> Usuario:
    correo = Usuario.normalizar_correo(datos.get("correo", usuario.correo))
    celular = Usuario.normalizar_celular(datos.get("celular", usuario.celular))

    if (
        correo != usuario.correo
        and Usuario.objects.filter(correo=correo).exclude(pk=usuario.pk).exists()
    ):
        raise ValidationError({"correo": "Ya existe una cuenta con ese correo."})
    if (
        celular != usuario.celular
        and Usuario.objects.filter(celular=celular).exclude(pk=usuario.pk).exists()
    ):
        raise ValidationError({"celular": "Ya existe una cuenta con ese celular."})

    usuario.nombre = datos.get("nombre", usuario.nombre)
    usuario.correo = correo
    usuario.celular = celular
    usuario.save()
    return usuario


# ---------------------------------------------------------------------------
# Verificación de identidad (Incremento 2)
# ---------------------------------------------------------------------------

SOLICITUD_ESTADOS = (
    Vendedor.EstadoVerificacion.PENDIENTE,
    Vendedor.EstadoVerificacion.APROBADO,
    Vendedor.EstadoVerificacion.RECHAZADO,
)


def mi_verificacion(usuario: Usuario) -> Vendedor | None:
    """La solicitud de verificación del usuario, o ``None`` si no existe."""
    if not usuario.es_vendedor:
        return None
    return getattr(usuario, "vendedor", None)


def solicitar_verificacion(*, usuario: Usuario, numero_cedula, foto) -> Vendedor:
    """Crea o reabre la solicitud de verificación de un vendedor.

    Reglas:
    - Solo vendedores con cuenta activa.
    - La cédula se normaliza, se cifra (Fernet) y se guarda su huella HMAC.
    - Regla 6: el mismo número de cédula no puede repetirse entre cuentas.
    - La foto del documento se valida como imagen y va a ``PRIVATE_MEDIA_ROOT``.
    """
    if not usuario.is_active or not usuario.es_vendedor:
        raise ValidationError({"usuario": "Se requiere una cuenta de vendedor activa."})

    numero = crypto.normalizar_cedula(numero_cedula)
    if not numero or numero == "0":
        raise ValidationError({"numero_cedula": "El número de cédula es obligatorio."})

    huella = crypto.huella_deterministica(numero)
    duplicado = Vendedor.objects.filter(cedula_huella=huella).exclude(id_usuario=usuario)
    if duplicado.exists():
        raise ValidationError({"numero_cedula": "Ya existe una cuenta verificada con esa cédula."})

    if foto is None:
        raise ValidationError({"foto_cedula": "La foto de la cédula es obligatoria."})
    validate_image_file(foto)

    vendedor, _ = Vendedor.objects.get_or_create(id_usuario=usuario)

    if vendedor.foto_cedula:
        # Reemplazo: elimina la foto anterior para no dejar huérfanos en disco.
        vendedor.foto_cedula.delete(save=False)

    nombre = renombrar_archivo(foto, prefijo="cedula")
    vendedor.foto_cedula.save(nombre, foto, save=False)
    vendedor.numero_cedula = crypto.cifrar(numero)
    vendedor.cedula_huella = huella
    vendedor.estado_verificacion = Vendedor.EstadoVerificacion.PENDIENTE
    vendedor.id_revisor = None
    vendedor.motivo_rechazo = ""
    vendedor.fecha_revision = None
    vendedor.fecha_solicitud = timezone.now()
    vendedor.save()

    return vendedor


def aprobar_verificacion(*, vendedor: Vendedor, revisor: Usuario) -> Vendedor:
    if not revisor.es_administrador or not revisor.is_active:
        raise ValidationError({"revisor": "Solo un administrador activo puede revisar."})
    if not vendedor.cedula_huella or not vendedor.foto_cedula:
        raise ValidationError({"vendedor": "La solicitud no tiene documento ni foto para revisar."})
    vendedor.estado_verificacion = Vendedor.EstadoVerificacion.APROBADO
    vendedor.id_revisor = revisor
    vendedor.motivo_rechazo = ""
    vendedor.fecha_revision = timezone.now()
    vendedor.save()
    return vendedor


def rechazar_verificacion(*, vendedor: Vendedor, revisor: Usuario, motivo: str) -> Vendedor:
    if not revisor.es_administrador or not revisor.is_active:
        raise ValidationError({"revisor": "Solo un administrador activo puede revisar."})
    if not vendedor.cedula_huella or not vendedor.foto_cedula:
        raise ValidationError({"vendedor": "La solicitud no tiene documento ni foto para revisar."})
    motivo = (motivo or "").strip()
    if not motivo:
        raise ValidationError({"motivo_rechazo": "Indica el motivo del rechazo."})
    vendedor.estado_verificacion = Vendedor.EstadoVerificacion.RECHAZADO
    vendedor.id_revisor = revisor
    vendedor.motivo_rechazo = motivo
    vendedor.fecha_revision = timezone.now()
    vendedor.save()
    return vendedor
