"""Genera la miniatura (400 px) y las medidas de las fotos de producto que no las tienen.

Las fotos de demostración nacieron sin miniatura ni ancho/alto, así que las tarjetas del catálogo
descargaban la foto completa. El comando es idempotente: solo toca lo que falta, no vuelve a
codificar la foto original y no reemplaza nada que ya esté.
"""

import os

from django.core.management.base import BaseCommand
from django.db.models import Q

from apps.catalog.models import ImagenProducto
from apps.catalog.services import miniatura_y_medidas


class Command(BaseCommand):
    help = (
        "Genera miniaturas y medidas de las imágenes de producto que no las tienen (idempotente)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run", action="store_true", help="Cuenta lo que haría sin guardar nada."
        )
        parser.add_argument(
            "--limite", type=int, default=0, help="Máximo de imágenes a procesar (0 = todas)."
        )

    def handle(self, *args, **options):
        pendientes = (
            ImagenProducto.objects.filter(
                Q(miniatura="") | Q(miniatura__isnull=True) | Q(ancho__isnull=True)
            )
            .exclude(archivo="")
            .order_by("id")
        )
        if options["limite"] > 0:
            pendientes = pendientes[: options["limite"]]

        generadas = 0
        sin_archivo = 0
        for imagen in pendientes:
            try:
                with imagen.archivo.open("rb") as abierto:
                    contenido = abierto.read()
            except Exception:
                # Disco efímero: el archivo desapareció. seed_imagenes_demo lo recrea.
                sin_archivo += 1
                continue
            nombre = os.path.basename(imagen.archivo.name)
            try:
                miniatura, medidas = miniatura_y_medidas(contenido, nombre)
            except Exception:
                sin_archivo += 1
                continue
            if not options["dry_run"]:
                campos = ["ancho", "alto"]
                imagen.ancho, imagen.alto = medidas["ancho"], medidas["alto"]
                if not imagen.miniatura:
                    imagen.miniatura.save(miniatura.name, miniatura, save=False)
                    campos.append("miniatura")
                imagen.save(update_fields=campos)
            generadas += 1

        prefijo = "Se generarían: " if options["dry_run"] else ""
        self.stdout.write(self.style.SUCCESS(f"{prefijo}Miniaturas generadas: {generadas}"))
        if sin_archivo:
            self.stdout.write(f"Imágenes sin archivo (omitidas): {sin_archivo}")
