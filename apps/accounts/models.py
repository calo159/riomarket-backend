"""Modelos del módulo "Usuarios y confianza".

Nota sobre el modelo lógico: ``password_hash`` del diseño se implementa con
el campo ``password`` de ``AbstractBaseUser`` (Django guarda ahí el hash
PBKDF2, nunca texto plano). Renombrarlo romería ``check_password``,
``set_password`` y el admin de Django; se documenta como equivalente.
"""

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


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

        Requiere cuenta activa + rol vendedor + (cuando exista) verificación
        aprobada.

        FASE ACTUAL (Incremento 1): aún no existe el modelo ``Vendedor``;
        "aprobado" equivale a cuenta activa. En el Incremento 2 el registro
        como vendedor creará esa fila con estado ``pendiente``, por lo que
        esta rama "sin solicitud" quedará reservada para cuentas legadas.
        """
        if not self.is_active or not self.es_vendedor:
            return False
        vendedor = getattr(self, "vendedor", None)
        if vendedor is None:
            return True
        return vendedor.estado_verificacion == vendedor.EstadoVerificacion.APROBADO
