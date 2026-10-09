"""Endpoints de pagos (Fase 4).

Patrón de permisos (las reglas finas viven en ``services``):
- ``create``: autenticado; solo crea el comprador dueño del pedido (o admin).
- ``list``/``retrieve``: autenticado; el queryset limita a lo propio por rol.
- ``simular``/``confirmar-efectivo``: autenticado; el service decide (sandbox,
  rol) y devuelve 403/400 por el handler global.
- ``reembolsar``/``anular``: administrador.
"""

from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiTypes,
    extend_schema,
    inline_serializer,
)
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView

from apps.common.permissions import EsAdministrador
from apps.common.query import aplicar_ordenamiento
from apps.payments import services
from apps.payments.models import Pago
from apps.payments.serializers import (
    AnularPagoSerializer,
    ConfirmarEfectivoSerializer,
    CrearPagoSerializer,
    PagoAdminSerializer,
    PagoSerializer,
    PagoVendedorSerializer,
    ReembolsarPagoSerializer,
    SimularPagoSerializer,
)

PARAMETROS_PAGO = [
    OpenApiParameter(name="estado", enum=Pago.Estado.values),
    OpenApiParameter(name="metodo_pago", enum=Pago.MetodoPago.values),
    OpenApiParameter(name="pedido", type=OpenApiTypes.INT, description="ID del pedido"),
    OpenApiParameter(name="ordering", enum=list(services.ORDENAMIENTO_PAGO)),
]


class PagoViewSet(viewsets.ModelViewSet):
    serializer_class = PagoSerializer
    http_method_names = ["get", "post", "head", "options"]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "pagos"

    def get_permissions(self):
        if self.action in ("marcar_reembolsado", "anular"):
            return [EsAdministrador()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return CrearPagoSerializer
        return self._serializer_salida()

    def _serializer_salida(self):
        usuario = self.request.user
        if getattr(usuario, "es_administrador", False):
            return PagoAdminSerializer
        if getattr(usuario, "es_vendedor", False):
            return PagoVendedorSerializer
        return PagoSerializer

    def get_queryset(self):
        params = self.request.query_params
        qs = Pago.objects.select_related(
            "id_pedido",
            "id_pedido__id_comprador",
            "id_pedido__id_puesto",
        )
        qs = services.visibles_pagos(self.request.user, qs, params)
        qs = services.filtrar_pagos(qs, params)
        return aplicar_ordenamiento(qs, params.get("ordering"), services.ORDENAMIENTO_PAGO)

    @extend_schema(
        description="Lista los pagos visibles para el usuario (comprador/vendedor/admin).",
        parameters=PARAMETROS_PAGO,
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        description="Registra el pago de un pedido pendiente (no lo aprueba).",
        request=CrearPagoSerializer,
        responses={status.HTTP_201_CREATED: PagoSerializer},
    )
    def create(self, request, *args, **kwargs):
        serializer = CrearPagoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = dict(serializer.validated_data)
        pedido = datos.pop("pedido")
        pago = services.crear_pago(pedido=pedido, usuario=request.user, datos=datos)
        salida = self._serializer_salida()(pago, context=self.get_serializer_context())
        return Response(salida.data, status=status.HTTP_201_CREATED)

    @extend_schema(request=SimularPagoSerializer, responses=PagoSerializer)
    @action(detail=True, methods=["post"], url_path="simular")
    def simular(self, request, pk=None):
        pago = self.get_object()
        serializer = SimularPagoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pago = services.simular_pago(
            pago=pago, usuario=request.user, datos=serializer.validated_data
        )
        return Response(self._serializer_salida()(pago).data)

    @extend_schema(request=ConfirmarEfectivoSerializer, responses=PagoSerializer)
    @action(detail=True, methods=["post"], url_path="confirmar-efectivo")
    def confirmar_efectivo(self, request, pk=None):
        pago = self.get_object()
        serializer = ConfirmarEfectivoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pago = services.confirmar_efectivo(
            pago=pago, usuario=request.user, datos=serializer.validated_data
        )
        return Response(self._serializer_salida()(pago).data)

    @extend_schema(request=ReembolsarPagoSerializer, responses=PagoSerializer)
    @action(detail=True, methods=["post"], url_path="reembolsar")
    def marcar_reembolsado(self, request, pk=None):
        pago = self.get_object()
        serializer = ReembolsarPagoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pago = services.marcar_reembolsado(
            pago=pago, usuario=request.user, datos=serializer.validated_data
        )
        return Response(self._serializer_salida()(pago).data)

    @extend_schema(request=AnularPagoSerializer, responses=PagoSerializer)
    @action(detail=True, methods=["post"], url_path="anular")
    def anular(self, request, pk=None):
        pago = self.get_object()
        serializer = AnularPagoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pago = services.anular_pago(
            pago=pago, usuario=request.user, datos=serializer.validated_data
        )
        return Response(self._serializer_salida()(pago).data)


class PagoWebhookView(APIView):
    """``POST /api/payments/webhook/<proveedor>/`` — evento de la pasarela real.

    Verifica la firma HMAC del cuerpo crudo antes de aplicar el evento.
    """

    authentication_classes: list = []
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    @extend_schema(
        request=inline_serializer(
            "WebhookPagoRequest",
            {
                "referencia": drf_serializers.CharField(),
                "estado": drf_serializers.ChoiceField(choices=["aprobado", "rechazado"]),
            },
        ),
        responses={
            200: inline_serializer(
                "WebhookPagoResponse",
                {"success": drf_serializers.BooleanField(), "estado": drf_serializers.CharField()},
            )
        },
    )
    def post(self, request, proveedor):
        firma = request.headers.get("X-RioMarket-Signature", "")
        pago = services.procesar_webhook(
            proveedor=proveedor,
            cuerpo=request.body,
            payload=request.data,
            firma=firma,
        )
        return Response({"success": True, "estado": pago.estado})
