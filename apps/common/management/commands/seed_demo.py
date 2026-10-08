"""Seed de demostración: usuarios, catálogo y puestos del mercado.

Idempotente: se puede ejecutar varias veces. NO usar en producción con una
contraseña por defecto — pásala con ``--password``.
"""

from django.core.management.base import BaseCommand

from apps.accounts.models import Usuario
from apps.catalog.models import Categoria, Producto, Puesto
from apps.catalog.services import asignar_categoria

# Río de la bahía de Riohacha (para puestos con domicilio)
LAT_RIOHACHA = "11.544"
LON_RIOHACHA = "-72.907"


class Command(BaseCommand):
    help = "Crea datos de demostración (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default="RioMarket2026!",
            help="Contraseña única para todos los usuarios demo.",
        )

    def handle(self, *args, **options):
        password = options["password"]

        admin, _ = Usuario.objects.get_or_create(
            correo="admin@riomarket.test",
            defaults={
                "nombre": "Admin RioMarket",
                "celular": "3000000001",
                "rol": Usuario.Rol.ADMINISTRADOR,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin.set_password(password)
        admin.save()

        vendedor1, _ = Usuario.objects.get_or_create(
            correo="carmen@riomarket.test",
            defaults={
                "nombre": "Carmen Sofía Iguarán",
                "celular": "3000000002",
                "rol": Usuario.Rol.VENDEDOR,
            },
        )
        vendedor1.set_password(password)
        vendedor1.save()

        vendedor2, _ = Usuario.objects.get_or_create(
            correo="diego@riomarket.test",
            defaults={
                "nombre": "Diego Rivera",
                "celular": "3000000003",
                "rol": Usuario.Rol.VENDEDOR,
            },
        )
        vendedor2.set_password(password)
        vendedor2.save()

        comprador, _ = Usuario.objects.get_or_create(
            correo="luis@riomarket.test",
            defaults={
                "nombre": "Luis Pimienta",
                "celular": "3000000004",
                "rol": Usuario.Rol.COMPRADOR,
            },
        )
        comprador.set_password(password)
        comprador.save()

        # --- Categorías (subcategorías con id_categoria_padre) ---
        comida = Categoria.objects.get_or_create(nombre="Comida")[0]
        artesanias = Categoria.objects.get_or_create(nombre="Artesanías")[0]
        ropa = Categoria.objects.get_or_create(nombre="Ropa")[0]
        arepas = Categoria.objects.get_or_create(
            nombre="Arepas", defaults={"id_categoria_padre": comida}
        )[0]

        # --- Puestos (regla 3: domicilio ⇒ coordenadas) ---
        puesto1 = Puesto.objects.get_or_create(
            id_vendedor=vendedor1,
            nombre="Palenque de Carmen",
            defaults={
                "descripcion": "Comida tradicional guajira y desayunos.",
                "direccion": "Mercado Viejo, Carrera 2 #7-23",
                "latitud": LAT_RIOHACHA,
                "longitud": LON_RIOHACHA,
                "horario": "Lun-Sáb 6:00-14:00",
                "ofrece_domicilio": True,
            },
        )[0]
        puesto2 = Puesto.objects.get_or_create(
            id_vendedor=vendedor2,
            nombre="Tejidos Guajiro",
            defaults={
                "descripcion": "Mochilas, gorros y pulseras wayuu.",
                "direccion": "Plaza Padilla, local 12",
                "latitud": LAT_RIOHACHA,
                "longitud": LON_RIOHACHA,
                "horario": "Lun-Dom 9:00-19:00",
                "ofrece_domicilio": True,
            },
        )[0]

        for puesto, categoria in [
            (puesto1, comida),
            (puesto1, arepas),
            (puesto2, artesanias),
            (puesto2, ropa),
        ]:
            asignar_categoria(puesto=puesto, categoria=categoria)

        # --- Productos (regla 2: la categoría está asignada al puesto) ---
        self._producto(puesto1, arepas, "Arepa de huevo", 3500, 25)
        self._producto(puesto1, arepas, "Enrollado de dulce (paquete x3)", 9000, 10)
        self._producto(puesto1, comida, "Friche de chivo", 28000, 6)
        self._producto(puesto2, artesanias, "Mochila wayuu", 45000, 4)
        self._producto(puesto2, ropa, "Guayabera artesanal", 60000, 8)

        self.stdout.write(
            self.style.SUCCESS(
                "Seed completico: admin, 2 vendedores, 1 comprador, "
                "4 categorías, 2 puestos y 5 productos. "
                f"Contraseña demo: {password}"
            )
        )

    def _producto(self, puesto, categoria, nombre, precio, stock):
        producto, creado = Producto.objects.get_or_create(
            id_puesto=puesto,
            nombre=nombre,
            defaults={
                "id_categoria": categoria,
                "descripcion": "Producto de demostración.",
                "precio": precio,
                "stock": stock,
            },
        )
        if not creado and producto.id_categoria != categoria:
            producto.id_categoria = categoria
            producto.save()
        return producto
