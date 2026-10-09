"""Endpoints de pagos (Fase 4)."""

from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.permissions import EsAdministrador, EsComprador
from apps.common.query import aplicar_ordenamiento
from apps.orders.models import Pedido
from apps.payments import services
from apps.payments.models import Pago
from apps.payments.serializers import CrearPagoSerializer, PagoSerializer, SimularPagoSerializer


class PagoViewSet(viewsets.ModelViewSet):
    serializer_class = PagoSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            return [EsComprador()]
        if self.action in ("marcar_reembolsado", "anular"):
            return [EsAdministrador()]
        return [IsAuthenticated()]

    def get_queryset(self):
        params = self.request.query_params
        qs = Pago.objects.select_related(
            "id_pedido",
            "id_pedido__id_comprador",
            "id_pedido__id_puesto",
        )
        qs = services.visibles_pagos(self.request.user, qs, params)
        qs = services.filtrar_pagos(qs, params)
        orden = ("-fecha_creacion", "fecha_creacion", "id", "-id")
        return aplicar_ordenamiento(qs, params.get("ordering"), orden)

    @extend_schema(request=CrearPagoSerializer, responses={status.HTTP_201_CREATED: PagoSerializer})
    def create(self, request, *args, **kwargs):
        serializer = CrearPagoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pedido_id = request.data.get("pedido") or request.query_params.get("pedido")
        try:
            pedido = Pedido.objects.select_related("id_comprador", "id_puesto").get(pk=pedido_id)
        except Exception:
            return Response(
                {
                    "success": False,
                    "status_code": 400,
                    "errors": {"pedido": "Pedido no encontrado."},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        pago = services.crear_pago(
            pedido=pedido,
            usuario=request.user,
            datos=serializer.validated_data,
        )
        return Response(self.get_serializer(pago).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=SimularPagoSerializer, responses=PagoSerializer)
    @action(detail=True, methods=["post"], url_path="simular")
    def simular(self, request, pk=None):
        pago = self.get_object()
        serializer = SimularPagoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pago = services.simular_pago(
            pago=pago,
            usuario=request.user,
            datos=serializer.validated_data,
        )
        return Response(self.get_serializer(pago).data)

    @extend_schema(responses=PagoSerializer)
    @action(detail=True, methods=["post"], url_path="reembolsar")
    def marcar_reembolsado(self, request, pk=None):
        pago = self.get_object()
        pago = services.marcar_reembolsado(pago=pago, usuario=request.user, datos=request.data)
        return Response(self.get_serializer(pago).data)

    @extend_schema(responses=PagoSerializer)
    @action(detail=True, methods=["post"], url_path="anular")
    def anular(self, request, pk=None):
        pago = self.get_object()
        pago = services.anular_pago(pago=pago, usuario=request.user, datos=request.data)
        return Response(self.get_serializer(pago).data)
