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

    class Meta:
        verbose_name = "puesto"
        verbose_name_plural = "puestos"
        ordering = ["nombre"]
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

    class Meta:
        verbose_name = "producto"
        verbose_name_plural = "productos"
        ordering = ["nombre"]
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
        ]

    def clean(self):
        """Regla 2 a nivel de modelo (se invoca desde `full_clean()`).

        El servicio y los formularios del admin llaman a ``full_clean()``;
        es una defensa extra, no sustituye a ``services.py``.
        """
        super().clean()
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
    # El diseño lo llama `url`; aquí es el archivo subido y la API expone
    # `url` con la ruta pública (ver ADR-002 y el serializer).
    archivo = models.ImageField(
        upload_to="productos/%Y/%m/",
        validators=[validate_image_file],
        help_text="JPEG/PNG/WebP, máximo 2 MB.",
    )
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "imagen de producto"
        verbose_name_plural = "imágenes de producto"
        ordering = ["orden", "id"]

    def delete(self, *args, **kwargs):
        """Borra también el archivo físico (Django no lo hace por defecto)."""
        almacen, nombre = self.archivo.storage, self.archivo.name
        resultado = super().delete(*args, **kwargs)
        with contextlib.suppress(OSError):
            almacen.delete(nombre)
        return resultado

    def __str__(self):
        return f"Imagen {self.orden} de {self.id_producto}"
