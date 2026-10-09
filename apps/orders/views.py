"""Endpoints de pedidos.

Patrón de permisos (igual que catálogo, con la lógica en services):
- ``list``/``retrieve``: autenticado; el queryset ya limita a lo suyo
  (comprador → sus pedidos, vendedor → los de sus puestos, admin → todos).
- ``create``: solo comprador activo (EsComprador).
- ``partial_update``: solo el comprador dueño, mientras sea pendiente.
- Acciones de transición: autenticado; quién puede pasar de un estado a
  otro decide ``services`` (regla 5) → 403/400.
"""

from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.permissions import EsComprador
from apps.common.query import aplicar_ordenamiento
from apps.orders import services
from apps.orders.models import Pedido
from apps.orders.serializers import PedidoSerializer

PARAMETROS_PEDIDO = [
    OpenApiParameter(name="estado", enum=Pedido.Estado.values, description="Estado del pedido"),
    OpenApiParameter(name="tipo_entrega", enum=Pedido.TipoEntrega.values),
    OpenApiParameter(name="puesto", type=OpenApiTypes.INT, description="ID del puesto"),
    OpenApiParameter(name="ordering", enum=list(services.ORDENAMIENTO_PEDIDO)),
]


class PedidoViewSet(viewsets.ModelViewSet):
    """Pedidos del marketplace: creación, consulta y transiciones de estado."""

    serializer_class = PedidoSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            return [EsComprador()]
        return [IsAuthenticated()]

    def get_queryset(self):
        params = self.request.query_params
        qs = Pedido.objects.select_related("id_puesto", "id_comprador").prefetch_related("items")
        qs = services.visibles_pedidos(self.request.user, qs, params)
        return aplicar_ordenamiento(qs, params.get("ordering"), services.ORDENAMIENTO_PEDIDO)

    @extend_schema(
        description=(
            "Crea un pedido de UN solo puesto con sus ítems. El servidor "
            "descuenta stock y calcula los montos (regla 4)."
        ),
        responses={status.HTTP_201_CREATED: PedidoSerializer},
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        description=(
            "Edita dirección, referencia y notas del pedido. Solo el "
            "comprador y solo mientras esté pendiente."
        ),
        responses={status.HTTP_200_OK: PedidoSerializer},
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    def _ejecutar_transicion(self, request, funcion):
        pedido = self.get_object()
        pedido = funcion(pedido=pedido, usuario=request.user)
        return Response(self.get_serializer(pedido).data)

    @extend_schema(
        description="El vendedor acepta el pedido (pendiente → confirmado).",
        responses=PedidoSerializer,
    )
    @action(detail=True, methods=["post"])
    def confirmar(self, request, pk=None):
        """``POST /pedidos/{id}/confirmar/`` (vendedor dueño o administrador)."""
        return self._ejecutar_transicion(request, services.confirmar_pedido)

    @extend_schema(
        description="El vendedor empieza a preparar el pedido (confirmado → en_preparacion).",
        responses=PedidoSerializer,
    )
    @action(detail=True, methods=["post"], url_path="en-preparacion")
    def en_preparacion(self, request, pk=None):
        """``POST /pedidos/{id}/en-preparacion/`` (vendedor o administrador)."""
        return self._ejecutar_transicion(request, services.iniciar_preparacion)

    @extend_schema(
        description="El pedido sale a domicilio (en_preparacion → en_camino).",
        responses=PedidoSerializer,
    )
    @action(detail=True, methods=["post"])
    def enviar(self, request, pk=None):
        """``POST /pedidos/{id}/enviar/`` (vendedor o administrador)."""
        return self._ejecutar_transicion(request, services.marcar_enviado)

    @extend_schema(
        description="Marca el pedido como entregado (en_camino → entregado).",
        responses=PedidoSerializer,
    )
    @action(detail=True, methods=["post"])
    def entregar(self, request, pk=None):
        """``POST /pedidos/{id}/entregar/`` (vendedor, comprador o administrador)."""
        return self._ejecutar_transicion(request, services.marcar_entregado)

    @extend_schema(
        description="Cancela el pedido y repone el stock (hasta en_preparacion).",
        responses=PedidoSerializer,
    )
    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        """``POST /pedidos/{id}/cancelar/`` (comprador, vendedor o administrador)."""
        return self._ejecutar_transicion(request, services.cancelar_pedido)
