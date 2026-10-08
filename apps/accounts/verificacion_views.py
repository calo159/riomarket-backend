"""Endpoints de verificación de identidad de vendedores (Incremento 2).

Flujo:
- El vendedor envía ``numero_cedula`` + ``foto_cedula`` (multipart) → crea o
  reabre su solicitud en estado ``pendiente``.
- ``GET /solicitudes/`` (admin) lista la cola; ``PATCH`` decide (aprobar/rechazar
  con motivo); la foto privada solo se entrega al revisor asignado o admin
  (ADR-002: jamás pública).
"""

import mimetypes

from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import exceptions, generics, status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts import services
from apps.accounts.models import Vendedor
from apps.accounts.verificacion_serializers import (
    DecidirVerificacionSerializer,
    MiVerificacionSerializer,
    SolicitudVerificacionSerializer,
    VerificacionAdminListSerializer,
)
from apps.common.permissions import EsAdministrador, EsVendedor

SIN_SOLICITUD = {
    "id": None,
    "estado_verificacion": None,
    "motivo_rechazo": "",
    "fecha_solicitud": None,
    "fecha_revision": None,
}

# Respuesta de error uniforme (misma forma que el resto de la API).
def _errores_serializer(nombre):
    from drf_spectacular.utils import inline_serializer
    from rest_framework import serializers

    return inline_serializer(
        nombre,
        {
            "detail": serializers.CharField(),
            "errors": serializers.DictField(
                child=serializers.ListField(child=serializers.CharField())
            ),
        },
    )


ERROR_SOLICITUD = _errores_serializer("ErrorSolicitudVerificacion")
ERROR_CEDULA = _errores_serializer("ErrorArchivoCedula")


class EsRevisorAsignado(BasePermission):
    """Solo el administrador revisor asignado (o un superusuario).

    Una solicitud sin revisor asignado (pendiente) la puede abrir cualquier
    administrador; una vez revisada, solo su revisor o un superusuario.
    """

    message = "Solo el revisor asignado puede ver la foto del documento."

    def has_object_permission(self, request, view, obj):
        if not EsAdministrador().has_permission(request, view):
            return False
        if not obj.id_revisor_id or request.user.is_superuser:
            return True
        return obj.id_revisor_id == request.user.pk


@extend_schema(
    description=(
        "``POST`` crea o reabre la solicitud del propio vendedor (multipart "
        "``numero_cedula`` + ``foto_cedula``); ``GET`` devuelve el estado actual."
    ),
)
class SolicitudVerificacionView(APIView):
    permission_classes = [EsVendedor]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verificacion"

    @extend_schema(
        responses={
            200: MiVerificacionSerializer,
            404: ERROR_SOLICITUD,
        },
    )
    def get(self, request):
        vendedor = services.mi_verificacion(request.user)
        if vendedor is None:
            return Response(SIN_SOLICITUD)
        return Response(MiVerificacionSerializer(vendedor).data)

    @extend_schema(
        request=SolicitudVerificacionSerializer,
        responses={
            200: MiVerificacionSerializer,
            201: MiVerificacionSerializer,
            400: ERROR_SOLICITUD,
            403: ERROR_SOLICITUD,
        },
    )
    def post(self, request):
        existia = Vendedor.objects.filter(id_usuario=request.user).exists()
        serializer = SolicitudVerificacionSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        vendedor = serializer.save()
        data = MiVerificacionSerializer(vendedor).data
        estado = status.HTTP_200_OK if existia else status.HTTP_201_CREATED
        return Response(data, status=estado)


class SolicitudesAdminListView(generics.ListAPIView):
    """``GET /solicitudes/`` (admin) — cola de revisión, filtrable por ``estado``."""

    permission_classes = [EsAdministrador]
    serializer_class = VerificacionAdminListSerializer

    @extend_schema(
        parameters=[OpenApiParameter("estado", OpenApiTypes.STR, OpenApiParameter.QUERY)]
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        qs = Vendedor.objects.select_related("id_usuario", "id_revisor").order_by(
            "estado_verificacion", "-fecha_solicitud"
        )
        estado = self.request.query_params.get("estado")
        if estado:
            if estado not in services.SOLICITUD_ESTADOS:
                raise exceptions.ValidationError(
                    {"estado": f"Estado de verificación inválido: {estado!r}."}
                )
            qs = qs.filter(estado_verificacion=estado)
        return qs


class DecidirVerificacionView(generics.UpdateAPIView):
    """``PATCH /solicitudes/{id}/`` (admin) — aprueba o rechaza con motivo."""

    permission_classes = [EsAdministrador]
    serializer_class = DecidirVerificacionSerializer
    http_method_names = ["patch", "put", "head", "options"]
    queryset = Vendedor.objects.all()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        resultado = serializer.save()
        return Response(VerificacionAdminListSerializer(resultado).data)


@extend_schema(
    description="Sirve la foto de cédula (PRIVATE_MEDIA_ROOT) al revisor asignado.",
    parameters=[OpenApiParameter("pk", OpenApiTypes.INT, OpenApiParameter.PATH)],
)
class CedulaPrivadaView(APIView):
    """``GET /solicitudes/{id}/cedula/`` — archivo protegido, nunca público."""

    permission_classes = [EsAdministrador, EsRevisorAsignado]

    @extend_schema(
        responses={
            200: OpenApiTypes.BINARY,
            403: ERROR_CEDULA,
            404: ERROR_CEDULA,
        },
    )
    def get(self, request, pk):
        vendedor = get_object_or_404(Vendedor, pk=pk)
        if not vendedor.foto_cedula:
            raise Http404("La solicitud aún no tiene foto de cédula.")
        self.check_object_permissions(request, vendedor)
        nombre = vendedor.foto_cedula.name.rsplit("/", 1)[-1]
        tipo = mimetypes.guess_type(nombre)[0] or "application/octet-stream"
        return FileResponse(vendedor.foto_cedula.open("rb"), as_attachment=False, content_type=tipo)
