from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common import pricing
from apps.configuracion import lectura
from apps.configuracion.sitio import CAMPOS, PALETAS


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


class SitioPublicoSerializer(serializers.Serializer):
    """La identidad del sitio con los valores de por defecto ya aplicados."""

    locals().update({c.clave: serializers.CharField(allow_blank=True) for c in CAMPOS})
    color_tema = serializers.CharField()


class SitioPublicoView(APIView):
    """Nombre, ciudad, textos de la portada, contacto y color de la marca (lo que ve la tienda).

    Nada de esto es secreto: es lo que cualquier visitante ve. Es lo mismo que el servidor mete
    en el
    ``index.html`` para que la primera pantalla ya salga con la marca correcta.
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []

    @extend_schema(responses={200: SitioPublicoSerializer})
    def get(self, request):
        datos = lectura.sitio()
        datos["color_tema"] = PALETAS[datos["color_marca"]][1]
        respuesta = Response(SitioPublicoSerializer(datos).data)
        # Siempre se revalida: el navegador no guarda una marca vieja (la respuesta es mínima).
        respuesta["Cache-Control"] = "no-cache"
        return respuesta
