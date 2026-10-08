"""Factories (factory_boy) compartidas por toda la suite."""

import factory

from apps.accounts.models import Usuario


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
