"""Endpoints de notificaciones in-app.

El usuario solo ve las suyas (el admin, todas). No se crean desde el cliente:
las generan los servicios de pedidos, pagos o verificación.
"""

from drf_spectacular.utils import (
    OpenApiParameter,
    extend_schema,
    extend_schema_view,
    inline_serializer,
)
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.query import aplicar_ordenamiento
from apps.notifications import services
from apps.notifications.models import Notificacion
from apps.notifications.serializers import NotificacionSerializer

PARAMETROS_NOTIFICACION = [
    OpenApiParameter(name="leida", type=bool, description="Filtrar por leídas/no leídas"),
    OpenApiParameter(name="tipo", enum=Notificacion.Tipo.values),
    OpenApiParameter(name="pedido", type=int, description="ID del pedido"),
    OpenApiParameter(name="ordering", enum=list(services.ORDENAMIENTO_NOTIFICACION)),
]


@extend_schema_view(
    list=extend_schema(parameters=PARAMETROS_NOTIFICACION),
)
class NotificacionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = Notificacion.objects.select_related("id_usuario", "id_pedido")
        qs = services.visibles_notificaciones(self.request.user, qs)
        qs = services.filtrar_notificaciones(qs, self.request.query_params)
        return aplicar_ordenamiento(
            qs, self.request.query_params.get("ordering"), services.ORDENAMIENTO_NOTIFICACION
        )

    @extend_schema(request=None, responses={status.HTTP_200_OK: NotificacionSerializer})
    @action(detail=True, methods=["post"], url_path="leida")
    def marcar_leida(self, request, pk=None):
        notificacion = self.get_object()
        notificacion = services.marcar_leida(notificacion=notificacion, usuario=request.user)
        return Response(NotificacionSerializer(notificacion).data)

    @extend_schema(
        request=None,
        responses={
            status.HTTP_200_OK: inline_serializer(
                "MarcarTodasResponse", {"marcadas": serializers.IntegerField()}
            )
        },
    )
    @action(detail=False, methods=["post"], url_path="marcar-todas")
    def marcar_todas(self, request):
        marcadas = services.marcar_todas_leidas(usuario=request.user)
        return Response({"marcadas": marcadas})

    @extend_schema(
        responses={
            status.HTTP_200_OK: inline_serializer(
                "ContadorNoLeidasResponse", {"no_leidas": serializers.IntegerField()}
            )
        }
    )
    @action(detail=False, methods=["get"], url_path="contador")
    def contador(self, request):
        return Response({"no_leidas": services.contar_no_leidas(usuario=request.user)})
