"""Modelos del módulo Catálogo (puestos, categorías, productos, imágenes).

Decisiones:
- Los FK se llaman como en el diseño (`id_vendedor`, `id_puesto`, ...):
  Django devuelve la instancia al acceder (`puesto.id_vendedor`) y la columna
  en BD termina siendo `id_vendedor_id`.
- La "PK compuesta" de PuestoCategoria se modela con `UniqueConstraint`
  (Django no soporta PK compuestas); la unicidad garantizada es idéntica y
  ninguna tabla referencia la puente.
- La regla 2 (producto solo en categoría ya asignada al puesto) NO puede
  expresarse como CHECK en PostgreSQL (CHECK no admite subqueries): se
  garantiza en `services.crear_producto` + `Producto.clean()`.
"""

import contextlib
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.common.validators import validate_image_file


class Puesto(models.Model):
    class Estado(models.TextChoices):
        ACTIVO = "activo", "Activo"
        INACTIVO = "inactivo", "Inactivo"
        SUSPENDIDO = "suspendido", "Suspendido"

    id_vendedor = models.ForeignKey(
        "accounts.Usuario",
        on_delete=models.CASCADE,
        related_name="puestos",
    )
    nombre = models.CharField(max_length=120)
    descripcion = models.TextField(blank=True)
    direccion = models.CharField(max_length=200)
    latitud = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("-90")), MaxValueValidator(Decimal("90"))],
    )
    longitud = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("-180")), MaxValueValidator(Decimal("180"))],
    )
    horario = models.CharField(max_length=120, blank=True)
    ofrece_domicilio = models.BooleanField(default=False)
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.ACTIVO)
    logo = models.ImageField(upload_to="puestos/logos/%Y/%m/", blank=True, null=True)
    portada = models.ImageField(upload_to="puestos/portadas/%Y/%m/", blank=True, null=True)
    # Privacidad: el celular del vendedor solo se publica si él lo activa (por defecto, no).
    acepta_whatsapp = models.BooleanField(
        default=False,
        help_text="Si está activo, el celular del vendedor se muestra a los compradores.",
    )
    # Apartar con plazo (ADR-012): horas que tiene el cliente para recoger un pedido listo.
    plazo_retiro_horas = models.PositiveSmallIntegerField(
        default=24,
        validators=[MinValueValidator(2), MaxValueValidator(72)],
        help_text="Horas que tiene el cliente para recoger un pedido listo (entre 2 y 72).",
    )

    class Meta:
        verbose_name = "puesto"
        verbose_name_plural = "puestos"
        ordering = ["nombre"]
        # El listado público filtra por estado y ordena por nombre.
        indexes = [models.Index(fields=["estado", "nombre"], name="puesto_estado_nombre_idx")]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(estado__in=["activo", "inactivo", "suspendido"]),
                name="puesto_estado_valido",
            ),
            # Regla 3: domicilio solo si hay coordenadas
            models.CheckConstraint(
                condition=models.Q(ofrece_domicilio=False)
                | models.Q(latitud__isnull=False, longitud__isnull=False),
                name="puesto_domicilio_requiere_coordenadas",
            ),
            models.CheckConstraint(
                condition=models.Q(plazo_retiro_horas__gte=2, plazo_retiro_horas__lte=72),
                name="puesto_plazo_retiro_valido",
            ),
        ]

    def __str__(self):
        return self.nombre


class Categoria(models.Model):
    nombre = models.CharField(max_length=80, unique=True)
    id_categoria_padre = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,  # no se borra una categoría que tenga hijas
        related_name="subcategorias",
        null=True,
        blank=True,
    )
    activa = models.BooleanField(default=True)
    icono = models.CharField(
        max_length=40, blank=True, default="", help_text="Clave de ícono lucide-react"
    )
    color = models.CharField(max_length=20, blank=True, default="")

    class Meta:
        verbose_name = "categoría"
        verbose_name_plural = "categorías"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class PuestoCategoria(models.Model):
    """Tabla puente N:M entre Puesto y Categoria (unicidad = PK compuesta)."""

    id_puesto = models.ForeignKey(
        Puesto, on_delete=models.CASCADE, related_name="categorias_asignadas"
    )
    id_categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name="puestos")

    class Meta:
        verbose_name = "puesto-categoría"
        verbose_name_plural = "puestos-categorías"
        ordering = ["id_puesto", "id_categoria"]
        constraints = [
            models.UniqueConstraint(
                fields=["id_puesto", "id_categoria"],
                name="puesto_categoria_unica",
            ),
        ]

    def __str__(self):
        return f"{self.id_puesto} · {self.id_categoria}"


class Producto(models.Model):
    class UnidadMedida(models.TextChoices):
        KG = "kg", "Kilogramo"
        LIBRA = "libra", "Libra"
        UNIDAD = "unidad", "Unidad"
        DOCENA = "docena", "Docena"
        LITRO = "litro", "Litro"
        PORCION = "porcion", "Porción"

    class Estado(models.TextChoices):
        ACTIVO = "activo", "Activo"
        INACTIVO = "inactivo", "Inactivo"
        BLOQUEADO = "bloqueado", "Bloqueado"

    class Modalidad(models.TextChoices):
        """Cómo se vende: con existencias o se hace por pedido (ADR-013)."""

        STOCK = "stock", "Con stock"
        ENCARGO = "encargo", "Por encargo"

    id_puesto = models.ForeignKey(Puesto, on_delete=models.CASCADE, related_name="productos")
    id_categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name="productos")
    nombre = models.CharField(max_length=120)
    descripcion = models.TextField(blank=True)
    precio = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    stock = models.IntegerField(validators=[MinValueValidator(0)], default=0)
    unidad_medida = models.CharField(
        max_length=15, choices=UnidadMedida.choices, default=UnidadMedida.UNIDAD
    )
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.ACTIVO)
    modalidad = models.CharField(max_length=10, choices=Modalidad.choices, default=Modalidad.STOCK)
    preparacion_horas = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Solo por encargo: horas que necesita el puesto para prepararlo (1 a 336).",
    )
    pide_detalles = models.BooleanField(
        default=False, help_text="Solo por encargo: el comprador escribe sabor, mensaje, etc."
    )
    etiqueta_detalles = models.CharField(
        max_length=80,
        blank=True,
        default="",
        help_text="Qué se le pregunta al comprador, por ejemplo «Sabor y mensaje».",
    )

    class Meta:
        verbose_name = "producto"
        verbose_name_plural = "productos"
        ordering = ["nombre"]
        indexes = [models.Index(fields=["estado", "nombre"], name="producto_estado_nombre_idx")]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(precio__gte=Decimal("0")),
                name="producto_precio_no_negativo",
            ),
            models.CheckConstraint(
                condition=models.Q(stock__gte=0),
                name="producto_stock_no_negativo",
            ),
            models.CheckConstraint(
                condition=models.Q(estado__in=["activo", "inactivo", "bloqueado"]),
                name="producto_estado_valido",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    unidad_medida__in=[
                        "kg",
                        "libra",
                        "unidad",
                        "docena",
                        "litro",
                        "porcion",
                    ]
                ),
                name="producto_unidad_valida",
            ),
            models.CheckConstraint(
                condition=models.Q(modalidad__in=["stock", "encargo"]),
                name="producto_modalidad_valida",
            ),
            models.CheckConstraint(
                # ``isnull=False`` es necesario: en SQL un CHECK con NULL no falla (queda
                # «desconocido»), y sin eso un encargo sin preparación pasaría.
                condition=models.Q(modalidad="stock")
                | models.Q(
                    preparacion_horas__isnull=False,
                    preparacion_horas__gte=1,
                    preparacion_horas__lte=336,
                ),
                name="producto_encargo_requiere_preparacion",
            ),
        ]

    def clean(self):
        """Regla 2 a nivel de modelo (se invoca desde `full_clean()`).

        El servicio y los formularios del admin llaman a ``full_clean()``;
        es una defensa extra, no sustituye a ``services.py``.
        """
        super().clean()
        if self.modalidad == self.Modalidad.ENCARGO and not (
            self.preparacion_horas and 1 <= self.preparacion_horas <= 336
        ):
            raise ValidationError(
                {
                    "preparacion_horas": (
                        "Indica cuántas horas necesitas para prepararlo (de 1 a 336)."
                    )
                }
            )
        if self.id_puesto_id and self.id_categoria_id:
            existe = PuestoCategoria.objects.filter(
                id_puesto_id=self.id_puesto_id, id_categoria_id=self.id_categoria_id
            ).exists()
            if not existe:
                raise ValidationError(
                    {
                        "id_categoria": (
                            "La categoría no está asignada al puesto. "
                            "Asígnala primero (regla de negocio 2)."
                        )
                    }
                )

    def __str__(self):
        return f"{self.nombre} ({self.id_puesto})"


class ImagenProducto(models.Model):
    id_producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name="imagenes")
    archivo = models.ImageField(
        upload_to="productos/%Y/%m/",
        validators=[validate_image_file],
        help_text="JPEG/PNG/WebP, máximo 2 MB.",
    )
    miniatura = models.ImageField(upload_to="productos/mini/%Y/%m/", blank=True, null=True)
    orden = models.PositiveIntegerField(default=0)
    alt = models.CharField(max_length=160, blank=True, default="")
    es_principal = models.BooleanField(default=False)
    ancho = models.PositiveIntegerField(null=True, blank=True)
    alto = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        verbose_name = "imagen de producto"
        verbose_name_plural = "imágenes de producto"
        ordering = ["orden", "id"]

    def delete(self, *args, **kwargs):
        almacen, nombre = self.archivo.storage, self.archivo.name
        resultado = super().delete(*args, **kwargs)
        with contextlib.suppress(OSError):
            almacen.delete(nombre)
        mini_nombre = getattr(self.miniatura, "name", "")
        if mini_nombre:
            with contextlib.suppress(OSError):
                almacen.delete(mini_nombre)
        return resultado

    def __str__(self):
        return f"Imagen {self.orden} de {self.id_producto}"
