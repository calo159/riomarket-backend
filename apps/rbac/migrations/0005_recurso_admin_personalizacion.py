"""Añade el recurso ``admin.personalizacion`` (identidad y textos del sitio, ADR-024) al rol administrador.

Idempotente: ``sembrar`` solo crea lo que falta y no toca lo que el administrador ya editó.
"""

from django.db import migrations

from apps.rbac.defaults import sembrar


def agregar_personalizacion(apps, schema_editor):
    sembrar(
        apps.get_model("rbac", "Rol"),
        apps.get_model("rbac", "Recurso"),
        apps.get_model("rbac", "RolRecurso"),
    )


def quitar_personalizacion(apps, schema_editor):
    apps.get_model("rbac", "Recurso").objects.filter(
        codigo="admin.personalizacion", es_sistema=True
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("rbac", "0004_recurso_admin_configuracion")]

    operations = [migrations.RunPython(agregar_personalizacion, quitar_personalizacion)]
