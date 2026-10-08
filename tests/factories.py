"""Factories (factory_boy) compartidas por toda la suite."""

import factory

from apps.accounts.models import Usuario
from apps.catalog.models import Categoria, Producto, Puesto, PuestoCategoria


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
