"""Modelo RBAC del diagrama del profesor.

    usuario -- usuario_has_rol -- rol -- rol_has_recurso -- recurso

``Usuario.rol`` se conserva como *rol base* (la lógica de negocio depende de
él) y se refleja como un ``Rol`` de sistema en ``usuario_has_rol``; los roles
personalizados se suman encima. Los permisos efectivos se calculan en
``apps.rbac.acceso``.
"""

from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.db.models.functions import Lower

validar_codigo = RegexValidator(
    r"^[a-z][a-z0-9_.]{2,59}$",
    "El código usa minúsculas, números, punto o guion bajo (3 a 60 caracteres).",
)


class Recurso(models.Model):
    """Módulo o pantalla del sistema que un rol puede abrir."""

    class Ambito(models.TextChoices):
        PUBLICO = "publico", "Público"
        CUENTA = "cuenta", "Cuenta"
        PANEL_VENDEDOR = "panel_vendedor", "Panel de vendedor"
        PANEL_ADMIN = "panel_admin", "Panel de administración"

    codigo = models.CharField(max_length=60, unique=True, validators=[validar_codigo])
    nombre = models.CharField(max_length=80)
    descripcion = models.CharField(max_length=200, blank=True, default="")
    ambito = models.CharField(max_length=20, choices=Ambito.choices, default=Ambito.CUENTA)
    ruta = models.CharField(max_length=120, blank=True, default="")
    icono = models.CharField(max_length=40, blank=True, default="")
    grupo = models.CharField(max_length=40, blank=True, default="")
    orden = models.PositiveIntegerField(default=0)
    es_publico = models.BooleanField(default=False)
    es_sistema = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "recurso"
        ordering = ["ambito", "grupo", "orden", "id"]

    def __str__(self):
        return self.codigo


class Rol(models.Model):
    """Conjunto de recursos que se asigna a usuarios."""

    nombre = models.CharField(max_length=40)
    descripcion = models.CharField(max_length=200, blank=True, default="")
    activo = models.BooleanField(default=True)
    es_sistema = models.BooleanField(default=False)
    recursos = models.ManyToManyField(Recurso, through="RolRecurso", related_name="roles")

    class Meta:
        db_table = "rol"
        ordering = ["-es_sistema", "nombre"]
        constraints = [models.UniqueConstraint(Lower("nombre"), name="rol_nombre_unico_ci")]

    def __str__(self):
        return self.nombre


class RolRecurso(models.Model):
    id_rol = models.ForeignKey(Rol, on_delete=models.CASCADE, related_name="vinculos")
    id_recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, related_name="vinculos")

    class Meta:
        db_table = "rol_has_recurso"
        constraints = [
            models.UniqueConstraint(fields=["id_rol", "id_recurso"], name="rol_recurso_unico")
        ]

    def __str__(self):
        return f"{self.id_rol_id} -> {self.id_recurso_id}"


class UsuarioRol(models.Model):
    id_usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="asignaciones_rol"
    )
    id_rol = models.ForeignKey(Rol, on_delete=models.CASCADE, related_name="asignaciones")

    class Meta:
        db_table = "usuario_has_rol"
        constraints = [
            models.UniqueConstraint(fields=["id_usuario", "id_rol"], name="usuario_rol_unico")
        ]

    def __str__(self):
        return f"{self.id_usuario_id} -> {self.id_rol_id}"
