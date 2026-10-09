"""Reglas de negocio de las direcciones de entrega.

- Solo el dueño (o un administrador) ve y edita sus direcciones.
- Exactamente una predeterminada por usuario; la primera dirección activa
  queda predeterminada automáticamente.
- Desactivar una dirección deja de ser predeterminada.
"""

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import QuerySet

from apps.accounts.models import Usuario
from apps.addresses.models import Direccion

ORDENAMIENTO_DIRECCION = ("fecha_creacion", "-fecha_creacion", "alias", "-alias", "id", "-id")

_CAMPOS_ESCRITURA = (
    "alias",
    "direccion",
    "referencia",
    "latitud",
    "longitud",
    "es_predeterminada",
    "activa",
)


def _exigir_gestor(usuario: Usuario) -> None:
    if not (usuario and usuario.is_active):
        raise PermissionDenied("Se requiere una cuenta activa.")
    if usuario.es_administrador or usuario.rol == Usuario.Rol.COMPRADOR:
        return
    raise PermissionDenied("Solo los compradores pueden gestionar direcciones.")


def _exigir_dueno(direccion: Direccion, usuario: Usuario) -> None:
    if usuario.es_administrador:
        return
    if direccion.id_usuario_id != usuario.pk:
        raise PermissionDenied("Solo el dueño de la dirección puede modificarla.")


def _quitar_predeterminada(usuario: Usuario, excepto_pk=None) -> None:
    qs = Direccion.objects.filter(id_usuario=usuario, es_predeterminada=True)
    if excepto_pk is not None:
        qs = qs.exclude(pk=excepto_pk)
    qs.update(es_predeterminada=False)


def crear_direccion(*, usuario: Usuario, datos: dict) -> Direccion:
    _exigir_gestor(usuario)
    campos = {clave: datos[clave] for clave in _CAMPOS_ESCRITURA if clave in datos}
    with transaction.atomic():
        hay_activa = Direccion.objects.filter(id_usuario=usuario, activa=True).exists()
        if campos.get("es_predeterminada"):
            _quitar_predeterminada(usuario)
        elif not hay_activa and campos.get("activa", True):
            # La primera dirección activa es la predeterminada.
            campos["es_predeterminada"] = True
        direccion = Direccion(id_usuario=usuario, **campos)
        direccion.full_clean()
        direccion.save()
    return direccion


def actualizar_direccion(*, direccion: Direccion, usuario: Usuario, datos: dict) -> Direccion:
    _exigir_gestor(usuario)
    _exigir_dueno(direccion, usuario)
    with transaction.atomic():
        for clave in _CAMPOS_ESCRITURA:
            if clave in datos:
                setattr(direccion, clave, datos[clave])
        if not direccion.activa:
            direccion.es_predeterminada = False
        if direccion.es_predeterminada:
            _quitar_predeterminada(usuario, excepto_pk=direccion.pk)
        direccion.full_clean()
        direccion.save()
    return direccion


def marcar_predeterminada(*, direccion: Direccion, usuario: Usuario) -> Direccion:
    _exigir_gestor(usuario)
    _exigir_dueno(direccion, usuario)
    if not direccion.activa:
        raise ValidationError({"activa": "No se puede predeterminar una dirección inactiva."})
    with transaction.atomic():
        _quitar_predeterminada(usuario, excepto_pk=direccion.pk)
        direccion.es_predeterminada = True
        direccion.save(update_fields=["es_predeterminada", "fecha_actualizacion"])
    return direccion


def eliminar_direccion(*, direccion: Direccion, usuario: Usuario) -> None:
    _exigir_gestor(usuario)
    _exigir_dueno(direccion, usuario)
    direccion.delete()


def visibles_direcciones(usuario: Usuario, qs: QuerySet[Direccion]) -> QuerySet[Direccion]:
    if not usuario or not usuario.is_authenticated:
        return qs.none()
    if usuario.es_administrador:
        return qs
    return qs.filter(id_usuario=usuario)
