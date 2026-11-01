"""Mantiene ``usuario_has_rol`` alineada con ``Usuario.rol`` (rol base)."""

from django.conf import settings
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.rbac.acceso import invalidar_cache_peticion
from apps.rbac.defaults import DESCRIPCION_ROL
from apps.rbac.models import Recurso, Rol, RolRecurso, UsuarioRol


def sincronizar_rol_base(usuario) -> None:
    rol, _ = Rol.objects.get_or_create(
        nombre=usuario.rol,
        defaults={"descripcion": DESCRIPCION_ROL.get(usuario.rol, ""), "es_sistema": True},
    )
    UsuarioRol.objects.filter(id_usuario=usuario, id_rol__es_sistema=True).exclude(
        id_rol=rol
    ).delete()
    UsuarioRol.objects.get_or_create(id_usuario=usuario, id_rol=rol)


@receiver(post_save, sender=settings.AUTH_USER_MODEL, dispatch_uid="rbac_sync_rol_base")
def _sincronizar(sender, instance, created, update_fields=None, raw=False, **kwargs):
    # Los guardados parciales que no tocan el rol (último acceso, estado...) no cuestan consultas.
    if raw or (not created and update_fields is not None and "rol" not in update_fields):
        return
    sincronizar_rol_base(instance)


@receiver(post_save, dispatch_uid="rbac_invalidar_cache_guardar")
@receiver(post_delete, dispatch_uid="rbac_invalidar_cache_borrar")
def _invalidar_cache(sender, **kwargs):
    # Si los permisos cambian dentro de una petición, la caché de esa petición queda vacía.
    if (
        sender in (Recurso, Rol, RolRecurso, UsuarioRol)
        or sender._meta.label == settings.AUTH_USER_MODEL
    ):
        invalidar_cache_peticion()
