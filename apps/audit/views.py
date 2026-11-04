"""Vistas de auditoría: lectura exclusiva para administradores."""

import json

from drf_spectacular.utils import OpenApiTypes, extend_schema
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.audit import services
from apps.audit.models import RegistroAuditoria
from apps.audit.serializers import RegistroAuditoriaSerializer
from apps.common.exportacion import respuesta_csv
from apps.common.query import aplicar_ordenamiento


class RegistroAuditoriaViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    queryset = RegistroAuditoria.objects.select_related("id_usuario")
    serializer_class = RegistroAuditoriaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        services.exigir_admin(self.request.user)
        qs = super().get_queryset()
        qs = services.filtrar_registros(qs, self.request.query_params)
        return aplicar_ordenamiento(
            qs, self.request.query_params.get("ordering"), services.ORDENAMIENTO_AUDITORIA
        )

    @extend_schema(
        responses={(200, "text/csv"): OpenApiTypes.BINARY},
        description="Descarga en CSV los registros que coinciden con los filtros del listado.",
    )
    @action(detail=False, methods=["get"])
    def exportar(self, request):
        registros = self.get_queryset().iterator(chunk_size=2000)
        filas = (
            (
                r.fecha_creacion,
                r.id_usuario.correo if r.id_usuario else "Sistema",
                r.accion,
                r.entidad,
                r.id_entidad,
                json.dumps(r.detalle, ensure_ascii=False, sort_keys=True) if r.detalle else "",
                r.direccion_ip,
            )
            for r in registros
        )
        cabeceras = ["Fecha", "Usuario", "Acción", "Entidad", "ID", "Detalle", "IP"]
        return respuesta_csv("auditoria", cabeceras, filas)
