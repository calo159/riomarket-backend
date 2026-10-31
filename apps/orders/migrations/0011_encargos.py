"""Productos por encargo (ADR-013): modalidad y detalles en el ítem, fecha pedida en el pedido.

No lleva ``RunPython`` a propósito: los datos existentes ya quedan correctos con el valor por
defecto. Todo pedido anterior se hizo con productos de stock, así que ``ItemPedido.modalidad``
nace en «stock» (lo que decide que cancelar sí repone stock, como siempre), ``detalles`` en
vacío y ``fecha_solicitada`` en ``NULL``. ``tests/test_migracion_encargos.py`` lo verifica.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0008_producto_encargo'),
        ('orders', '0010_vence_en_de_pedidos_abiertos'),
    ]

    operations = [
        migrations.AddField(
            model_name='itempedido',
            name='detalles',
            field=models.CharField(blank=True, default='', help_text='Lo que el comprador escribió para el encargo (sabor, mensaje...).', max_length=300),
        ),
        migrations.AddField(
            model_name='itempedido',
            name='modalidad',
            field=models.CharField(choices=[('stock', 'Con stock'), ('encargo', 'Por encargo')], default='stock', help_text='Copia de la modalidad del producto al pedir. Decide si cancelar repone stock: solo los ítems «stock» lo descontaron.', max_length=10),
        ),
        migrations.AddField(
            model_name='pedido',
            name='fecha_solicitada',
            field=models.DateTimeField(blank=True, help_text='Para cuándo quiere el comprador un encargo (retiro o entrega). Obligatoria si hay un producto por encargo; vacía si no.', null=True),
        ),
        migrations.AddConstraint(
            model_name='itempedido',
            constraint=models.CheckConstraint(condition=models.Q(('modalidad__in', ['stock', 'encargo'])), name='itempedido_modalidad_valida'),
        ),
    ]
