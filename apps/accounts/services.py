"""Reglas de negocio de cuentas: registro y edición de perfil.

Los serializers validan FORMATO (correo, celular, largos); aquí se validan
las REGLAS de negocio (unicidad, rol no asignable, fortaleza de contraseña)
de forma verificable aisladamente desde tests.
"""

from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from apps.accounts.models import Usuario

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
        return Usuario.objects.create_user(
            nombre=nombre,
            correo=correo,
            celular=celular,
            rol=rol,
            password=password,
        )
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
