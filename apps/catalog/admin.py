"""Admin del catálogo: moderación de puestos, productos y categorías."""

from django.contrib import admin

from apps.catalog.models import Categoria, ImagenProducto, Producto, Puesto, PuestoCategoria


@admin.register(Puesto)
class PuestoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "id_vendedor", "estado", "ofrece_domicilio")
    list_filter = ("estado", "ofrece_domicilio")
    search_fields = ("nombre", "descripcion", "direccion")
    readonly_fields = ("latitud", "longitud")


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ("nombre", "id_categoria_padre", "activa")
    list_filter = ("activa",)
    search_fields = ("nombre",)


@admin.register(PuestoCategoria)
class PuestoCategoriaAdmin(admin.ModelAdmin):
    list_display = ("id", "id_puesto", "id_categoria")


class ImagenProductoInline(admin.TabularInline):
    model = ImagenProducto
    extra = 0


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "id_puesto", "id_categoria", "precio", "stock", "estado")
    list_filter = ("estado", "unidad_medida")
    search_fields = ("nombre", "descripcion")
    inlines = (ImagenProductoInline,)


@admin.register(ImagenProducto)
class ImagenProductoAdmin(admin.ModelAdmin):
    list_display = ("id", "id_producto", "orden")
    search_fields = ("id_producto__nombre",)
