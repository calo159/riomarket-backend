"""API del módulo de administración: usuarios, roles, recursos y resumen.

Cada vista exige su recurso RBAC (``TieneRecurso``); las reglas finas viven en
``services`` y ``rbac_services``.
"""

from django.db.models import Count, Q
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.administration import rbac_services, services
from apps.administration.serializers import (
    CambiarRolSerializer,
    RecursoSerializer,
    RolesUsuarioSerializer,
    RolRecursosSerializer,
    RolSerializer,
    SuspenderSerializer,
    UsuarioAdminSerializer,
)
from apps.common.query import aplicar_ordenamiento, parametro_booleano
from apps.rbac.models import Recurso
from apps.rbac.permissions import TieneRecurso

PARAMETROS_USUARIO = [
    OpenApiParameter(name="rol", enum=["comprador", "vendedor", "administrador"]),
    OpenApiParameter(name="estado", enum=["activo", "suspendido"]),
    OpenApiParameter(name="rol_asignado", type=OpenApiTypes.INT, description="Id de un rol"),
    OpenApiParameter(name="q", type=OpenApiTypes.STR, description="Nombre, correo o celular"),
    OpenApiParameter(name="ordering", enum=list(services.ORDENAMIENTO_USUARIO)),
]

ORDENAMIENTO_ROL = ("nombre", "-nombre", "id", "-id")
ORDENAMIENTO_RECURSO = ("codigo", "-codigo", "nombre", "-nombre", "orden", "-orden", "id", "-id")


class UsuarioAdminViewSet(viewsets.ReadOnlyModelViewSet):
    """Cuentas del marketplace con sus métricas y acciones de administración."""

    serializer_class = UsuarioAdminSerializer
    http_method_names = ["get", "post", "put", "head", "options"]

    def get_permissions(self):
        permisos = [TieneRecurso("admin.usuarios")()]
        if self.action in ("cambiar_rol", "roles"):
            permisos.append(TieneRecurso("admin.roles")())
        return permisos

    @extend_schema(parameters=PARAMETROS_USUARIO)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        params = self.request.query_params
        qs = services.filtrar_usuarios(services.usuarios_con_metricas(), params)
        return aplicar_ordenamiento(qs, params.get("ordering"), services.ORDENAMIENTO_USUARIO)

    def _serializar(self, usuario):
        usuario = self.get_queryset().get(pk=usuario.pk)
        return self.get_serializer(usuario).data

    @extend_schema(
        request=CambiarRolSerializer,
        responses={200: UsuarioAdminSerializer},
        description="Cambia el rol base de una cuenta (no el propio, no el último admin).",
    )
    @action(detail=True, methods=["post"], url_path="cambiar-rol")
    def cambiar_rol(self, request, pk=None):
        serializer = CambiarRolSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = services.cambiar_rol(
            usuario=self.get_object(),
            actor=request.user,
            nuevo_rol=serializer.validated_data["rol"],
            motivo=serializer.validated_data["motivo"],
        )
        return Response(self._serializar(usuario))

    @extend_schema(
        request=RolesUsuarioSerializer,
        responses={200: UsuarioAdminSerializer},
        description="Reemplaza los roles adicionales (personalizados) de la cuenta.",
    )
    @action(detail=True, methods=["put"])
    def roles(self, request, pk=None):
        serializer = RolesUsuarioSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = services.asignar_roles_adicionales(
            usuario=self.get_object(),
            actor=request.user,
            roles_ids=serializer.validated_data["roles"],
            motivo=serializer.validated_data["motivo"],
        )
        return Response(self._serializar(usuario))

    @extend_schema(
        request=SuspenderSerializer,
        responses={200: UsuarioAdminSerializer},
        description="Banea (suspende) una cuenta, sus puestos activos y sus sesiones.",
    )
    @action(detail=True, methods=["post"])
    def suspender(self, request, pk=None):
        serializer = SuspenderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = services.suspender(
            usuario=self.get_object(),
            actor=request.user,
            **serializer.validated_data,
        )
        return Response(self._serializar(usuario))

    @extend_schema(
        request=None,
        responses={200: UsuarioAdminSerializer},
        description="Reactiva una cuenta suspendida (los puestos se reactivan aparte).",
    )
    @action(detail=True, methods=["post"])
    def reactivar(self, request, pk=None):
        usuario = services.reactivar(usuario=self.get_object(), actor=request.user)
        return Response(self._serializar(usuario))


class RolAdminViewSet(viewsets.ModelViewSet):
    """Roles: nombre, estado y los recursos que otorgan."""

    serializer_class = RolSerializer
    permission_classes = [TieneRecurso("admin.roles")]
    http_method_names = ["get", "post", "patch", "put", "delete", "head", "options"]

    def get_queryset(self):
        qs = rbac_services.roles_con_conteos()
        consulta = (self.request.query_params.get("q") or "").strip()
        if consulta:
            qs = qs.filter(nombre__icontains=consulta)
        qs = qs.order_by("-es_sistema", "nombre")
        return aplicar_ordenamiento(qs, self.request.query_params.get("ordering"), ORDENAMIENTO_ROL)

    def _responder(self, rol, codigo=status.HTTP_200_OK):
        return Response(self.get_serializer(self.get_queryset().get(pk=rol.pk)).data, codigo)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rol = rbac_services.crear_rol(actor=request.user, **serializer.validated_data)
        return self._responder(rol, status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        rol = self.get_object()
        serializer = self.get_serializer(rol, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        rbac_services.actualizar_rol(rol=rol, actor=request.user, datos=serializer.validated_data)
        return self._responder(rol)

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        rbac_services.eliminar_rol(rol=self.get_object(), actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        request=RolRecursosSerializer,
        responses={200: RolSerializer},
        description="Reemplaza los recursos del rol (el rol administrador conserva los básicos).",
    )
    @action(detail=True, methods=["put"])
    def recursos(self, request, pk=None):
        serializer = RolRecursosSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rol = rbac_services.fijar_recursos_de_rol(
            rol=self.get_object(),
            actor=request.user,
            recursos_ids=serializer.validated_data["recursos"],
            motivo=serializer.validated_data["motivo"],
        )
        return self._responder(rol)


class RecursoAdminViewSet(viewsets.ModelViewSet):
    """Recursos: módulos o pantallas que los roles pueden abrir."""

    serializer_class = RecursoSerializer
    permission_classes = [TieneRecurso("admin.recursos")]
    http_method_names = ["get", "post", "patch", "put", "delete", "head", "options"]

    @extend_schema(
        parameters=[
            OpenApiParameter(name="ambito", enum=Recurso.Ambito.values),
            OpenApiParameter(name="activo", type=OpenApiTypes.BOOL),
            OpenApiParameter(name="q", type=OpenApiTypes.STR, description="Código o nombre"),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        params = self.request.query_params
        qs = Recurso.objects.annotate(total_roles=Count("vinculos", distinct=True))
        ambito = params.get("ambito")
        if ambito:
            qs = qs.filter(ambito=ambito)
        activo = parametro_booleano(params, "activo")
        if activo is not None:
            qs = qs.filter(activo=activo)
        consulta = (params.get("q") or "").strip()
        if consulta:
            qs = qs.filter(Q(codigo__icontains=consulta) | Q(nombre__icontains=consulta))
        qs = qs.order_by("ambito", "grupo", "orden", "id")
        return aplicar_ordenamiento(qs, params.get("ordering"), ORDENAMIENTO_RECURSO)

    def _responder(self, recurso, codigo=status.HTTP_200_OK):
        return Response(self.get_serializer(self.get_queryset().get(pk=recurso.pk)).data, codigo)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        recurso = rbac_services.crear_recurso(
            actor=request.user, datos=dict(serializer.validated_data)
        )
        return self._responder(recurso, status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        recurso = self.get_object()
        serializer = self.get_serializer(recurso, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        rbac_services.actualizar_recurso(
            recurso=recurso, actor=request.user, datos=dict(serializer.validated_data)
        )
        return self._responder(recurso)

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def destroy(self, request, *args, **kwargs):
        afectados = rbac_services.eliminar_recurso(recurso=self.get_object(), actor=request.user)
        return Response({"roles_afectados": afectados})


class ResumenAdminView(APIView):
    """Métricas globales del marketplace para el panel de administración."""

    permission_classes = [TieneRecurso("admin.resumen")]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        return Response(services.resumen(), status=status.HTTP_200_OK)
