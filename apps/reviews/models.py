"""Modelo de reseñas de puestos.

- ``id_pedido`` es ``SET_NULL``: borrar un pedido no borra la reseña
  (historial de reputación).
- La unicidad ``(id_usuario, id_puesto)`` la impone la BD: cada comprador
  tiene una sola reseña por puesto y la actualiza con PUT/PATCH.
- ``visible`` permite moderación: una reseña oculta no se muestra en el
  catálogo público.
"""

from django.core.exceptions import ValidationError
from django.db import models


class Resena(models.Model):
    id_usuario = models.ForeignKey(
        "accounts.Usuario",
        on_delete=models.CASCADE,
        related_name="resenas",
        verbose_name="comprador",
    )
    id_puesto = models.ForeignKey(
        "catalog.Puesto",
        on_delete=models.CASCADE,
        related_name="resenas",
        verbose_name="puesto",
    )
    id_pedido = models.ForeignKey(
        "orders.Pedido",
        on_delete=models.SET_NULL,
        related_name="resenas",
        null=True,
        blank=True,
        verbose_name="pedido",
        help_text="Pedido entregado que origina la reseña (auditoría).",
    )
    calificacion = models.PositiveSmallIntegerField()
    comentario = models.TextField(blank=True)
    respuesta = models.TextField(blank=True)
    fecha_respuesta = models.DateTimeField(null=True, blank=True)
    visible = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "reseña"
        verbose_name_plural = "reseñas"
        ordering = ["-fecha_creacion"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(calificacion__gte=1, calificacion__lte=5),
                name="resena_calificacion_valida",
            ),
            models.UniqueConstraint(
                fields=["id_usuario", "id_puesto"],
                name="resena_unica_por_usuario_y_puesto",
            ),
        ]

    def clean(self):
        super().clean()
        if (self.respuesta or "") and self.fecha_respuesta is None:
            # El service sella fecha_respuesta; si llega aquí sin ella, error.
            raise ValidationError("Una respuesta requiere fecha.")

    def __str__(self):
        return f"Reseña {self.calificacion}/5 de {self.id_usuario_id} → {self.id_puesto_id}"
