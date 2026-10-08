"""Modelos del módulo "Usuarios y confianza".

Nota sobre el modelo lógico: ``password_hash`` del diseño se implementa con
el campo ``password`` de ``AbstractBaseUser`` (Django guarda ahí el hash
PBKDF2, nunca texto plano). Renombrarlo romería ``check_password``,
``set_password`` y el admin de Django; se documenta como equivalente.
"""

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

from apps.common.storage import PrivateMediaStorage
from apps.common.validators import validate_image_file


class UsuarioManager(BaseUserManager["Usuario"]):
    """Manager que normaliza el correo y nunca guarda contraseñas en claro."""

    use_in_migrations = True

    def _create_user(self, correo, password, **extra_fields):
        if not correo:
            raise ValueError("El correo es obligatorio.")
        correo = Usuario.normalizar_correo(self.normalize_email(correo))
        if "celular" in extra_fields:
            extra_fields["celular"] = Usuario.normalizar_celular(extra_fields["celular"])
        user = self.model(correo=correo, **extra_fields)
        user.set_password(password)  # hash PBKDF2
        user.save(using=self._db)
        return user

    def create_user(self, correo, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("rol", Usuario.Rol.COMPRADOR)
        return self._create_user(correo, password, **extra_fields)

    def create_superuser(self, correo, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("rol", Usuario.Rol.ADMINISTRADOR)
        extra_fields.setdefault("estado", Usuario.Estado.ACTIVO)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("El superusuario debe tener is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("El superusuario debe tener is_superuser=True.")
        return self._create_user(correo, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    class Rol(models.TextChoices):
        COMPRADOR = "comprador", "Comprador"
        VENDEDOR = "vendedor", "Vendedor"
        ADMINISTRADOR = "administrador", "Administrador"

    class Estado(models.TextChoices):
        ACTIVO = "activo", "Activo"
        SUSPENDIDO = "suspendido", "Suspendido"

    nombre = models.CharField(max_length=120)
    correo = models.EmailField("correo", unique=True, db_index=True)
    celular = models.CharField(max_length=20, unique=True, db_index=True)
    rol = models.CharField(max_length=15, choices=Rol.choices, default=Rol.COMPRADOR)
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.ACTIVO)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    objects = UsuarioManager()

    USERNAME_FIELD = "correo"
    REQUIRED_FIELDS = ["nombre", "celular"]

    class Meta:
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"
        ordering = ["-fecha_registro"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(rol__in=["comprador", "vendedor", "administrador"]),
                name="usuario_rol_valido",
            ),
            models.CheckConstraint(
                condition=models.Q(estado__in=["activo", "suspendido"]),
                name="usuario_estado_valido",
            ),
        ]

    def __str__(self):
        return f"{self.nombre} <{self.correo}>"

    # ------------------------------------------------------------------
    # Normalización: sin esto, "  Pepe@Mail.COM " y "pepe@mail.com" son dos
    # cuentas distintas, igual que "+57 300 123 4567" y "3001234567".
    # Se normaliza SIEMPRE en save() (todo código que guarde un Usuario pasa
    # por aquí), no solo en el manager.
    # ------------------------------------------------------------------
    @staticmethod
    def normalizar_correo(correo: str) -> str:
        return (correo or "").strip().lower()

    @staticmethod
    def normalizar_celular(celular: str) -> str:
        """Solo dígitos, sin código de país: ``+57 300 123 4567`` → ``3001234567``."""
        digitos = "".join(ch for ch in str(celular or "") if ch.isdigit())
        if len(digitos) == 12 and digitos.startswith("57"):
            digitos = digitos[2:]
        elif len(digitos) == 14 and digitos.startswith("0057"):
            digitos = digitos[4:]
        return digitos

    def save(self, *args, **kwargs):
        self.correo = self.normalizar_correo(self.correo)
        self.celular = self.normalizar_celular(self.celular)
        super().save(*args, **kwargs)

    @property
    def is_active(self):
        """SimpleJWT exige ``is_active``; lo ligamos al estado del negocio."""
        return self.estado == self.Estado.ACTIVO

    @is_active.setter
    def is_active(self, value):
        self.estado = self.Estado.ACTIVO if value else self.Estado.SUSPENDIDO

    @property
    def es_vendedor(self) -> bool:
        return self.rol == self.Rol.VENDEDOR

    @property
    def es_administrador(self) -> bool:
        return self.rol == self.Rol.ADMINISTRADOR

    def suspendir(self):
        self.estado = self.Estado.SUSPENDIDO
        self.save(update_fields=["estado"])

    def puede_publicar(self) -> bool:
        """Regla 1: ¿puede crear/editar su Puesto?

        Requiere cuenta activa + rol vendedor + verificación aprobada cuando
        la solicitud existe.

        Incremento 2: al registrarse como vendedor se crea la fila ``Vendedor``
        con estado ``pendiente``, así que publicar exige que un administrador
        la haya aprobado. La rama "sin solicitud" queda reservada para cuentas
        legadas creadas antes de este incremento.
        """
        if not self.is_active or not self.es_vendedor:
            return False
        vendedor = getattr(self, "vendedor", None)
        if vendedor is None:
            return True
        return vendedor.estado_verificacion == vendedor.EstadoVerificacion.APROBADO


class Vendedor(models.Model):
    """Solicitud de verificación de identidad de un vendedor (regla 6 y ADR-002).

    - ``numero_cedula``: número de cédula CIFRADO (Fernet) en reposo.
    - ``cedula_huella``: HMAC-SHA256 determinístico con ``unique=True`` para
      detectar duplicados sin descifrar (regla 6: la cédula no se repite).
    - ``foto_cedula``: imagen del documento en ``PRIVATE_MEDIA_ROOT``, jamás
      pública; se entrega por vista protegida solo a administradores.
    """

    class EstadoVerificacion(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        APROBADO = "aprobado", "Aprobado"
        RECHAZADO = "rechazado", "Rechazado"

    id_usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        related_name="vendedor",
        verbose_name="vendedor",
    )
    numero_cedula = models.BinaryField(
        "número de cédula",
        max_length=512,
        null=True,
        blank=True,
        help_text="Cifrado con Fernet; nunca se guarda en claro.",
    )
    cedula_huella = models.CharField(
        "huella de cédula",
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        help_text="HMAC-SHA256 para unicidad sin descifrar (regla 6).",
    )
    foto_cedula = models.FileField(
        "foto de cédula",
        upload_to="cedulas/",
        storage=PrivateMediaStorage(),
        validators=[validate_image_file],
        null=True,
        blank=True,
    )
    estado_verificacion = models.CharField(
        "estado de verificación",
        max_length=15,
        choices=EstadoVerificacion.choices,
        default=EstadoVerificacion.PENDIENTE,
    )
    id_revisor = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        related_name="solicitudes_revisadas",
        null=True,
        blank=True,
        verbose_name="revisor",
    )
    motivo_rechazo = models.TextField(blank=True, default="")
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_revision = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "verificación de vendedor"
        verbose_name_plural = "verificaciones de vendedor"
        ordering = ["fecha_solicitud"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(estado_verificacion__in=["pendiente", "aprobado", "rechazado"]),
                name="vendedor_estado_verificacion_valido",
            ),
        ]

    def __str__(self):
        return f"Verificación de {self.id_usuario_id} ({self.estado_verificacion})"

    @property
    def aprobado(self) -> bool:
        return self.estado_verificacion == self.EstadoVerificacion.APROBADO
