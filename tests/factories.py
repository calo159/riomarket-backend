"""Factories (factory_boy) compartidas por toda la suite."""

from decimal import Decimal

import factory

from apps.accounts.models import Usuario, Vendedor
from apps.catalog.models import Categoria, Producto, Puesto, PuestoCategoria
from apps.orders.models import ItemPedido, Pedido


class UsuarioFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Usuario
        # El guardado tras los hooks lo hacemos nosotros (ver password)
        skip_postgeneration_save = True

    nombre = factory.Sequence(lambda n: f"Usuario {n}")
    correo = factory.Sequence(lambda n: f"usuario{n}@riomarket.test")
    celular = factory.Sequence(lambda n: f"3{n:09d}")
    rol = Usuario.Rol.COMPRADOR

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        """Hashea la contraseña (nunca guardarla en claro, ni en tests)."""
        if extracted is None:
            self.set_unusable_password()
        else:
            self.set_password(extracted)
        if create:
            self.save(update_fields=["password"])


class CategoriaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Categoria
        django_get_or_create = ("nombre",)

    nombre = factory.Sequence(lambda n: f"Categoria {n}")
    activa = True


class VendedorFactory(factory.django.DjangoModelFactory):
    """Fila de verificación de un vendedor.

    Por defecto crea también su ``Usuario`` vendedor y queda aprobado (regla 1).
    """

    class Meta:
        model = Vendedor

    id_usuario = factory.SubFactory(UsuarioFactory, rol=Usuario.Rol.VENDEDOR)
    estado_verificacion = Vendedor.EstadoVerificacion.APROBADO


class VendedorPendienteFactory(VendedorFactory):
    estado_verificacion = Vendedor.EstadoVerificacion.PENDIENTE


class VendedorRechazadoFactory(VendedorFactory):
    estado_verificacion = Vendedor.EstadoVerificacion.RECHAZADO
    motivo_rechazo = "Documento ilegible."


class PuestoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Puesto

    id_vendedor = factory.SubFactory(UsuarioFactory, rol=Usuario.Rol.VENDEDOR)
    nombre = factory.Sequence(lambda n: f"Puesto {n}")
    descripcion = "Puesto de prueba"
    direccion = factory.Sequence(lambda n: f"Calle {n} #2-3")
    ofrece_domicilio = False
    estado = Puesto.Estado.ACTIVO


class PuestoCategoriaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = PuestoCategoria
        # Evita duplicados al repetir la misma pareja en varios tests
        django_get_or_create = ("id_puesto", "id_categoria")

    id_puesto = factory.SubFactory(PuestoFactory)
    id_categoria = factory.SubFactory(CategoriaFactory)


class ProductoFactory(factory.django.DjangoModelFactory):
    """Un producto real: su puesto derecho ya tiene asignada la categoría
    (regla 2), de modo que pasar por ``full_clean()`` nunca falle."""

    class Meta:
        model = Producto
        skip_postgeneration_save = True

    id_puesto = factory.SubFactory(PuestoFactory)
    id_categoria = factory.SubFactory(CategoriaFactory)
    nombre = factory.Sequence(lambda n: f"Producto {n}")
    descripcion = "Producto de prueba"
    precio = "1500.00"
    stock = 10
    unidad_medida = Producto.UnidadMedida.UNIDAD
    estado = Producto.Estado.ACTIVO

    @factory.post_generation
    def vincular_categoria(self, create, extracted, **kwargs):
        if create:
            PuestoCategoria.objects.get_or_create(
                id_puesto=self.id_puesto, id_categoria=self.id_categoria
            )


class PedidoFactory(factory.django.DjangoModelFactory):
    """Pedido "vacio" (sin ítems) para probar transiciones de estado.

    Para tests de creación con stock se usa ``services.crear_pedido``.
    """

    class Meta:
        model = Pedido

    id_comprador = factory.SubFactory(UsuarioFactory)
    id_puesto = factory.SubFactory(PuestoFactory)
    tipo_entrega = Pedido.TipoEntrega.RETIRO
    estado = Pedido.Estado.PENDIENTE
    subtotal = Decimal("0.00")
    tarifa_domicilio = Decimal("0.00")
    total = Decimal("0.00")


class ItemPedidoFactory(factory.django.DjangoModelFactory):
    """Ítem con el snapshot tomado del producto (como hace el servicio)."""

    class Meta:
        model = ItemPedido

    id_pedido = factory.SubFactory(PedidoFactory)
    id_producto = factory.SubFactory(ProductoFactory)
    nombre_producto = factory.LazyAttribute(lambda item: item.id_producto.nombre)
    unidad_medida = factory.LazyAttribute(lambda item: item.id_producto.unidad_medida)
    precio_unitario = factory.LazyAttribute(lambda item: item.id_producto.precio)
    cantidad = 1
