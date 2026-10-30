"""Serializers de la administración de usuarios y moderación."""

from drf_spectacular.utils import OpenApiTypes, extend_schema_field
from rest_framework import serializers

from apps.accounts.models import Usuario
from apps.administration import services


class UsuarioAdminSerializer(serializers.ModelSerializer):
    estado_verificacion = serializers.SerializerMethodField()
    pedidos_como_comprador = serializers.SerializerMethodField()
    pedidos_activos = serializers.SerializerMethodField()
    puestos = serializers.SerializerMethodField()
    acciones_permitidas = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = (
            "id",
            "nombre",
            "correo",
            "celular",
            "rol",
            "estado",
            "fecha_registro",
            "estado_verificacion",
            "pedidos_como_comprador",
            "pedidos_activos",
            "puestos",
            "acciones_permitidas",
        )

    @extend_schema_field(OpenApiTypes.STR)
    def get_estado_verificacion(self, obj) -> str | None:
        vendedor = getattr(obj, "vendedor", None)
        return getattr(vendedor, "estado_verificacion", None)

    @extend_schema_field(OpenApiTypes.INT)
    def get_pedidos_como_comprador(self, obj) -> int:
        anotado = getattr(obj, "total_pedidos_comprador", None)
        return anotado if anotado is not None else obj.pedidos.count()

    @extend_schema_field(OpenApiTypes.INT)
    def get_pedidos_activos(self, obj) -> int:
        anotado = getattr(obj, "pedidos_activos_count", None)
        return (
            anotado if anotado is not None else services.pedidos_activos_como_comprador(obj).count()
        )

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_puestos(self, obj) -> list[dict]:
        return [
            {"id": puesto.pk, "nombre": puesto.nombre, "estado": puesto.estado}
            for puesto in obj.puestos.all()
        ]

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_acciones_permitidas(self, obj) -> list[str]:
        request = self.context.get("request")
        if request is None:
            return []
        return services.acciones_permitidas(obj, request.user)


class CambiarRolSerializer(serializers.Serializer):
    rol = serializers.ChoiceField(choices=Usuario.Rol.values)
    motivo = serializers.CharField(min_length=services.MOTIVO_MIN, max_length=300)


class SuspenderSerializer(serializers.Serializer):
    motivo = serializers.CharField(min_length=services.MOTIVO_MIN, max_length=300)


class MenuEnlaceSerializer(serializers.Serializer):
    to = serializers.CharField()
    etiqueta = serializers.CharField()
    icono = serializers.CharField()
    fin = serializers.BooleanField(required=False)
    badge = serializers.CharField(required=False)


class MenuGrupoSerializer(serializers.Serializer):
    grupo = serializers.CharField(allow_null=True)
    items = MenuEnlaceSerializer(many=True)


class MenuSerializer(serializers.Serializer):
    rol = serializers.CharField()
    inicio = serializers.CharField()
    publico = MenuEnlaceSerializer(many=True)
    cuenta = MenuEnlaceSerializer(many=True)
    panel = MenuGrupoSerializer(many=True)
    panel_titulo = serializers.CharField(allow_null=True)
    badges = serializers.DictField(child=serializers.IntegerField())
