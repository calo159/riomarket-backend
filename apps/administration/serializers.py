"""Serializers de la administración de usuarios y moderación."""

from drf_spectacular.utils import OpenApiTypes, extend_schema_field
from rest_framework import serializers

from apps.accounts.models import Usuario
from apps.administration import services
from apps.common.motivo import MOTIVO_MAX, MOTIVO_MIN
from apps.rbac.acceso import recursos_de_usuario
from apps.rbac.models import Recurso, Rol


class UsuarioAdminSerializer(serializers.ModelSerializer):
    estado_verificacion = serializers.SerializerMethodField()
    pedidos_como_comprador = serializers.SerializerMethodField()
    pedidos_activos = serializers.SerializerMethodField()
    puestos = serializers.SerializerMethodField()
    acciones_permitidas = serializers.SerializerMethodField()
    roles_asignados = serializers.SerializerMethodField()

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
            "roles_asignados",
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
    def get_roles_asignados(self, obj) -> list[dict]:
        return [
            {"id": a.id_rol_id, "nombre": a.id_rol.nombre, "es_sistema": a.id_rol.es_sistema}
            for a in obj.asignaciones_rol.all()
        ]

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_acciones_permitidas(self, obj) -> list[str]:
        request = self.context.get("request")
        if request is None:
            return []
        # Recursos del actor y total de admins se calculan una vez por respuesta (sin N+1).
        cache = self.context.setdefault("_cache_acciones", {})
        if "recursos" not in cache:
            cache["recursos"] = recursos_de_usuario(request.user)
            cache["admins"] = services._admins_activos()
        return services.acciones_permitidas(obj, request.user, cache["recursos"], cache["admins"])


class CambiarRolSerializer(serializers.Serializer):
    rol = serializers.ChoiceField(choices=Usuario.Rol.values)
    motivo = serializers.CharField(min_length=MOTIVO_MIN, max_length=MOTIVO_MAX)


class SuspenderSerializer(serializers.Serializer):
    motivo = serializers.CharField(min_length=MOTIVO_MIN, max_length=MOTIVO_MAX)


class RolesUsuarioSerializer(serializers.Serializer):
    roles = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=True)
    motivo = serializers.CharField(min_length=MOTIVO_MIN, max_length=MOTIVO_MAX)


class RolSerializer(serializers.ModelSerializer):
    total_usuarios = serializers.IntegerField(read_only=True)
    total_recursos = serializers.IntegerField(read_only=True)
    recursos = serializers.SerializerMethodField()

    class Meta:
        model = Rol
        fields = (
            "id",
            "nombre",
            "descripcion",
            "activo",
            "es_sistema",
            "total_usuarios",
            "total_recursos",
            "recursos",
        )
        read_only_fields = ("id", "es_sistema")
        extra_kwargs = {"nombre": {"validators": []}}

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_recursos(self, obj) -> list[int]:
        return sorted(v.id_recurso_id for v in obj.vinculos.all())


class RolRecursosSerializer(serializers.Serializer):
    recursos = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=True)
    motivo = serializers.CharField(min_length=MOTIVO_MIN, max_length=MOTIVO_MAX)


class RecursoSerializer(serializers.ModelSerializer):
    total_roles = serializers.IntegerField(read_only=True)

    class Meta:
        model = Recurso
        fields = (
            "id",
            "codigo",
            "nombre",
            "descripcion",
            "ambito",
            "ruta",
            "icono",
            "grupo",
            "orden",
            "es_publico",
            "es_sistema",
            "activo",
            "total_roles",
        )
        read_only_fields = ("id", "es_sistema")

    def validate_ruta(self, valor):
        valor = valor.strip()
        if valor and not valor.startswith("/"):
            raise serializers.ValidationError("La ruta debe estar vacía o empezar con «/».")
        return valor
