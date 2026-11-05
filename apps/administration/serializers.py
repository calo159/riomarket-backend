"""Serializers de la administración de usuarios y moderación."""

from drf_spectacular.utils import OpenApiTypes, extend_schema_field
from rest_framework import serializers

from apps.accounts.models import Usuario
from apps.accounts.serializers import CELULAR_PATRON
from apps.administration import services
from apps.common.motivo import MOTIVO_MAX, MOTIVO_MIN
from apps.rbac.models import Recurso, Rol
from apps.rbac.permissions import recursos_de_request


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
            cache["recursos"] = recursos_de_request(request)
            cache["admins"] = services._admins_activos()
        return services.acciones_permitidas(obj, request.user, cache["recursos"], cache["admins"])


class CrearUsuarioSerializer(serializers.Serializer):
    """Datos para que el administrador cree una cuenta; la contraseña la genera el sistema."""

    nombre = serializers.CharField(max_length=120)
    correo = serializers.EmailField()
    celular = serializers.CharField(max_length=20)
    rol = serializers.ChoiceField(choices=Usuario.Rol.choices)

    def validate_celular(self, value):
        if not CELULAR_PATRON.match(value):
            raise serializers.ValidationError("Usa solo dígitos, espacios, +, (), - o .")
        return value


class CambiarRolSerializer(serializers.Serializer):
    rol = serializers.ChoiceField(choices=Usuario.Rol.values)
    motivo = serializers.CharField(min_length=MOTIVO_MIN, max_length=MOTIVO_MAX)


class SuspenderSerializer(serializers.Serializer):
    motivo = serializers.CharField(min_length=MOTIVO_MIN, max_length=MOTIVO_MAX)


class EditarDatosUsuarioSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=120)
    correo = serializers.EmailField()
    celular = serializers.CharField(max_length=20)
    motivo = serializers.CharField(min_length=MOTIVO_MIN, max_length=MOTIVO_MAX)

    def validate_celular(self, value):
        if not CELULAR_PATRON.match(value):
            raise serializers.ValidationError("Usa solo dígitos, espacios, +, (), - o .")
        return value


class ReiniciarContrasenaSerializer(serializers.Serializer):
    motivo = serializers.CharField(min_length=MOTIVO_MIN, max_length=MOTIVO_MAX)


class UsuarioCreadoSerializer(UsuarioAdminSerializer):
    """La cuenta recién creada, con la contraseña temporal que se muestra una sola vez."""

    password_temporal = serializers.CharField(read_only=True)

    class Meta(UsuarioAdminSerializer.Meta):
        fields = (*UsuarioAdminSerializer.Meta.fields, "password_temporal")


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


class CampoConfiguracionSerializer(serializers.Serializer):
    clave = serializers.CharField()
    etiqueta = serializers.CharField()
    ayuda = serializers.CharField()
    unidad = serializers.ChoiceField(choices=["%", "$"])
    minimo = serializers.DecimalField(max_digits=12, decimal_places=2)
    maximo = serializers.DecimalField(max_digits=12, decimal_places=2)
    valor = serializers.DecimalField(max_digits=12, decimal_places=2)
    del_servidor = serializers.DecimalField(max_digits=12, decimal_places=2)
    origen = serializers.ChoiceField(choices=["panel", "servidor"])


class VendedoresPorEstadoSerializer(serializers.Serializer):
    al_dia = serializers.IntegerField()
    aviso = serializers.IntegerField()
    bloqueado = serializers.IntegerField()


class ConfiguracionSerializer(serializers.Serializer):
    campos = CampoConfiguracionSerializer(many=True)
    vendedores = VendedoresPorEstadoSerializer()
    actualizado = serializers.DateTimeField(allow_null=True)


class ValoresConfiguracionSerializer(serializers.Serializer):
    """Solo los campos presentes se cambian; ``null`` borra el valor del panel."""

    comision_porcentaje = serializers.DecimalField(
        max_digits=7, decimal_places=2, required=False, allow_null=True
    )
    tarifa_domicilio = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, allow_null=True
    )
    limite_aviso = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, allow_null=True
    )
    limite_bloqueo = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, allow_null=True
    )


class ActualizarConfiguracionSerializer(serializers.Serializer):
    valores = ValoresConfiguracionSerializer()
    motivo = serializers.CharField(min_length=MOTIVO_MIN, max_length=MOTIVO_MAX)
