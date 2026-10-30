"""Datos: los retiros que estaban «en camino» pasan a «listo para recoger».

Antes un pedido de retiro usaba ``en_camino`` para decir «ya puedes pasar por él».
Con ``listo_para_recoger`` (ADR-009) ese estado es solo de domicilio. Es reversible:
al volver atrás, todo retiro ``listo_para_recoger`` regresa a ``en_camino``.
No toca el historial de notificaciones ni la auditoría (guardan texto de su momento).
"""

from django.db import migrations


def retiros_a_listo_para_recoger(apps, schema_editor):
    Pedido = apps.get_model("orders", "Pedido")
    Pedido.objects.filter(tipo_entrega="retiro", estado="en_camino").update(
        estado="listo_para_recoger"
    )


def retiros_a_en_camino(apps, schema_editor):
    Pedido = apps.get_model("orders", "Pedido")
    Pedido.objects.filter(tipo_entrega="retiro", estado="listo_para_recoger").update(
        estado="en_camino"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0007_estado_listo_para_recoger"),
    ]

    operations = [
        migrations.RunPython(retiros_a_listo_para_recoger, retiros_a_en_camino),
    ]
