"""Vistas de promociones/cupones.

- Consulta (list/retrieve): ``IsAuthenticated``; la visibilidad (admin vs
  vendedor de su puesto) se resuelve en ``services.visibles_cupones``.
- Mutaciones (create/update/delete): cualquier usuario autenticado, las reglas
  de pertenencia las imponen los services.
- ``POST /api/promotions/cupones/validar/``: valida un cupón para el checkout
  sin registrar uso (no muta nada).
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.catalog.models import Puesto
from apps.common.query import aplicar_ordenamiento
from apps.promotions import services
from apps.promotions.models import Cupon
from apps.promotions.serializers import (
    CuponSerializer,
    ValidarCuponResponse,
    ValidarCuponSerializer,
)


class CuponViewSet(viewsets.ModelViewSet):
    queryset = Cupon.objects.select_related("id_puesto__id_vendedor")
    serializer_class = CuponSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = services.visibles_cupones(self.request.user, super().get_queryset())
        qs = services.filtrar_cupones(qs, self.request.query_params)
        return aplicar_ordenamiento(
            qs, self.request.query_params.get("ordering"), services.ORDENAMIENTO_CUPON
        )

    def perform_destroy(self, instance):
        services.eliminar_cupon(cupon=instance, usuario=self.request.user)

    def perform_create(self, serializer):
        services.crear_cupon(usuario=self.request.user, datos=serializer.validated_data)

    def perform_update(self, serializer):
        services.actualizar_cupon(
            cupon=serializer.instance, usuario=self.request.user, datos=serializer.validated_data
        )

    @action(detail=False, methods=["post"])
    def validar(self, request):
        entrada = ValidarCuponSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        puesto = Puesto.objects.filter(pk=entrada.validated_data["id_puesto"]).first()
        if puesto is None:
            raise ValidationError({"id_puesto": "El puesto no existe."})
        resultado = services.validar_cupon(
            usuario=request.user,
            codigo=entrada.validated_data["codigo"],
            puesto=puesto,
            subtotal=entrada.validated_data["subtotal"],
        )
        return Response(ValidarCuponResponse(resultado).data, status=status.HTTP_200_OK)
