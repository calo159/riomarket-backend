"""Endpoints de direcciones de entrega.

Visibilidad: cada usuario ve las suyas; el administrador ve todas. La
escritura la controla ``EsComprador`` y el service valida la pertenencia.
"""

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.addresses import services
from apps.addresses.models import Direccion
from apps.addresses.serializers import DireccionEscrituraSerializer, DireccionSerializer
from apps.common.permissions import EsComprador
from apps.common.query import aplicar_ordenamiento

PARAMETROS_DIRECCION = [
    OpenApiParameter(name="ordering", enum=list(services.ORDENAMIENTO_DIRECCION)),
]


class DireccionViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [EsComprador()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return DireccionEscrituraSerializer
        return DireccionSerializer

    def get_queryset(self):
        qs = Direccion.objects.select_related("id_usuario")
        qs = services.visibles_direcciones(self.request.user, qs)
        return aplicar_ordenamiento(
            qs, self.request.query_params.get("ordering"), services.ORDENAMIENTO_DIRECCION
        )

    @extend_schema(
        description="Lista las direcciones del usuario (todas si es administrador).",
        parameters=PARAMETROS_DIRECCION,
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        request=DireccionEscrituraSerializer,
        responses={status.HTTP_201_CREATED: DireccionSerializer},
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        direccion = services.crear_direccion(usuario=request.user, datos=serializer.validated_data)
        return Response(DireccionSerializer(direccion).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=DireccionEscrituraSerializer,
        responses={status.HTTP_200_OK: DireccionSerializer},
    )
    def update(self, request, *args, **kwargs):
        direccion = self.get_object()
        serializer = self.get_serializer(
            direccion, data=request.data, partial=kwargs.pop("partial", False)
        )
        serializer.is_valid(raise_exception=True)
        direccion = services.actualizar_direccion(
            direccion=direccion, usuario=request.user, datos=serializer.validated_data
        )
        return Response(DireccionSerializer(direccion).data)

    @extend_schema(request=None, responses={status.HTTP_200_OK: DireccionSerializer})
    @action(detail=True, methods=["post"], url_path="predeterminar")
    def marcar_predeterminada(self, request, pk=None):
        direccion = self.get_object()
        direccion = services.marcar_predeterminada(direccion=direccion, usuario=request.user)
        return Response(DireccionSerializer(direccion).data)
