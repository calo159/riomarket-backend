from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common import pricing


class ConfiguracionPublicaSerializer(serializers.Serializer):
    tarifa_domicilio = serializers.DecimalField(max_digits=12, decimal_places=2)


class ConfiguracionPublicaView(APIView):
    """Lo que la tienda necesita mostrar antes de comprar: hoy, la tarifa de domicilio vigente.

    Es el mismo número que el servidor cobra (``pricing``), así que el formulario de pago nunca
    anuncia una tarifa distinta de la que se aplica. No expone comisión ni límites.
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []

    @extend_schema(responses={200: ConfiguracionPublicaSerializer})
    def get(self, request):
        datos = {"tarifa_domicilio": pricing.tarifa_domicilio(es_domicilio=True)}
        return Response(ConfiguracionPublicaSerializer(datos).data)
