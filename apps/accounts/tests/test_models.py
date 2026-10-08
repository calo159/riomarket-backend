"""Pruebas del modelo Usuario: normalización, unicidad y hash de password."""

import pytest
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction

from apps.accounts.models import Usuario
from tests.factories import UsuarioFactory


@pytest.mark.django_db
class TestNormalizacion:
    def test_correo_se_normaliza_al_guardar(self):
        usuario = UsuarioFactory(correo="  Pepe.TEST@Example.COM ")
        usuario.refresh_from_db()
        assert usuario.correo == "pepe.test@example.com"

    def test_celular_se_normaliza_a_solo_digitos(self):
        usuario = UsuarioFactory(celular="+57 300 123 4567")
        usuario.refresh_from_db()
        assert usuario.celular == "3001234567"

    def test_celular_con_prefijo_internacional(self):
        usuario = UsuarioFactory(celular="00573001234567")
        usuario.refresh_from_db()
        assert usuario.celular == "3001234567"

    @pytest.mark.parametrize(
        "celular,esperado",
        [
            ("300-123-4567", "3001234567"),
            ("+57 (300) 123 4567", "3001234567"),
            ("3001234567", "3001234567"),
        ],
    )
    def test_formatos_de_celular_equivalentes(self, celular, esperado):
        assert Usuario.normalizar_celular(celular) == esperado


@pytest.mark.django_db
class TestUnicidad:
    def test_no_permite_correo_duplicado_por_mayusculas(self):
        UsuarioFactory(correo="pepe@riomarket.test")
        with pytest.raises(IntegrityError), transaction.atomic():
            UsuarioFactory(correo="  PEPE@riomarket.TEST ")

    def test_no_permite_celular_duplicado_por_codigo_pais(self):
        UsuarioFactory(celular="3001234567")
        with pytest.raises(IntegrityError), transaction.atomic():
            UsuarioFactory(celular="+57 300 123 4567")


@pytest.mark.django_db
class TestPassword:
    def test_no_guarda_password_en_claro(self):
        usuario = UsuarioFactory(password="MiClaveSecreta123")
        assert usuario.password != "MiClaveSecreta123"
        assert "MiClaveSecreta123" not in usuario.password
        assert "$" in usuario.password  # formato <algoritmo>$<params>
        assert usuario.check_password("MiClaveSecreta123")
        assert not usuario.check_password("otraclave")

    def test_create_user_hashea_y_normaliza(self):
        usuario = Usuario.objects.create_user(
            correo="NUEVO@Riomarket.test", celular="+57 311 555 4444", password="Abc12345!"
        )
        assert usuario.correo == "nuevo@riomarket.test"
        assert usuario.celular == "3115554444"
        assert usuario.check_password("Abc12345!")
        assert usuario.rol == Usuario.Rol.COMPRADOR

    def test_create_superuser_es_administrador(self):
        usuario = Usuario.objects.create_superuser(
            correo="admin@riomarket.test", celular="3000000001", password="Abc12345!"
        )
        assert usuario.rol == Usuario.Rol.ADMINISTRADOR
        assert usuario.is_staff and usuario.is_superuser


@pytest.mark.django_db
class TestEstados:
    def test_is_active_refleja_estado(self):
        usuario = UsuarioFactory()
        assert usuario.is_active is True
        usuario.suspendir()
        assert usuario.is_active is False
        usuario.is_active = True
        usuario.save()
        assert usuario.estado == Usuario.Estado.ACTIVO

    def test_puede_publicar_en_incremento_1(self):
        comprador = UsuarioFactory(rol=Usuario.Rol.COMPRADOR)
        vendedor = UsuarioFactory(rol=Usuario.Rol.VENDEDOR)
        assert comprador.puede_publicar() is False
        # Regla 1 (Inc 1): aún no existe la fila Vendedor, y la cuenta activa
        # + rol vendedor basta para considerarlo "aprobado".
        assert vendedor.puede_publicar() is True

    def test_puede_publicar_falso_si_suspendido(self):
        usuario = UsuarioFactory(rol=Usuario.Rol.VENDEDOR)
        usuario.suspendir()
        assert usuario.puede_publicar() is False


@pytest.mark.django_db
class TestRestricciones:
    def test_checkconstraints_de_rol_y_estado_existen(self):
        nombres = {c.name for c in Usuario._meta.constraints}
        assert {"usuario_rol_valido", "usuario_estado_valido"} <= nombres

    def test_rol_invalido_rechazado_por_choices(self):
        usuario = Usuario(nombre="x", correo="x@y.test", celular="3000000009", rol="hacker")
        with pytest.raises(DjangoValidationError):
            usuario.full_clean()

    def test_estado_invalido_rechazado_por_choices(self):
        usuario = Usuario(nombre="x", correo="x2@y.test", celular="3000000008", estado="volando")
        with pytest.raises(DjangoValidationError):
            usuario.full_clean()
