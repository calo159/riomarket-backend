from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.menu import menu_para


class MenuItemSerializer(serializers.Serializer):
    codigo = serializers.CharField()
    nombre = serializers.CharField()
    ruta = serializers.CharField()
    icono = serializers.CharField(allow_blank=True)
    ambito = serializers.CharField()
    grupo = serializers.CharField(allow_blank=True)
    orden = serializers.IntegerField()


class MenuSerializer(serializers.Serializer):
    rol = serializers.CharField()
    roles = serializers.ListField(child=serializers.CharField())
    recursos = serializers.ListField(child=serializers.CharField())
    items = MenuItemSerializer(many=True)
    badges = serializers.DictField(child=serializers.IntegerField())


class MenuView(APIView):
    """``GET /api/auth/menu/`` — menú del usuario según sus recursos (público)."""

    permission_classes = [AllowAny]

    @extend_schema(responses={200: MenuSerializer})
    def get(self, request):
        return Response(MenuSerializer(menu_para(request.user)).data)
