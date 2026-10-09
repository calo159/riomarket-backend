"""Serializers de auditoría (solo lectura)."""

from rest_framework import serializers

from apps.audit.models import RegistroAuditoria


class RegistroAuditoriaSerializer(serializers.ModelSerializer):
    usuario_correo = serializers.CharField(source="id_usuario.correo", read_only=True, default=None)

    class Meta:
        model = RegistroAuditoria
        fields = (
            "id",
            "id_usuario",
            "usuario_correo",
            "accion",
            "entidad",
            "id_entidad",
            "detalle",
            "direccion_ip",
            "fecha_creacion",
        )
        read_only_fields = fields
