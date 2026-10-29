"""API del módulo de administración: usuarios, moderación y resumen."""

from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.administration import services
from apps.administration.serializers import (
    CambiarRolSerializer,
    SuspenderSerializer,
    UsuarioAdminSerializer,
)
from apps.common.permissions import EsAdministrador
from apps.common.query import aplicar_ordenamiento

PARAMETROS_USUARIO = [
    OpenApiParameter(name="rol", enum=["comprador", "vendedor", "administrador"]),
    OpenApiParameter(name="estado", enum=["activo", "suspendido"]),
    OpenApiParameter(name="q", type=OpenApiTypes.STR, description="Nombre, correo o celular"),
    OpenApiParameter(name="ordering", enum=list(services.ORDENAMIENTO_USUARIO)),
]


class UsuarioAdminViewSet(viewsets.ReadOnlyModelViewSet):
    """Cuentas del marketplace con sus métricas y acciones de administración."""

    permission_classes = [EsAdministrador]
    serializer_class = UsuarioAdminSerializer
    http_method_names = ["get", "post", "head", "options"]

    @extend_schema(parameters=PARAMETROS_USUARIO)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        params = self.request.query_params
        qs = services.filtrar_usuarios(services.usuarios_con_metricas(), params)
        return aplicar_ordenamiento(qs, params.get("ordering"), services.ORDENAMIENTO_USUARIO)

    def _serializar(self, usuario):
        usuario = self.get_queryset().get(pk=usuario.pk)
        return self.get_serializer(usuario).data

    @extend_schema(
        request=CambiarRolSerializer,
        responses={200: UsuarioAdminSerializer},
        description="Cambia el rol de una cuenta (no el propio, no el último admin).",
    )
    @action(detail=True, methods=["post"], url_path="cambiar-rol")
    def cambiar_rol(self, request, pk=None):
        serializer = CambiarRolSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = services.cambiar_rol(
            usuario=self.get_object(),
            actor=request.user,
            nuevo_rol=serializer.validated_data["rol"],
            motivo=serializer.validated_data["motivo"],
        )
        return Response(self._serializar(usuario))

    @extend_schema(
        request=SuspenderSerializer,
        responses={200: UsuarioAdminSerializer},
        description="Suspende una cuenta, sus puestos activos y sus sesiones.",
    )
    @action(detail=True, methods=["post"])
    def suspender(self, request, pk=None):
        serializer = SuspenderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = services.suspender(
            usuario=self.get_object(),
            actor=request.user,
            **serializer.validated_data,
        )
        return Response(self._serializar(usuario))

    @extend_schema(
        request=None,
        responses={200: UsuarioAdminSerializer},
        description="Reactiva una cuenta suspendida (los puestos se reactivan aparte).",
    )
    @action(detail=True, methods=["post"])
    def reactivar(self, request, pk=None):
        usuario = services.reactivar(usuario=self.get_object(), actor=request.user)
        return Response(self._serializar(usuario))


class ResumenAdminView(APIView):
    """Métricas globales del marketplace para el panel de administración."""

    permission_classes = [EsAdministrador]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        return Response(services.resumen(), status=status.HTTP_200_OK)
