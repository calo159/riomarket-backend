"""Añade imágenes del seed a productos/puestos si faltan (idempotente)."""

from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from apps.catalog.models import ImagenProducto, Producto, Puesto

SEED_DIR = Path(__file__).resolve().parent.parent.parent.parent / "seed_images"


class Command(BaseCommand):
    help = "Asigna imágenes demo a productos/puestos desde seed_images/ (idempotente)."

    def handle(self, *args, **options):
        if not SEED_DIR.exists():
            self.stdout.write("seed_images/ no existe; omitiendo.")
            return
        total = 0
        # Productos
        productos = Producto.objects.all()
        for p in productos:
            slug_base = p.nombre.lower().replace(" ", "-").replace("(", "").replace(")", "")
            candidatos = []
            for suf in ["", "-x3", "-1l", "-docena"]:
                s = slug_base + suf
                for ext in [".webp", ".jpg", ".png", ".jpeg"]:
                    f = SEED_DIR / f"{s}{ext}"
                    if f.exists():
                        candidatos.append(f)
                        break
            if not candidatos:
                # mapa simple
                mapa = {
                    "arroz": "arroz",
                    "frijol": "frijoles-rojos",
                    "aceite": "aceite-vegetal",
                    "azúcar": "azucar-blanca",
                    "sal": "sal-refinada",
                    "leche": "leche-entera",
                    "huevo": "huevos",
                    "pan": "pan-tajado",
                    "papa": "papa-criolla",
                    "plátano": "platano-verde",
                    "yuca": "yuca",
                    "cebolla": "cebolla-cabezona",
                    "tomate": "tomate-chonto",
                    "zanahoria": "zanahoria",
                    "ajo": "ajo",
                    "limón": "limon-tahiti",
                    "naranja": "naranja",
                    "manzana": "manzana-verde",
                    "banano": "banano",
                    "sandía": "sandia",
                    "pescado": "pescado-fresco",
                    "pollo": "pollo-entero",
                    "carne molida": "carne-molida",
                    "arepa": "arepas",
                    "empanada": "empanadas",
                    "buñuelo": "buñuelos",
                    "café": "cafe-molido",
                    "agua": "agua-botella",
                    "gaseosa": "gaseosa",
                    "jabón": "jabón",
                    "detergente": "detergente",
                    "shampoo": "shampoo",
                    "papel": "papel-higienico",
                    "bolsa": "bolsa-basura",
                    "mochila": "mochila-wayuu",
                    "chinchorro": "hamaca",
                    "sombrero": "sombrero-vueltiao",
                    "pulsera": "manilla-artesanal",
                    "guayabera": "manilla-artesanal",
                    "blusa": "manilla-artesanal",
                    "sandalia": "manilla-artesanal",
                    "mango": "mango",
                    "patilla": "sandia",
                    "piña": "naranja",
                    "melón": "sandia",
                    "aguacate": "aguacate",
                    "coco": "dulces-tipicos",
                    "jugo": "naranja",
                    "mojarra": "pescado-fresco",
                    "arroz de camarón": "pescado-fresco",
                    "sopa de mariscos": "pescado-fresco",
                    "sancocho": "frijoles-rojos",
                    "cerdo": "carne-molida",
                    "alegría": "dulces-tipicos",
                    "cocada": "dulces-tipicos",
                    "papaya": "dulces-tipicos",
                    "queso": "leche-entera",
                    "suero": "leche-entera",
                    "bocachico": "pescado-fresco",
                    "sierra": "pescado-fresco",
                    "camarón": "pescado-fresco",
                    "jaiba": "pescado-fresco",
                    "lisa": "pescado-fresco",
                    "chivo": "carne-molida",
                }
                for k, v in mapa.items():
                    if k in p.nombre.lower():
                        f = SEED_DIR / f"{v}.webp"
                        if f.exists():
                            candidatos.append(f)
                        break
            if candidatos and not p.imagenes.exists():
                try:
                    fpath = candidatos[0]
                    data = fpath.read_bytes()
                    cf = ContentFile(data)
                    cf.name = f"{p.nombre.lower().replace(' ', '_')}.webp"
                    ImagenProducto.objects.create(
                        id_producto=p,
                        archivo=cf,
                        orden=1,
                        alt=p.nombre,
                        es_principal=True,
                    )
                    total += 1
                except Exception as e:
                    print("ERR img prod", p.id, e)
        # Puestos
        for puesto in Puesto.objects.all():
            clave = None
            nombre = puesto.nombre.lower()
            if "carmen" in nombre or "palenque" in nombre:
                clave = "puesto-frutas"
            elif "tejido" in nombre:
                clave = "puesto-artesanias"
            elif "fruta" in nombre:
                clave = "puesto-frutas"
            elif "cocina" in nombre:
                clave = "puesto-comidas"
            elif "dulce" in nombre:
                clave = "puesto-frutas"
            elif "pescad" in nombre:
                clave = "puesto-pescado"
            if not clave:
                continue
            for campo, suf in [("portada", "-portada.webp"), ("logo", "-logo.webp")]:
                if suf == "-logo.webp":
                    f = SEED_DIR / f"{clave}{suf}"
                    if not f.exists():
                        f = SEED_DIR / f"{clave}-portada.webp"
                else:
                    f = SEED_DIR / f"{clave}{suf}"
                if f.exists() and not getattr(puesto, campo):
                    try:
                        data = f.read_bytes()
                        cf = ContentFile(data)
                        cf.name = f"{clave}{suf}"
                        setattr(puesto, campo, cf)
                        puesto.save(update_fields=[campo])
                        total += 1
                    except Exception as e:
                        print("ERR img puesto", puesto.id, e)
        self.stdout.write(self.style.SUCCESS(f"Imágenes asignadas: {total}"))
