"""Siembra roles y recursos por defecto y asigna a cada usuario existente su rol base."""

from django.db import migrations

from apps.rbac.defaults import sembrar


def sembrar_y_asignar(apps, schema_editor):
    Rol = apps.get_model("rbac", "Rol")
    Recurso = apps.get_model("rbac", "Recurso")
    RolRecurso = apps.get_model("rbac", "RolRecurso")
    UsuarioRol = apps.get_model("rbac", "UsuarioRol")
    Usuario = apps.get_model("accounts", "Usuario")

    sembrar(Rol, Recurso, RolRecurso)
    roles = {rol.nombre: rol for rol in Rol.objects.filter(es_sistema=True)}
    existentes = set(UsuarioRol.objects.values_list("id_usuario_id", "id_rol_id"))
    nuevas = [
        UsuarioRol(id_usuario_id=pk, id_rol=roles[rol])
        for pk, rol in Usuario.objects.values_list("pk", "rol")
        if rol in roles and (pk, roles[rol].pk) not in existentes
    ]
    UsuarioRol.objects.bulk_create(nuevas)


class Migration(migrations.Migration):
    dependencies = [
        ("rbac", "0001_initial"),
        ("accounts", "0004_tokenrecuperacion_favoritoproducto_favoritopuesto"),
    ]

    operations = [migrations.RunPython(sembrar_y_asignar, migrations.RunPython.noop)]
