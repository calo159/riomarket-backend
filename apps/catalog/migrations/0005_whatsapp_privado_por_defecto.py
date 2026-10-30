from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0004_indices_puesto_usuario"),
    ]

    operations = [
        migrations.AlterField(
            model_name="puesto",
            name="acepta_whatsapp",
            field=models.BooleanField(
                default=False,
                help_text="Si está activo, el celular del vendedor se muestra a los compradores.",
            ),
        ),
    ]
