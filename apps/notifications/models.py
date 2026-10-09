"""Modelo de notificaciones in-app.

- ``id_pedido`` es ``SET_NULL``: borrar el pedido no debe borrar el aviso al
  usuario (historial de comunicaciones).
- ``leida`` + ``fecha_lectura`` permiten el contador de no leídas.
"""

from django.db import models


class Notificacion(models.Model):
    class Tipo(models.TextChoices):
        PEDIDO_CREADO = "pedido_creado", "Pedido creado"
        PEDIDO_CONFIRMADO = "pedido_confirmado", "Pedido confirmado"
        PEDIDO_EN_PREPARACION = "pedido_en_preparacion", "Pedido en preparación"
        PEDIDO_EN_CAMINO = "pedido_en_camino", "Pedido en camino"
        PEDIDO_ENTREGADO = "pedido_entregado", "Pedido entregado"
        PEDIDO_CANCELADO = "pedido_cancelado", "Pedido cancelado"
        PAGO_APROBADO = "pago_aprobado", "Pago aprobado"
        PAGO_RECHAZADO = "pago_rechazado", "Pago rechazado"
        VERIFICACION = "verificacion", "Verificación"
        GENERAL = "general", "General"

    id_usuario = models.ForeignKey(
        "accounts.Usuario",
        on_delete=models.CASCADE,
        related_name="notificaciones",
        verbose_name="usuario",
    )
    id_pedido = models.ForeignKey(
        "orders.Pedido",
        on_delete=models.SET_NULL,
        related_name="notificaciones",
        null=True,
        blank=True,
        verbose_name="pedido",
    )
    tipo = models.CharField(max_length=30, choices=Tipo.choices)
    titulo = models.CharField(max_length=120)
    mensaje = models.TextField()
    leida = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_lectura = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "notificación"
        verbose_name_plural = "notificaciones"
        ordering = ["-fecha_creacion"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    tipo__in=[
                        "pedido_creado",
                        "pedido_confirmado",
                        "pedido_en_preparacion",
                        "pedido_en_camino",
                        "pedido_entregado",
                        "pedido_cancelado",
                        "pago_aprobado",
                        "pago_rechazado",
                        "verificacion",
                        "general",
                    ]
                ),
                name="notificacion_tipo_valido",
            ),
        ]

    def __str__(self):
        return f"Notificación #{self.pk} → {self.id_usuario_id} ({self.tipo})"
