"""Modelos del módulo de pagos (Fase 4)."""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from apps.orders.models import Pedido


class Pago(models.Model):
    class MetodoPago(models.TextChoices):
        EFECTIVO = "efectivo", "Efectivo"
        TRANSFERENCIA = "transferencia", "Transferencia"
        TARJETA = "tarjeta", "Tarjeta debito/credito"
        NEQUI = "nequi", "Nequi"
        DAVIPLATA = "daviplata", "Daviplata"
        SIMULADO = "simulado", "Simulado (sandbox)"

    class Estado(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        PROCESANDO = "procesando", "Procesando"
        APROBADO = "aprobado", "Aprobado"
        RECHAZADO = "rechazado", "Rechazado"
        REEMBOLSADO = "reembolsado", "Reembolsado"
        ANULADO = "anulado", "Anulado"

    ESTADOS_FINALES = (Estado.APROBADO, Estado.RECHAZADO, Estado.REEMBOLSADO, Estado.ANULADO)

    id_pedido = models.OneToOneField(
        Pedido, on_delete=models.PROTECT, related_name="pago", verbose_name="pedido"
    )
    metodo_pago = models.CharField(
        max_length=20, choices=MetodoPago.choices, default=MetodoPago.SIMULADO
    )
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.PENDIENTE)
    subtotal_pedido = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    tarifa_domicilio_aplicada = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    comision_plataforma = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    descuento_aplicado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0"))],
        help_text="Descuento del cupón aplicado al pedido (lo asume el vendedor).",
    )
    total_cobrado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    referencia_gateway = models.CharField(max_length=120, blank=True)
    datos_sandbox = models.JSONField(default=dict, blank=True)
    notas = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    fecha_aprobacion = models.DateTimeField(null=True, blank=True)
    fecha_reembolso = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "pago"
        verbose_name_plural = "pagos"
        ordering = ["-fecha_creacion"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    estado__in=[
                        "pendiente",
                        "procesando",
                        "aprobado",
                        "rechazado",
                        "reembolsado",
                        "anulado",
                    ]
                ),
                name="pago_estado_valido",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    metodo_pago__in=[
                        "efectivo",
                        "transferencia",
                        "tarjeta",
                        "nequi",
                        "daviplata",
                        "simulado",
                    ]
                ),
                name="pago_metodo_valido",
            ),
            models.CheckConstraint(
                condition=models.Q(subtotal_pedido__gte=0)
                & models.Q(tarifa_domicilio_aplicada__gte=0)
                & models.Q(comision_plataforma__gte=0)
                & models.Q(descuento_aplicado__gte=0)
                & models.Q(total_cobrado__gte=0),
                name="pago_montos_no_negativos",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    total_cobrado=models.F("subtotal_pedido")
                    + models.F("tarifa_domicilio_aplicada")
                    - models.F("descuento_aplicado")
                ),
                name="pago_total_coincide_con_subtotal_mas_domicilio",
            ),
        ]

    def clean(self):
        super().clean()
        if (
            self.id_pedido_id
            and hasattr(self.id_pedido, "estado")
            and self.id_pedido.estado == Pedido.Estado.CANCELADO
        ):
            raise ValidationError(
                {"id_pedido": "No se puede registrar un pago para un pedido cancelado."}
            )

    @property
    def es_final(self) -> bool:
        return self.estado in self.ESTADOS_FINALES

    @property
    def neto_vendedor(self) -> Decimal:
        """Lo que recibe el vendedor: subtotal - comisión - descuento (ADR-003/6b)."""
        from apps.common import pricing

        return pricing.neto_vendedor(self.subtotal_pedido, self.comision_plataforma) - Decimal(
            self.descuento_aplicado
        )

    def __str__(self):
        return f"Pago #{self.pk} - Pedido #{self.id_pedido_id} - {self.estado}"
