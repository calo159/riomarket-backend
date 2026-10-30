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

    def validate_id_categoria_padre(self, padre):
        """Una categoría no puede ser su propio ancestro (evita ciclos en el árbol)."""
        actual = self.instance
        if padre is not None and actual is not None:
            nodo = padre
            while nodo is not None:
                if nodo.pk == actual.pk:
                    raise serializers.ValidationError(
                        "La categoría padre no puede ser ella misma ni una de sus subcategorías."
                    )
                nodo = nodo.id_categoria_padre
        return padre


class ModerarSerializer(serializers.Serializer):
    estado = serializers.CharField()
    motivo = serializers.CharField(required=False, allow_blank=True, max_length=300)


class ModerarPuestoSerializer(ModerarSerializer):
    estado = serializers.ChoiceField(choices=Puesto.Estado.values)


class ModerarProductoSerializer(ModerarSerializer):
    estado = serializers.ChoiceField(choices=Producto.Estado.values)


class PuestoSerializer(serializers.ModelSerializer):
    """Puesto público/vendedor.

    ``id_vendedor`` lo fija el servidor (el dueño es quien llama) y
    ``estado`` solo lo cambia un administrador (moderación, Inc 4).
    """

    categorias = serializers.SerializerMethodField()
    logo = serializers.SerializerMethodField()
    portada = serializers.SerializerMethodField()
    calificacion_promedio = serializers.FloatField(read_only=True, default=None, allow_null=True)
    cantidad_resenas = serializers.IntegerField(read_only=True, default=0)
    whatsapp = serializers.SerializerMethodField()

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
            "acepta_whatsapp",
            "whatsapp",
            "estado",
            "calificacion_promedio",
            "cantidad_resenas",
            "categorias",
            "logo",
            "portada",
        )
        read_only_fields = ("id", "id_vendedor", "estado")

    def get_whatsapp(self, obj) -> str | None:
        """Número para WhatsApp (``57`` + celular), o ``None`` si no debe publicarse."""
        return services.numero_whatsapp_publico(obj)

    def get_categorias(self, obj) -> list[dict]:
        return CategoriaSerializer(
            [v.id_categoria for v in obj.categorias_asignadas.all()],
            many=True,
        ).data

    def _url_imagen(self, obj, campo: str) -> str | None:
        archivo = getattr(obj, campo, None)
        if not archivo:
            return None
        try:
            return archivo.url
        except Exception:
            return None

    def get_logo(self, obj) -> str | None:
        return self._url_imagen(obj, "logo")

    def get_portada(self, obj) -> str | None:
        return self._url_imagen(obj, "portada")

    def create(self, validated_data):
        return services.crear_puesto(usuario=self.context["request"].user, datos=validated_data)

    def update(self, instance, validated_data):
        return services.actualizar_puesto(
            puesto=instance, usuario=self.context["request"].user, datos=validated_data
        )


class ImagenProductoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    miniatura = serializers.SerializerMethodField()
    archivo = serializers.ImageField(
        write_only=True, validators=[validate_image_file], required=False
    )

    class Meta:
        model = ImagenProducto
        fields = (
            "id",
            "id_producto",
            "url",
            "miniatura",
            "orden",
            "archivo",
            "alt",
            "es_principal",
            "ancho",
            "alto",
        )
        read_only_fields = ("id", "url", "miniatura", "ancho", "alto")

    def get_url(self, obj) -> str | None:
        if not obj.archivo:
            return None
        try:
            return obj.archivo.url
        except Exception:
            return None

    def get_miniatura(self, obj) -> str | None:
        if obj.miniatura:
            try:
                return obj.miniatura.url
            except Exception:
                pass
        if obj.archivo:
            try:
                return obj.archivo.url
            except Exception:
                return None
        return None

    def create(self, validated_data):
        producto = validated_data.pop("id_producto")
        archivo = validated_data.pop("archivo", None)
        alt = validated_data.pop("alt", "")
        if not archivo:
            raise serializers.ValidationError({"archivo": "Este campo es obligatorio."})
        return services.agregar_imagen(producto=producto, archivo=archivo, alt=alt)


class ProductoSerializer(serializers.ModelSerializer):
    imagenes = ImagenProductoSerializer(many=True, read_only=True)
    # Datos del puesto para las tarjetas del listado (solo lectura, sin consultas extra:
    # el puesto ya viene con select_related y la calificación se anota en la vista).
    puesto_nombre = serializers.CharField(source="id_puesto.nombre", read_only=True)
    puesto_ofrece_domicilio = serializers.BooleanField(
        source="id_puesto.ofrece_domicilio", read_only=True
    )
    puesto_calificacion = serializers.FloatField(read_only=True, default=None, allow_null=True)

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
            "puesto_nombre",
            "puesto_ofrece_domicilio",
            "puesto_calificacion",
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
