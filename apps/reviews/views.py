"""Endpoints de reseñas de puestos.

- Listado público por puesto; los vendedores ven las de sus puestos (incluidas
  las ocultas) y el admin todas.
- Escribir (crear) es de comprador; editar/eliminar decide el service (autor
  o admin); responder es del vendedor dueño (o admin).
"""

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.common.permissions import EsComprador
from apps.common.query import aplicar_ordenamiento
from apps.reviews import services
from apps.reviews.models import Resena
from apps.reviews.serializers import (
    ResenaEscrituraSerializer,
    ResenaSerializer,
    RespuestaSerializer,
)

PARAMETROS_RESENA = [
    OpenApiParameter(name="puesto", type=int, description="ID del puesto"),
    OpenApiParameter(name="vendedor", type=int),
    OpenApiParameter(name="calificacion_min", type=int),
    OpenApiParameter(name="calificacion_max", type=int),
    OpenApiParameter(name="con_respuesta", type=bool),
    OpenApiParameter(name="ordering", enum=list(services.ORDENAMIENTO_RESENA)),
]


class ResenaViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action == "create":
            return [EsComprador()]
        # update/partial_update/destroy/responder: el service valida objeto
        # (autor de la reseña, vendedor dueño o administrador).
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ResenaEscrituraSerializer
        return ResenaSerializer

    def get_queryset(self):
        qs = Resena.objects.select_related("id_usuario", "id_puesto", "id_pedido")
        qs = services.visibles_resenas(self.request.user, qs)
        qs = services.filtrar_resenas(qs, self.request.query_params)
        return aplicar_ordenamiento(
            qs, self.request.query_params.get("ordering"), services.ORDENAMIENTO_RESENA
        )

    @extend_schema(
        description="Lista reseñas por puesto (solo las visibles en público).",
        parameters=PARAMETROS_RESENA,
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resena = services.crear_resena(usuario=request.user, datos=serializer.validated_data)
        return Response(ResenaSerializer(resena).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        resena = self.get_object()
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(resena, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        resena = services.actualizar_resena(
            resena=resena, usuario=request.user, datos=serializer.validated_data
        )
        return Response(ResenaSerializer(resena).data)

    def destroy(self, request, *args, **kwargs):
        resena = self.get_object()
        services.eliminar_resena(resena=resena, usuario=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(request=RespuestaSerializer, responses={status.HTTP_200_OK: ResenaSerializer})
    @action(detail=True, methods=["post"], url_path="responder")
    def responder(self, request, pk=None):
        resena = self.get_object()
        serializer = RespuestaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resena = services.responder_resena(
            resena=resena, usuario=request.user, datos=serializer.validated_data
        )
        return Response(ResenaSerializer(resena).data)
