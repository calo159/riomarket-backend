"""Migración de datos: ningún puesto existente publica el celular sin que su dueño lo decida.

Hasta ahora ``acepta_whatsapp`` valía ``True`` por defecto y no se mostraba en ninguna parte,
así que ningún vendedor lo eligió. Se pone en ``False`` para todos; cada vendedor lo activa
desde «Mis puestos». La marcha atrás no restaura el valor anterior: era un valor por defecto,
no una decisión de nadie.
"""

from django.db import migrations


def desactivar_whatsapp(apps, schema_editor):
    Puesto = apps.get_model("catalog", "Puesto")
    Puesto.objects.filter(acepta_whatsapp=True).update(acepta_whatsapp=False)


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0005_whatsapp_privado_por_defecto"),
    ]

    operations = [
        migrations.RunPython(desactivar_whatsapp, migrations.RunPython.noop),
    ]
