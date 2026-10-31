"""Datos: plazo inicial de +24 h para los retiros que ya estaban abiertos (ADR-012).

El plazo se cuenta desde el momento de migrar, NO desde ``fecha_creacion``: así el día del
despliegue no se cancela en masa ningún pedido viejo. Aplican las mismas reglas del ADR:

- retiro ``pendiente`` sin pago aprobado;
- retiro ``listo_para_recoger`` con efectivo pendiente o procesando.

Domicilios, retiros ya pagados y pedidos en otros estados no reciben plazo. Es reversible:
al volver atrás se borran todos los plazos y avisos (las columnas desaparecen al revertir
``0009``, pero así revertir solo esta migración también queda limpio).
"""

from datetime import timedelta

from django.db import migrations
from django.db.models import Exists, OuterRef
from django.utils import timezone

HORAS_INICIALES = 24


def poner_plazo_a_retiros_abiertos(apps, schema_editor):
    Pedido = apps.get_model("orders", "Pedido")
    Pago = apps.get_model("payments", "Pago")
    vence_en = timezone.now() + timedelta(hours=HORAS_INICIALES)

    pagos = Pago.objects.filter(id_pedido=OuterRef("pk"))
    retiros = Pedido.objects.filter(tipo_entrega="retiro", vence_en__isnull=True)

    # Pendientes que el puesto aún no confirmó (sin pago, o con un pago que no está aprobado).
    pendientes = retiros.filter(estado="pendiente").exclude(
        Exists(pagos.filter(estado="aprobado"))
    )
    pendientes.update(vence_en=vence_en)

    # Listos para recoger con el efectivo todavía sin cobrar.
    efectivo_sin_cobrar = pagos.filter(metodo_pago="efectivo", estado__in=("pendiente", "procesando"))
    retiros.filter(estado="listo_para_recoger").filter(Exists(efectivo_sin_cobrar)).update(
        vence_en=vence_en
    )


def limpiar_plazos(apps, schema_editor):
    Pedido = apps.get_model("orders", "Pedido")
    Pedido.objects.exclude(vence_en__isnull=True, aviso_vencimiento_en__isnull=True).update(
        vence_en=None, aviso_vencimiento_en=None
    )


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0009_pedido_vence_en"),
        ("payments", "0004_indices_de_consulta"),
    ]

    operations = [
        migrations.RunPython(poner_plazo_a_retiros_abiertos, limpiar_plazos),
    ]
