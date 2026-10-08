"""Endpoints del catálogo: puestos, productos, categorías e imágenes de producto.

Patrón de permisos:
- ``list``/``retrieve``: lectura pública.
- ``create``: vendedor aprobado (regla 1) — el dueño lo decide la vista.
- ``update``/``destroy``/acciones de mutación: vendedor aprobado Y dueño
  del recurso (o administrador).
- Categorías: escritura solo administrador.
"""

from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiTypes,
    extend_schema,
    extend_schema_view,
)
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.catalog import services
from apps.catalog.models import Categoria, ImagenProducto, Producto, Puesto
from apps.catalog.serializers import (
    CategoriaSerializer,
    ImagenProductoSerializer,
    ProductoSerializer,
    PuestoSerializer,
)
from apps.common.permissions import EsAdministrador, EsDuenoOAdmin, EsVendedorAprobado

PARAMETROS_BUSQUEDA_PRODUCTO = [
    OpenApiParameter(name="q", type=OpenApiTypes.STR, description="Nombre o descripción"),
    OpenApiParameter(name="categoria", type=OpenApiTypes.INT, description="ID de categoría"),
    OpenApiParameter(name="puesto", type=OpenApiTypes.INT, description="ID de puesto"),
    OpenApiParameter(name="precio_min", type=OpenApiTypes.DECIMAL),
    OpenApiParameter(name="precio_max", type=OpenApiTypes.DECIMAL),
    OpenApiParameter(name="estado", enum=["activo", "inactivo", "bloqueado"]),
    OpenApiParameter(
        name="ordering",
        enum=["precio", "-precio", "nombre", "-nombre", "id", "-id"],
    ),
]

PARAMETROS_BUSQUEDA_PUESTO = [
    OpenApiParameter(
        name="q", type=OpenApiTypes.STR, description="Nombre, descripción o dirección"
    ),
    OpenApiParameter(name="categoria", type=OpenApiTypes.INT),
    OpenApiParameter(name="vendedor", type=OpenApiTypes.INT, description="ID del vendedor"),
    OpenApiParameter(name="domicilio", type=OpenApiTypes.BOOL, description="Solo con domicilio"),
    OpenApiParameter(name="estado", enum=["activo", "inactivo", "suspendido"]),
    OpenApiParameter(name="ordering", enum=["nombre", "-nombre", "id", "-id"]),
]


class CategoriaViewSet(viewsets.ModelViewSet):
    """Categorías y subcategorías del mercado. Escritura de administradores."""

    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated(), EsAdministrador()]

    def get_queryset(self):
        qs = Categoria.objects.all()
        usuario = self.request.user
        if usuario.is_authenticated and usuario.es_administrador:
            return qs
        return qs.filter(activa=True)

    def perform_destroy(self, instance):
        # Regla 7: no se borra una categoría con productos (se desactiva).
        services.eliminar_categoria(categoria=instance)


@extend_schema_view(
    list=extend_schema(
        description="Puestos visibles según el rol (ver regla de visibilidad).",
        parameters=PARAMETROS_BUSQUEDA_PUESTO,
    ),
    create=extend_schema(description="Registrar un puesto (vendedor aprobado)."),
)
class PuestoViewSet(viewsets.ModelViewSet):
    """Puestos del mercado. El puesto nace activo; el estado es de moderación."""

    serializer_class = PuestoSerializer
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action == "create":
            return [EsVendedorAprobado()]
        return [EsVendedorAprobado(), EsDuenoOAdmin()]

    def get_queryset(self):
        params = self.request.query_params
        qs = Puesto.objects.select_related("id_vendedor").prefetch_related(
            "categorias_asignadas__id_categoria"
        )
        qs = services.visibles_puestos(self.request.user, qs, params)
        qs = services.filtrar_puestos(qs, params)
        return services.aplicar_ordenamiento(
            qs, params.get("ordering"), services.ORDENAMIENTO_PUESTO
        )

    @action(detail=True, methods=["post"], url_path="categorias")
    def asignar_categoria(self, request, pk=None):
        """``POST /puestos/{id}/categorias/`` con ``{"categoria": <id>}``."""
        puesto = self.get_object()
        categoria = self._get_categoria(request.data.get("categoria"))
        services.asignar_categoria(puesto=puesto, categoria=categoria)
        return Response(self._serializar_refrescado(puesto), status=status.HTTP_201_CREATED)

    def _serializar_refrescado(self, puesto):
        # get_object() trajo categorias_asignadas en prefetch: la mutación
        # anterior la dejó obsoleta, así que se recarga relación fresca.
        puesto = self.get_queryset().get(pk=puesto.pk)
        return self.get_serializer(puesto).data

    @extend_schema(
        parameters=[OpenApiParameter("categoria_id", OpenApiTypes.INT, OpenApiParameter.PATH)]
    )
    @action(detail=True, methods=["delete"], url_path="categorias/(?P<categoria_id>[^/.]+)")
    def quitar_categoria(self, request, pk=None, categoria_id=None):
        """``DELETE /puestos/{id}/categorias/{categoria_id}/`` (dueño o admin)."""
        puesto = self.get_object()
        categoria = self._get_categoria(categoria_id)
        services.quitar_categoria(puesto=puesto, categoria=categoria)
        return Response(self._serializar_refrescado(puesto))

    def _get_categoria(self, categoria_id):
        from django.shortcuts import get_object_or_404

        numero = services.parametro_entero({"categoria_id": categoria_id}, "categoria_id")
        return get_object_or_404(Categoria, id=numero or 0)


@extend_schema_view(
    list=extend_schema(
        description="Productos visibles según el rol y los filtros de búsqueda.",
        parameters=PARAMETROS_BUSQUEDA_PRODUCTO,
    ),
    create=extend_schema(description="Publicar producto (vendedor aprobado)."),
)
class ProductoViewSet(viewsets.ModelViewSet):
    """Productos a la venta. La regla 2 se valida en la capa de servicios."""

    serializer_class = ProductoSerializer
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action == "create":
            return [EsVendedorAprobado()]
        return [EsVendedorAprobado(), EsDuenoOAdmin()]

    def get_queryset(self):
        params = self.request.query_params
        qs = Producto.objects.select_related("id_puesto", "id_categoria").prefetch_related(
            "imagenes"
        )
        qs = services.visibles_productos(self.request.user, qs, params)
        qs = services.filtrar_productos(qs, params)
        return services.aplicar_ordenamiento(
            qs, params.get("ordering"), services.ORDENAMIENTO_PRODUCTO
        )

    @action(detail=True, methods=["post"], url_path="imagenes")
    def subir_imagen(self, request, pk=None):
        """``POST /productos/{id}/imagenes/`` (multipart, campo ``archivo``)."""
        producto = self.get_object()
        cuerpo = request.data.copy()
        cuerpo["id_producto"] = producto.pk
        serializer = ImagenProductoSerializer(data=cuerpo, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        imagen = services.agregar_imagen(
            producto=producto, archivo=serializer.validated_data["archivo"]
        )
        return Response(
            ImagenProductoSerializer(imagen).data,
            status=status.HTTP_201_CREATED,
        )


class ImagenProductoViewSet(viewsets.ModelViewSet):
    """Imágenes de producto. Lectura pública; subir/borrar: vendedor dueño."""

    serializer_class = ImagenProductoSerializer
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action == "create":
            return [EsVendedorAprobado()]
        return [EsVendedorAprobado(), EsDuenoOAdmin()]

    def get_queryset(self):
        qs = ImagenProducto.objects.select_related("id_producto__id_puesto")
        qs = services.visibles_imagenes(self.request.user, qs)
        producto = services.parametro_entero(self.request.query_params, "producto")
        if producto:
            qs = qs.filter(id_producto=producto)
        return qs

    def perform_create(self, serializer):
        # La regla 2/1 de "editar su producto" se aplica sobre el producto destino.
        self.check_object_permissions(self.request, serializer.validated_data["id_producto"])
        serializer.save()
