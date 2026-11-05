"""Añade el recurso ``admin.configuracion`` (ajustes de la plataforma, ADR-022) al rol administrador.

Idempotente: ``sembrar`` solo crea lo que falta y no toca lo que el administrador ya editó.
"""

from django.db import migrations

from apps.rbac.defaults import sembrar


def agregar_configuracion(apps, schema_editor):
    sembrar(
        apps.get_model("rbac", "Rol"),
        apps.get_model("rbac", "Recurso"),
        apps.get_model("rbac", "RolRecurso"),
    )


def quitar_configuracion(apps, schema_editor):
    apps.get_model("rbac", "Recurso").objects.filter(
        codigo="admin.configuracion", es_sistema=True
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("rbac", "0003_recurso_vendedor_ventas")]

    operations = [migrations.RunPython(agregar_configuracion, quitar_configuracion)]
