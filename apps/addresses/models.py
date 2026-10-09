"""Modelo de direcciones de entrega.

Reglas:
- Una sola dirección predeterminada por usuario (constraint parcial).
- Las coordenadas (para el mapa) van juntas o ninguna.
- Una dirección predeterminada no puede estar inactiva.
"""

from django.core.exceptions import ValidationError
from django.db import models


class Direccion(models.Model):
    id_usuario = models.ForeignKey(
        "accounts.Usuario",
        on_delete=models.CASCADE,
        related_name="direcciones",
        verbose_name="usuario",
    )
    alias = models.CharField(max_length=50, help_text="Etiqueta corta: Casa, Trabajo, etc.")
    direccion = models.CharField(max_length=200, help_text="Dirección de entrega.")
    referencia = models.CharField(
        max_length=150,
        blank=True,
        help_text="Cómo llegar: color de la casa, portón, punto de referencia.",
    )
    latitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    es_predeterminada = models.BooleanField(default=False)
    activa = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "dirección"
        verbose_name_plural = "direcciones"
        ordering = ["-es_predeterminada", "-fecha_creacion"]
        constraints = [
            models.UniqueConstraint(
                fields=["id_usuario"],
                condition=models.Q(es_predeterminada=True),
                name="direccion_predeterminada_unica_por_usuario",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(latitud__isnull=True, longitud__isnull=True)
                    | models.Q(latitud__isnull=False, longitud__isnull=False)
                ),
                name="direccion_coordenadas_completas",
            ),
            models.CheckConstraint(
                condition=models.Q(es_predeterminada=False) | models.Q(activa=True),
                name="direccion_predeterminada_activa",
            ),
        ]

    def clean(self):
        super().clean()
        errores = {}
        if not (self.direccion or "").strip():
            errores["direccion"] = "La dirección no puede estar vacía."
        if (self.latitud is None) != (self.longitud is None):
            errores["latitud"] = "Debe indicar latitud y longitud juntas."
        if self.es_predeterminada and not self.activa:
            errores["es_predeterminada"] = "Una dirección predeterminada debe estar activa."
        if errores:
            raise ValidationError(errores)

    def __str__(self):
        return f"{self.alias}: {self.direccion}"
