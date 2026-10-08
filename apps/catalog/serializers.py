"""Serializers del catálogo.

Solo validan forma/duplicados y delegan las reglas de negocio a
``apps.catalog.services`` (reglas 1, 2, 3 y 7).
"""

from rest_framework import serializers

from apps.catalog import services
from apps.catalog.models import Categoria, ImagenProducto, Producto, Puesto
from apps.common.validators import validate_image_file


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ("id", "nombre", "id_categoria_padre", "activa")
        read_only_fields = ("id",)


class PuestoSerializer(serializers.ModelSerializer):
    """Puesto público/vendedor.

    ``id_vendedor`` lo fija el servidor (el dueño es quien llama) y
    ``estado`` solo lo cambia un administrador (moderación, Inc 4).
    """

    categorias = serializers.SerializerMethodField()

    class Meta:
        model = Puesto
        fields = (
            "id",
            "id_vendedor",
            "nombre",
            "descripcion",
            "direccion",
            "latitud",
            "longitud",
            "horario",
            "ofrece_domicilio",
            "estado",
            "categorias",
        )
        read_only_fields = ("id", "id_vendedor", "estado")

    def get_categorias(self, obj) -> list[dict]:
        return CategoriaSerializer(
            [v.id_categoria for v in obj.categorias_asignadas.all()],
            many=True,
        ).data

    def create(self, validated_data):
        return services.crear_puesto(usuario=self.context["request"].user, datos=validated_data)

    def update(self, instance, validated_data):
        return services.actualizar_puesto(
            puesto=instance, usuario=self.context["request"].user, datos=validated_data
        )


class ImagenProductoSerializer(serializers.ModelSerializer):
    """La API expone ``url`` (ruta pública del archivo subido): el diseño
    llama ``url`` a este atributo, en BD es el campo ``archivo`` (ADR-002)."""

    url = serializers.SerializerMethodField()
    archivo = serializers.ImageField(
        write_only=True, validators=[validate_image_file], required=True
    )

    class Meta:
        model = ImagenProducto
        fields = ("id", "id_producto", "url", "orden", "archivo")
        read_only_fields = ("id", "orden")

    def get_url(self, obj) -> str | None:
        if not obj.archivo:
            return None
        return obj.archivo.url

    def create(self, validated_data):
        producto = validated_data.pop("id_producto")
        archivo = validated_data.pop("archivo")
        return services.agregar_imagen(producto=producto, archivo=archivo)


class ProductoSerializer(serializers.ModelSerializer):
    imagenes = ImagenProductoSerializer(many=True, read_only=True)

    class Meta:
        model = Producto
        fields = (
            "id",
            "id_puesto",
            "id_categoria",
            "nombre",
            "descripcion",
            "precio",
            "stock",
            "unidad_medida",
            "estado",
            "imagenes",
        )
        read_only_fields = ("id",)

    def create(self, validated_data):
        datos = dict(validated_data)
        puesto = datos.pop("id_puesto")
        categoria = datos.pop("id_categoria")
        return services.crear_producto(
            puesto=puesto,
            categoria=categoria,
            usuario=self.context["request"].user,
            datos=datos,
        )

    def update(self, instance, validated_data):
        return services.actualizar_producto(
            producto=instance,
            usuario=self.context["request"].user,
            datos=validated_data,
        )
