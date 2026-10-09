"""Modelos de cupones y su consumo.

- ``id_puesto`` nulo = cupón global (solo administradores). ``SET_NULL``:
  borrar un puesto no invalida el historial de cupones.
- ``UsoCupon.id_pedido`` es único: cada pedido consume a lo sumo un cupón, y
  el cupón vive como snapshot en ``Pedido.id_cupon/descuento_cupon``.
"""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


class Cupon(models.Model):
    class TipoDescuento(models.TextChoices):
        PORCENTAJE = "porcentaje", "Porcentaje"
        MONTO = "monto", "Monto fijo"

    codigo = models.CharField(max_length=40, unique=True)
    id_puesto = models.ForeignKey(
        "catalog.Puesto",
        on_delete=models.SET_NULL,
        related_name="cupones",
        null=True,
        blank=True,
        verbose_name="puesto",
        help_text="Vacío = cupón global del marketplace.",
    )
    tipo_descuento = models.CharField(max_length=15, choices=TipoDescuento.choices)
    valor = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Porcentaje (1-100) o monto fijo en pesos.",
    )
    monto_minimo_pedido = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    tope_descuento = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Descuento máximo (aplica a porcentajes).",
    )
    usos_totales = models.PositiveIntegerField(
        null=True, blank=True, help_text="Total de usos permitidos (vacío = ilimitado)."
    )
    usos_por_usuario = models.PositiveIntegerField(
        null=True, blank=True, help_text="Usos permitidos por usuario (vacío = ilimitado)."
    )
    fecha_inicio = models.DateTimeField(null=True, blank=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "cupón"
        verbose_name_plural = "cupones"
        ordering = ["-fecha_creacion"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(tipo_descuento__in=["porcentaje", "monto"]),
                name="cupon_tipo_valido",
            ),
            models.CheckConstraint(condition=models.Q(valor__gt=0), name="cupon_valor_positivo"),
            models.CheckConstraint(
                condition=models.Q(tipo_descuento="monto") | models.Q(valor__lte=100),
                name="cupon_porcentaje_no_excede_100",
            ),
            models.CheckConstraint(
                condition=models.Q(fecha_fin__isnull=True)
                | models.Q(fecha_inicio__isnull=True)
                | models.Q(fecha_inicio__lte=models.F("fecha_fin")),
                name="cupon_fechas_coherentes",
            ),
            models.CheckConstraint(
                condition=models.Q(usos_totales__isnull=True) | models.Q(usos_totales__gt=0),
                name="cupon_usos_totales_positivos",
            ),
            models.CheckConstraint(
                condition=models.Q(usos_por_usuario__isnull=True)
                | models.Q(usos_por_usuario__gt=0),
                name="cupon_usos_por_usuario_positivos",
            ),
        ]

    def clean(self):
        super().clean()
        self.codigo = (self.codigo or "").strip().upper()
        if not self.codigo:
            raise ValidationError({"codigo": "El código no puede estar vacío."})
        if self.tipo_descuento == self.TipoDescuento.PORCENTAJE and self.valor > Decimal("100"):
            raise ValidationError({"valor": "Un porcentaje no puede superar 100."})

    def __str__(self):
        return f"{self.codigo} (-{self.valor}{'%' if self.tipo_descuento == 'porcentaje' else '$'})"


class UsoCupon(models.Model):
    id_cupon = models.ForeignKey(Cupon, on_delete=models.CASCADE, related_name="usos")
    id_usuario = models.ForeignKey(
        "accounts.Usuario", on_delete=models.CASCADE, related_name="usos_cupones"
    )
    id_pedido = models.ForeignKey(
        "orders.Pedido",
        on_delete=models.CASCADE,
        related_name="uso_cupon",
        verbose_name="pedido",
    )
    descuento_aplicado = models.DecimalField(max_digits=12, decimal_places=2)
    fecha_uso = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "uso de cupón"
        verbose_name_plural = "usos de cupones"
        ordering = ["-fecha_uso"]
        constraints = [
            models.UniqueConstraint(fields=["id_pedido"], name="uso_cupon_unico_por_pedido"),
        ]

    def __str__(self):
        return f"{self.id_cupon} → {self.id_usuario_id}"
