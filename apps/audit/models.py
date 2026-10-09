"""Modelo de auditoría.

``id_usuario`` con ``SET_NULL``: el rastro de una acción sobrevive al borrado
de la cuenta (queda como acción "anónima/histórica"). ``detalle`` es JSON para
no acoplar el esquema a cada módulo.
"""

from django.db import models


class RegistroAuditoria(models.Model):
    class Accion(models.TextChoices):
        CREAR = "crear", "Crear"
        ACTUALIZAR = "actualizar", "Actualizar"
        ELIMINAR = "eliminar", "Eliminar"
        TRANSICION = "transicion", "Transición de estado"
        APROBAR = "aprobar", "Aprobar"
        RECHAZAR = "rechazar", "Rechazar"
        REEMBOLSAR = "reembolsar", "Reembolsar"
        ANULAR = "anular", "Anular"
        USAR_CUPON = "usar_cupon", "Usar cupón"
        RESPONDER = "responder", "Responder"

    id_usuario = models.ForeignKey(
        "accounts.Usuario",
        on_delete=models.SET_NULL,
        related_name="auditoria",
        null=True,
        blank=True,
        verbose_name="usuario",
    )
    accion = models.CharField(max_length=20, choices=Accion.choices)
    entidad = models.CharField(max_length=50)
    id_entidad = models.PositiveBigIntegerField(null=True, blank=True)
    detalle = models.JSONField(default=dict, blank=True)
    direccion_ip = models.GenericIPAddressField(null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "registro de auditoría"
        verbose_name_plural = "registros de auditoría"
        ordering = ["-fecha_creacion"]
        indexes = [
            models.Index(fields=["entidad", "id_entidad"], name="auditoria_entidad_idx"),
            models.Index(fields=["accion"], name="auditoria_accion_idx"),
            models.Index(fields=["fecha_creacion"], name="auditoria_fecha_idx"),
        ]

    def __str__(self):
        return (
            f"[{self.fecha_creacion:%Y-%m-%d %H:%M}] {self.accion} {self.entidad}#{self.id_entidad}"
        )
