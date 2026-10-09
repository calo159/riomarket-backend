"""Vistas de auditoría: lectura exclusiva para administradores."""

from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.audit import services
from apps.audit.models import RegistroAuditoria
from apps.audit.serializers import RegistroAuditoriaSerializer
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
