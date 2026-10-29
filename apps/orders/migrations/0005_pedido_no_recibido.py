from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0004_pedido_id_cupon_pedido_pedido_totales_no_negativos_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="pedido",
            name="no_recibido_en",
            field=models.DateTimeField(
                blank=True,
                help_text="Cuándo el comprador reportó que el pedido en camino no le ha llegado.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="pedido",
            name="motivo_no_recibido",
            field=models.CharField(
                blank=True,
                help_text="Detalle opcional que escribe el comprador al reportar que no le llegó.",
                max_length=200,
            ),
        ),
    ]
