"""Mantiene ``usuario_has_rol`` alineada con ``Usuario.rol`` (rol base)."""

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.accounts.models import Usuario
from apps.rbac.defaults import DESCRIPCION_ROL
from apps.rbac.models import Rol, UsuarioRol


def sincronizar_rol_base(usuario: Usuario) -> None:
    rol, _ = Rol.objects.get_or_create(
        nombre=usuario.rol,
        defaults={"descripcion": DESCRIPCION_ROL.get(usuario.rol, ""), "es_sistema": True},
    )
    UsuarioRol.objects.filter(id_usuario=usuario, id_rol__es_sistema=True).exclude(
        id_rol=rol
    ).delete()
    UsuarioRol.objects.get_or_create(id_usuario=usuario, id_rol=rol)


@receiver(post_save, sender=Usuario, dispatch_uid="rbac_sync_rol_base")
def _sincronizar(sender, instance, created, update_fields=None, raw=False, **kwargs):
    # Los guardados parciales que no tocan el rol (último acceso, estado...) no cuestan consultas.
    if raw or (not created and update_fields is not None and "rol" not in update_fields):
        return
    sincronizar_rol_base(instance)
