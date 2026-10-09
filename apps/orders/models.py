"""Modelos del módulo de pedidos (reglas de negocio 4 y 5).

Decisiones:
- Un pedido agrupa ítems de UN SOLO puesto (regla 4): en un mercado de
  puestos, checkout, entrega y comisión son por puesto. Pedidos de varios
  puestos son varios pedidos.
- Precio, nombre y unidad se congelan en el ítem: el historial no cambia si
  el vendedor edita su catálogo después del pedido.
- Los montos (subtotal, tarifa, total) los calcula SIEMPRE el servidor en
  ``services.crear_pedido``; el cliente solo envía productos y cantidades.
- FKs con ``PROTECT``: el historial no se pierde si se borra un producto,
  un puesto o una cuenta (``common.exceptions`` lo convierte en 400).
- ``tarifa_domicilio`` nace en 0: la tarifa de envío se define en la fase
  de pagos; el campo existe para no romper la fórmula del total después.
"""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from apps.catalog.models import Producto


class Pedido(models.Model):
    class TipoEntrega(models.TextChoices):
        RETIRO = "retiro", "Retiro en el puesto"
        DOMICILIO = "domicilio", "Domicilio"

    class Estado(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        CONFIRMADO = "confirmado", "Confirmado"
        EN_PREPARACION = "en_preparacion", "En preparación"
        EN_CAMINO = "en_camino", "En camino"
        ENTREGADO = "entregado", "Entregado"
        CANCELADO = "cancelado", "Cancelado"

    ESTADOS_FINALES = (Estado.ENTREGADO, Estado.CANCELADO)

    id_comprador = models.ForeignKey(
        "accounts.Usuario",
        on_delete=models.PROTECT,
        related_name="pedidos",
        verbose_name="comprador",
    )
    id_puesto = models.ForeignKey(
        "catalog.Puesto",
        on_delete=models.PROTECT,
        related_name="pedidos",
        verbose_name="puesto",
    )
    tipo_entrega = models.CharField(
        max_length=15, choices=TipoEntrega.choices, default=TipoEntrega.RETIRO
    )
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.PENDIENTE)
    direccion_entrega = models.CharField(
        max_length=200,
        blank=True,
        help_text="Obligatorio cuando tipo_entrega=domicilio.",
    )
    referencia_entrega = models.CharField(
        max_length=150,
        blank=True,
        help_text="Referencia para encontrar el sitio: color de la casa, portón, etc.",
    )
    id_direccion = models.ForeignKey(
        "addresses.Direccion",
        on_delete=models.SET_NULL,
        related_name="pedidos",
        null=True,
        blank=True,
        verbose_name="dirección guardada",
        help_text="Dirección reutilizada (snapshot); se conserva aunque se borre.",
    )
    latitud_entrega = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitud_entrega = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    notas = models.TextField(blank=True, help_text="Notas del comprador para el vendedor.")
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    tarifa_domicilio = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0"))],
        help_text="Tarifa de domicilio; se cobra cuando la fase de pagos esté activa.",
    )
    id_cupon = models.ForeignKey(
        "promotions.Cupon",
        on_delete=models.SET_NULL,
        related_name="pedidos",
        null=True,
        blank=True,
        verbose_name="cupón aplicado",
        help_text="Snapshot del cupón usado; sobrevive aunque se borre el cupón.",
    )
    descuento_cupon = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "pedido"
        verbose_name_plural = "pedidos"
        ordering = ["-fecha_creacion"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    estado__in=[
                        "pendiente",
                        "confirmado",
                        "en_preparacion",
                        "en_camino",
                        "entregado",
                        "cancelado",
                    ]
                ),
                name="pedido_estado_valido",
            ),
            models.CheckConstraint(
                condition=models.Q(tipo_entrega__in=["retiro", "domicilio"]),
                name="pedido_tipo_entrega_valido",
            ),
            models.CheckConstraint(
                condition=models.Q(subtotal__gte=0)
                & models.Q(tarifa_domicilio__gte=0)
                & models.Q(descuento_cupon__gte=0)
                & models.Q(total__gte=0),
                name="pedido_totales_no_negativos",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    total=models.F("subtotal")
                    + models.F("tarifa_domicilio")
                    - models.F("descuento_cupon")
                ),
                name="pedido_total_es_subtotal_mas_tarifa_menos_descuento",
            ),
            models.CheckConstraint(
                condition=models.Q(tipo_entrega="retiro") | ~models.Q(direccion_entrega=""),
                name="pedido_domicilio_requiere_direccion",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(latitud_entrega__isnull=True, longitud_entrega__isnull=True)
                    | models.Q(latitud_entrega__isnull=False, longitud_entrega__isnull=False)
                ),
                name="pedido_coordenadas_completas",
            ),
        ]

    def clean(self):
        """Defensa explícita de las reglas que también están en CHECK."""
        super().clean()
        errores = {}
        if self.descuento_cupon < 0:
            errores["descuento_cupon"] = "El descuento no puede ser negativo."
        if self.total != self.subtotal + self.tarifa_domicilio - self.descuento_cupon:
            errores["total"] = "El total debe ser subtotal + tarifa_domicilio - descuento."
        if self.id_cupon_id and self.descuento_cupon == 0:
            errores["descuento_cupon"] = "Un pedido con cupón debe aplicar su descuento."
        if self.tipo_entrega == self.TipoEntrega.DOMICILIO and not self.direccion_entrega.strip():
            errores["direccion_entrega"] = (
                "Un pedido a domicilio debe indicar la dirección de entrega."
            )
        if errores:
            raise ValidationError(errores)

    @property
    def es_final(self) -> bool:
        return self.estado in self.ESTADOS_FINALES

    def __str__(self):
        return f"Pedido #{self.pk} ({self.estado})"


class ItemPedido(models.Model):
    """Línea de pedido con el precio congelado en el momento de comprar."""

    id_pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name="items")
    id_producto = models.ForeignKey(
        Producto,
        on_delete=models.PROTECT,
        related_name="items_pedido",
        verbose_name="producto",
        help_text="PROTECT: el producto referenciado por un pedido no se borra (historial).",
    )
    nombre_producto = models.CharField(max_length=120)
    unidad_medida = models.CharField(max_length=15, choices=Producto.UnidadMedida.choices)
    precio_unitario = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    cantidad = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    class Meta:
        verbose_name = "ítem de pedido"
        verbose_name_plural = "ítems de pedido"
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["id_pedido", "id_producto"],
                name="itempedido_producto_unico_por_pedido",
            ),
            models.CheckConstraint(
                condition=models.Q(cantidad__gte=1),
                name="itempedido_cantidad_positiva",
            ),
            models.CheckConstraint(
                condition=models.Q(precio_unitario__gte=0),
                name="itempedido_precio_no_negativo",
            ),
        ]

    @property
    def subtotal(self) -> Decimal:
        return self.precio_unitario * self.cantidad

    def __str__(self):
        return f"{self.cantidad} x {self.nombre_producto}"
