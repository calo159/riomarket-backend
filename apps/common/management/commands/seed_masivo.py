"""Seed masivo de datos de demostración para la entrega de RioMarket.

Genera 250+ registros realistas de Riohacha (Colombia) usando los servicios de
cada app para respetar las reglas de negocio (stock, montos, estados, cupones,
reseñas solo de pedidos entregados, etc.).

Características:
- **Idempotente**: se puede ejecutar varias veces sin duplicar ni fallar.
- **No rompe** ``seed_demo``: son comandos independientes.
- Imprime una tabla con el conteo por modelo y falla si el total es < 100.

Uso::

    python manage.py seed_masivo
    python manage.py seed_masivo --password "OtraClave1!"
    python manage.py seed_masivo --if-empty
"""

import os
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import Usuario, Vendedor
from apps.addresses import services as direcciones_services
from apps.addresses.models import Direccion
from apps.audit.models import RegistroAuditoria
from apps.catalog.models import Categoria, Producto, Puesto, PuestoCategoria
from apps.catalog.services import asignar_categoria
from apps.notifications.models import Notificacion
from apps.orders import services as orders_services
from apps.orders.models import ItemPedido, Pedido
from apps.payments import services as pagos_services
from apps.payments.models import Pago
from apps.promotions import services as promos_services
from apps.promotions.models import Cupon, UsoCupon
from apps.rbac.defaults import sembrar
from apps.rbac.models import Recurso, Rol, RolRecurso
from apps.reviews import services as reviews_services
from apps.reviews.models import Resena

CONTRASENA_POR_DEFECTO = "RioMarket2026!"

TOTAL_MINIMO = 100

MODELOS_CONTEO = (
    Usuario,
    Vendedor,
    Categoria,
    Puesto,
    Producto,
    Direccion,
    Pedido,
    ItemPedido,
    Pago,
    Cupon,
    Resena,
    Notificacion,
    RegistroAuditoria,
)

# Coordenadas de referencia en Riohacha (La Guajira).
LAT_BASE = "11.544440"
LON_BASE = "-72.907490"

# Tablas de datos del seed: sin reformatear (las tuplas largas se leen mejor en
# una línea; E501 ya se ignora para este archivo en pyproject.toml).
# fmt: off
USUARIOS = [
    {
        "clave": "admin",
        "nombre": "Ada Luz Epieyu",
        "correo": "admin@riomarket.test",
        "celular": "3000000001",
        "rol": Usuario.Rol.ADMINISTRADOR,
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "clave": "carmen",
        "nombre": "Carmen Sofía Iguarán",
        "correo": "carmen@riomarket.test",
        "celular": "3000000002",
        "rol": Usuario.Rol.VENDEDOR,
    },
    {
        "clave": "diego",
        "nombre": "Diego Andrés Rivera",
        "correo": "diego@riomarket.test",
        "celular": "3000000003",
        "rol": Usuario.Rol.VENDEDOR,
    },
    {
        "clave": "rosa",
        "nombre": "Rosa Elena Pushaina",
        "correo": "rosa@riomarket.test",
        "celular": "3000000005",
        "rol": Usuario.Rol.VENDEDOR,
    },
    {
        "clave": "jose",
        "nombre": "José Gregorio Uriana",
        "correo": "jose@riomarket.test",
        "celular": "3000000006",
        "rol": Usuario.Rol.VENDEDOR,
    },
    {
        "clave": "luis",
        "nombre": "Luis Fernando Pimienta",
        "correo": "luis@riomarket.test",
        "celular": "3000000010",
        "rol": Usuario.Rol.COMPRADOR,
    },
    {
        "clave": "ana",
        "nombre": "Ana María Freyle",
        "correo": "ana@riomarket.test",
        "celular": "3000000011",
        "rol": Usuario.Rol.COMPRADOR,
    },
    {
        "clave": "kevin",
        "nombre": "Kevin Alberto Mejía",
        "correo": "kevin@riomarket.test",
        "celular": "3000000012",
        "rol": Usuario.Rol.COMPRADOR,
    },
    {
        "clave": "laura",
        "nombre": "Laura Vanessa Daza",
        "correo": "laura@riomarket.test",
        "celular": "3000000013",
        "rol": Usuario.Rol.COMPRADOR,
    },
    {
        "clave": "mario",
        "nombre": "Mario Enrique Barros",
        "correo": "mario@riomarket.test",
        "celular": "3000000014",
        "rol": Usuario.Rol.COMPRADOR,
    },
    {
        "clave": "yuli",
        "nombre": "Yuliana Paola Ipuana",
        "correo": "yuli@riomarket.test",
        "celular": "3000000015",
        "rol": Usuario.Rol.COMPRADOR,
    },
    {
        "clave": "andres",
        "nombre": "Andrés Felipe Cotes",
        "correo": "andres@riomarket.test",
        "celular": "3000000016",
        "rol": Usuario.Rol.COMPRADOR,
    },
    {
        "clave": "diana",
        "nombre": "Diana Carolina Rojas",
        "correo": "diana@riomarket.test",
        "celular": "3000000017",
        "rol": Usuario.Rol.COMPRADOR,
    },
    {
        "clave": "jorge",
        "nombre": "Jorge Luis Guerra",
        "correo": "jorge@riomarket.test",
        "celular": "3000000018",
        "rol": Usuario.Rol.COMPRADOR,
    },
    {
        "clave": "sara",
        "nombre": "Sara Milena Redondo",
        "correo": "sara@riomarket.test",
        "celular": "3000000019",
        "rol": Usuario.Rol.COMPRADOR,
    },
]

# (nombre, padre o None)
CATEGORIAS = [
    ("Comida", None),
    ("Artesanías", None),
    ("Ropa", None),
    ("Frutas y verduras", None),
    ("Bebidas", None),
    ("Arepas", "Comida"),
    ("Pescados y mariscos", "Comida"),
    ("Dulces típicos", "Comida"),
]

PUESTOS = {
    "palenque": {
        "vendedor": "carmen",
        "nombre": "Palenque de Carmen",
        "descripcion": "Comida tradicional guajira y desayunos recién hechos.",
        "direccion": "Mercado Viejo, Carrera 2 #7-23",
        "latitud": "11.544440",
        "longitud": "-72.907490",
        "horario": "Lun-Sáb 6:00-14:00",
        "ofrece_domicilio": True,
        "acepta_whatsapp": True,
    },
    "tejidos": {
        "vendedor": "diego",
        "nombre": "Tejidos Guajiro",
        "descripcion": "Mochilas, chinchorros y artesanías wayuu.",
        "direccion": "Plaza Padilla, local 12",
        "latitud": "11.546120",
        "longitud": "-72.909870",
        "horario": "Lun-Dom 9:00-19:00",
        "ofrece_domicilio": True,
        "acepta_whatsapp": True,
    },
    "frutas": {
        "vendedor": "rosa",
        "nombre": "Frutas del Caribe",
        "descripcion": "Frutas frescas de la región y jugos naturales.",
        "direccion": "Calle 15 #8-40, Barrio Centro",
        "latitud": "11.542350",
        "longitud": "-72.905610",
        "horario": "Lun-Dom 5:30-18:00",
        "ofrece_domicilio": True,
        "acepta_whatsapp": True,
    },
    "cocina": {
        "vendedor": "jose",
        "nombre": "Cocina de la Abuela",
        "descripcion": "Comidas, pescados y mariscos al estilo guajiro.",
        "direccion": "Carrera 7 #12-05, Barrio El Dividivi",
        "latitud": "11.548900",
        "longitud": "-72.912340",
        "horario": "Mar-Dom 10:00-20:00",
        "ofrece_domicilio": True,
        "acepta_whatsapp": True,
    },
    "dulces": {
        "vendedor": "carmen",
        "nombre": "Dulces de Carmen",
        "descripcion": "Dulces típicos, queso y suero costeño.",
        "direccion": "Calle 9 #4-11, Barrio Camino Nuevo",
        "latitud": "11.540870",
        "longitud": "-72.903220",
        "horario": "Lun-Sáb 7:00-17:00",
        "ofrece_domicilio": True,
        "acepta_whatsapp": True,
    },
    "pescaderia": {
        "vendedor": "diego",
        "nombre": "Pescadería La Bahía",
        "descripcion": "Pescado y mariscos frescos del día.",
        "direccion": "Muelle Turístico, Zona Costera",
        "latitud": "11.550230",
        "longitud": "-72.915670",
        "horario": "Lun-Dom 5:00-15:00",
        "ofrece_domicilio": True,
        "acepta_whatsapp": True,
    },
}

# puesto -> [(nombre, categoría, precio, stock, unidad, descripción)]
PRODUCTOS = {
    "palenque": [
        ("Arepa de huevo", "Arepas", "3500", 300, "unidad", "Arepa frita rellena de huevo."),
        ("Arepa de queso", "Arepas", "4000", 220, "unidad", "Arepa asada con queso costeño."),
        ("Enrollado de dulce (x3)", "Dulces típicos", "9000", 80, "unidad", "Enrollado de coco y panela."),
        ("Friche de chivo", "Comida", "28000", 60, "porcion", "Friche guajiro con hueso."),
        ("Chivo guisado", "Comida", "25000", 55, "porcion", "Chivo guisado con arroz de coco."),
        ("Sopa de guandú", "Comida", "15000", 50, "porcion", "Sopa de guandú con carne."),
        ("Bollo limpio", "Comida", "2000", 180, "unidad", "Bollo de maíz tradicional."),
        ("Jugo de corozo", "Bebidas", "5000", 120, "unidad", "Jugo natural de corozo."),
    ],
    "tejidos": [
        ("Mochila wayuu", "Artesanías", "45000", 30, "unidad", "Mochila tejida a mano."),
        ("Chinchorro wayuu", "Artesanías", "180000", 8, "unidad", "Chinchorro tejido en crochet."),
        ("Sombrero wayuu", "Artesanías", "35000", 25, "unidad", "Sombrero tejido artesanal."),
        ("Pulsera wayuu", "Artesanías", "12000", 80, "unidad", "Pulsera de hilos de colores."),
        ("Guayabera artesanal", "Ropa", "60000", 20, "unidad", "Guayabera bordada a mano."),
        ("Blusa bordada", "Ropa", "55000", 18, "unidad", "Blusa con bordado wayuu."),
        ("Sandalias wayuu", "Ropa", "70000", 14, "unidad", "Sandalias tejidas a mano."),
    ],
    "frutas": [
        ("Mango de azúcar (kg)", "Frutas y verduras", "4000", 150, "kg", "Mango dulce de temporada."),
        ("Patilla (kg)", "Frutas y verduras", "2500", 200, "kg", "Patilla fresca y dulce."),
        ("Piña (unidad)", "Frutas y verduras", "6000", 60, "unidad", "Piña criolla."),
        ("Melón (unidad)", "Frutas y verduras", "7000", 45, "unidad", "Melón maduro."),
        ("Aguacate (kg)", "Frutas y verduras", "9000", 70, "kg", "Aguacate criollo."),
        ("Coco (unidad)", "Frutas y verduras", "3000", 100, "unidad", "Coco fresco de la costa."),
        ("Jugo natural de mango", "Bebidas", "6000", 60, "litro", "Jugo de mango 1 litro."),
    ],
    "cocina": [
        ("Pescado frito", "Pescados y mariscos", "30000", 45, "porcion", "Pescado frito con patacón."),
        ("Mojarra al ajillo", "Pescados y mariscos", "32000", 35, "porcion", "Mojarra frita al ajillo."),
        ("Arroz de camarón", "Pescados y mariscos", "28000", 30, "porcion", "Arroz con camarón fresco."),
        ("Sopa de mariscos", "Pescados y mariscos", "35000", 25, "porcion", "Sopa con camarón y jaiba."),
        ("Sancocho de guandú", "Comida", "18000", 40, "porcion", "Sancocho costeño."),
        ("Arroz de coco", "Comida", "8000", 60, "porcion", "Arroz de coco con pasas."),
        ("Cerdo asado", "Comida", "22000", 30, "porcion", "Cerdo asado con arepa."),
    ],
    "dulces": [
        ("Enrollado de coco", "Dulces típicos", "3000", 140, "unidad", "Enrollado de coco tradicional."),
        ("Alegría de coco", "Dulces típicos", "2500", 150, "unidad", "Alegría de coco y panela."),
        ("Cocadas", "Dulces típicos", "2000", 180, "unidad", "Cocadas horneadas."),
        ("Dulce de papaya", "Dulces típicos", "8000", 60, "unidad", "Dulce de papaya en panela."),
        ("Queso costeño (kg)", "Comida", "15000", 50, "kg", "Queso costeño freso."),
        ("Suero costeño", "Comida", "10000", 40, "litro", "Suero costeño para arepas."),
    ],
    "pescaderia": [
        ("Bocachico (kg)", "Pescados y mariscos", "20000", 45, "kg", "Bocachico fresco del río."),
        ("Sierra (kg)", "Pescados y mariscos", "18000", 40, "kg", "Sierra fresca del día."),
        ("Camarón (kg)", "Pescados y mariscos", "45000", 25, "kg", "Camarón fresco de la bahía."),
        ("Jaiba (docena)", "Pescados y mariscos", "25000", 30, "docena", "Jaiba fresca."),
        ("Lisa (kg)", "Pescados y mariscos", "16000", 35, "kg", "Lisa fresca de la costa."),
    ],
}

# --- Cupones: (codigo, puesto o None, tipo, valor, minimo, tope, usos_total, usos_usuario) ---
CUPONES = [
    ("BIENVENIDA2026", None, Cupon.TipoDescuento.PORCENTAJE, "10", "0", "10000", None, 1),
    ("MERCADO5000", None, Cupon.TipoDescuento.MONTO, "5000", "30000", None, None, None),
    ("FRESCO10", None, Cupon.TipoDescuento.PORCENTAJE, "10", "10000", None, None, None),
    ("TEJIDOS5000", "tejidos", Cupon.TipoDescuento.MONTO, "5000", "40000", None, None, None),
    ("PALENQUE2000", "palenque", Cupon.TipoDescuento.MONTO, "2000", "10000", None, None, None),
]

# --- Pedidos: (clave, comprador_idx, puesto, items[(idx_local, cantidad)],
#               estado, tipo_entrega, pago(bool), metodo, aprobado, cupon) ---
PEDIDOS = [
    # 16 entregados (parejas únicas comprador-puesto para poder reseñar)
    ("SM-01", 0, "palenque", [(0, 2)], "entregado", "retiro", True, "simulado", True, None),
    ("SM-02", 1, "tejidos", [(0, 1)], "entregado", "retiro", True, "simulado", True, None),
    ("SM-03", 2, "frutas", [(0, 3), (1, 2)], "entregado", "retiro", True, "nequi", True, "FRESCO10"),
    ("SM-04", 3, "cocina", [(0, 1)], "entregado", "retiro", True, "simulado", True, None),
    ("SM-05", 4, "dulces", [(0, 5)], "entregado", "retiro", True, "efectivo", True, None),
    ("SM-06", 5, "pescaderia", [(0, 2)], "entregado", "retiro", True, "simulado", True, None),
    ("SM-07", 6, "palenque", [(4, 1)], "entregado", "domicilio", True, "simulado", True, None),
    ("SM-08", 7, "tejidos", [(4, 1)], "entregado", "domicilio", True, "tarjeta", True, "TEJIDOS5000"),
    ("SM-09", 8, "frutas", [(2, 2)], "entregado", "domicilio", True, "simulado", True, None),
    ("SM-10", 9, "cocina", [(1, 1)], "entregado", "domicilio", True, "nequi", True, None),
    ("SM-11", 0, "tejidos", [(4, 1)], "entregado", "retiro", True, "simulado", True, None),
    ("SM-12", 1, "pescaderia", [(1, 2)], "entregado", "domicilio", True, "simulado", True, None),
    ("SM-13", 2, "palenque", [(1, 4)], "entregado", "retiro", True, "efectivo", True, None),
    ("SM-14", 3, "tejidos", [(6, 1)], "entregado", "retiro", True, "simulado", True, None),
    ("SM-15", 4, "cocina", [(5, 2)], "entregado", "retiro", True, "daviplata", True, None),
    ("SM-16", 5, "palenque", [(7, 2)], "entregado", "retiro", True, "simulado", True, "PALENQUE2000"),
    # 5 cancelados (3 reembolsados + 2 anulados)
    ("SM-17", 6, "frutas", [(0, 2)], "cancelado", "retiro", True, "simulado", True, None),
    ("SM-18", 7, "palenque", [(0, 3)], "cancelado", "retiro", True, "simulado", False, None),
    ("SM-19", 8, "tejidos", [(0, 1)], "cancelado", "retiro", True, "simulado", True, None),
    ("SM-20", 9, "frutas", [(1, 1)], "cancelado", "retiro", True, "simulado", False, None),
    ("SM-21", 0, "cocina", [(0, 1)], "cancelado", "retiro", True, "simulado", True, None),
    # 2 confirmados
    ("SM-26", 5, "cocina", [(6, 1)], "confirmado", "domicilio", True, "simulado", True, None),
    ("SM-27", 6, "pescaderia", [(2, 1)], "confirmado", "retiro", True, "transferencia", True, None),
    # 1 en preparación y 1 listo para recoger (retiro pagado al recoger: efectivo sin cobrar)
    ("SM-28", 7, "dulces", [(2, 3)], "listo_para_recoger", "retiro", True, "efectivo", False, None),
    ("SM-29", 8, "palenque", [(2, 1)], "en_preparacion", "retiro", True, "efectivo", True, None),
    # 1 en camino (domicilio)
    ("SM-30", 9, "palenque", [(0, 1)], "en_camino", "domicilio", True, "simulado", True, None),
    # 4 pendientes (2 con pago pendiente, 2 sin pago)
    ("SM-22", 1, "frutas", [(3, 1)], "pendiente", "retiro", True, "simulado", False, None),
    ("SM-23", 2, "tejidos", [(0, 1)], "pendiente", "retiro", False, "simulado", False, None),
    ("SM-24", 3, "frutas", [(4, 1)], "pendiente", "retiro", True, "simulado", False, None),
    ("SM-25", 4, "pescaderia", [(0, 1)], "pendiente", "retiro", False, "simulado", False, None),
]

# Direcciones de los compradores: (barrio, direccion, alias, referencia)
DIRECCIONES = [
    ("Centro", "Calle 15 #7-42", "Casa", "Frente a la plaza"),
    ("El Dividivi", "Carrera 9 #14-08", "Casa", "Portón azul"),
    ("Camino Nuevo", "Calle 9 #5-19", "Trabajo", "Al lado de la panadería"),
    ("Bella Vista", "Carrera 12 #20-33", "Casa", "Casa de dos pisos"),
    ("Los Almendros", "Calle 4 #11-27", "Casa", "Frente al parque"),
    ("Nueva Esperanza", "Carrera 5 #18-51", "Trabajo", "Edificio amarillo"),
    ("El Progreso", "Calle 22 #6-14", "Casa", "Reja verde"),
    ("San Martín", "Carrera 3 #13-60", "Casa", "Diagonal al colegio"),
    ("Villa Fátima", "Calle 8 #16-22", "Trabajo", "Local esquinero"),
    ("31 de Octubre", "Carrera 10 #25-07", "Casa", "Casa esquinera"),
]

# Reseñas: (comprador_idx, puesto, calificacion, comentario, pedido_clave, respuesta)
RESENAS = [
    (0, "palenque", 5, "Las arepas de huevo son las mejores de Riohacha.", "SM-01", "¡Gracias por tu visita!"),
    (1, "tejidos", 5, "La mochila es hermosa y llegó impecable.", "SM-02", "Gracias, vuelve pronto."),
    (2, "frutas", 4, "Frutas frescas y buen precio.", "SM-03", None),
    (3, "cocina", 5, "El pescado frito estaba delicioso.", "SM-04", "¡Buen provecho!"),
    (4, "dulces", 4, "Los enrollados muy ricos, entrega puntual.", "SM-05", None),
    (5, "pescaderia", 5, "Pescado fresco y buen servicio.", "SM-06", "Gracias por confiar."),
    (6, "palenque", 4, "Buen chivo guisado, aunque demoró un poco.", "SM-07", "Mejoraremos los tiempos."),
    (7, "tejidos", 5, "Guayabera de excelente calidad.", "SM-08", None),
    (8, "frutas", 5, "La piña estaba dulcísima.", "SM-09", "¡Gracias!"),
    (9, "cocina", 4, "Rico el arroz de camarón.", "SM-10", None),
    (0, "tejidos", 5, "Segunda compra y sigue excelente.", "SM-11", "Gracias por volver."),
    (1, "pescaderia", 4, "Buena mojarra, bien empacada.", "SM-12", None),
    (2, "palenque", 5, "El jugo de corozo es refrescante.", "SM-13", None),
    (3, "tejidos", 5, "Sandalias cómodas y bonitas.", "SM-14", "¡Que las disfrutes!"),
    (4, "cocina", 4, "Arroz de coco muy sabroso.", "SM-15", None),
]
# fmt: on


class Command(BaseCommand):
    help = "Crea 250+ registros de demostración realistas de Riohacha (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default=os.environ.get("SEED_DEMO_PASSWORD", CONTRASENA_POR_DEFECTO),
            help="Contraseña única para todos los usuarios demo.",
        )
        parser.add_argument(
            "--if-empty",
            action="store_true",
            help=(
                "No hace nada si la base ya tiene al menos "
                f"{TOTAL_MINIMO} registros de dominio (para el arranque)."
            ),
        )

    @staticmethod
    def _total_registros() -> int:
        return sum(modelo.objects.count() for modelo in MODELOS_CONTEO)

    def handle(self, *args, **options):
        self.password = options["password"]
        sembrar(Rol, Recurso, RolRecurso)

        if options["if_empty"] and self._total_registros() >= TOTAL_MINIMO:
            self.stdout.write(
                f"Seed masivo omitido: la base ya tiene al menos {TOTAL_MINIMO} registros."
            )
            return
        self.usuarios: dict[str, Usuario] = {}
        self.categorias: dict[str, Categoria] = {}
        self.puestos: dict[str, Puesto] = {}
        self.productos: dict[str, list[Producto]] = {}
        self.direcciones: dict[int, Direccion] = {}
        self.cupones: dict[str, Cupon] = {}
        self.pedidos: dict[str, Pedido] = {}

        self._crear_usuarios()
        self._crear_categorias()
        self._crear_puestos()
        self._crear_productos()
        self._crear_direcciones()
        self._crear_cupones()
        self._crear_pedidos()
        self._crear_resenas()
        self._crear_notificaciones_extra()

        total = self._reportar()

        if total < TOTAL_MINIMO:
            raise CommandError(
                f"El seed generó {total} registros, por debajo del mínimo de {TOTAL_MINIMO}."
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed masivo listo: {total} registros. Contraseña demo: {self.password}"
            )
        )

    # ------------------------------------------------------------------
    # Usuarios
    # ------------------------------------------------------------------
    def _crear_usuarios(self):
        for datos in USUARIOS:
            campos = {k: v for k, v in datos.items() if k not in ("clave", "correo")}
            usuario, _ = Usuario.objects.get_or_create(correo=datos["correo"], defaults=campos)
            usuario.nombre = datos["nombre"]
            usuario.celular = datos["celular"]
            usuario.rol = datos["rol"]
            usuario.is_staff = datos.get("is_staff", False)
            usuario.is_superuser = datos.get("is_superuser", False)
            usuario.set_password(self.password)
            usuario.save()
            self.usuarios[datos["clave"]] = usuario

            if datos["rol"] == Usuario.Rol.VENDEDOR:
                Vendedor.objects.get_or_create(
                    id_usuario=usuario,
                    defaults={"estado_verificacion": Vendedor.EstadoVerificacion.APROBADO},
                )

        self.compradores = [
            self.usuarios[d["clave"]] for d in USUARIOS if d["rol"] == Usuario.Rol.COMPRADOR
        ]

    # ------------------------------------------------------------------
    # Catálogo
    # ------------------------------------------------------------------
    def _crear_categorias(self):
        for nombre, padre in CATEGORIAS:
            categoria, _ = Categoria.objects.get_or_create(nombre=nombre)
            if padre is not None and categoria.id_categoria_padre_id is None:
                categoria.id_categoria_padre = self.categorias[padre]
                categoria.save(update_fields=["id_categoria_padre"])
            self.categorias[nombre] = categoria

    def _crear_puestos(self):
        for clave, datos in PUESTOS.items():
            vendedor = self.usuarios[datos["vendedor"]]
            campos = {k: v for k, v in datos.items() if k != "vendedor"}
            puesto, creado = Puesto.objects.get_or_create(
                id_vendedor=vendedor, nombre=datos["nombre"], defaults=campos
            )
            if not creado:
                # El seed corre en cada despliegue: los puestos que ya existen se ponen al día
                # sin duplicarse. Coordenadas solo si faltan (no pisa lo que edite el vendedor).
                cambios = []
                if puesto.latitud is None or puesto.longitud is None:
                    puesto.latitud = campos["latitud"]
                    puesto.longitud = campos["longitud"]
                    cambios += ["latitud", "longitud"]
                # Los celulares de la demo son ficticios: se deja el contacto visible para
                # la demostración (la migración 0006 lo apagó en los puestos ya existentes).
                if not puesto.acepta_whatsapp:
                    puesto.acepta_whatsapp = True
                    cambios.append("acepta_whatsapp")
                if cambios:
                    puesto.save(update_fields=cambios)
            self.puestos[clave] = puesto

    def _crear_productos(self):
        for clave_puesto, lista in PRODUCTOS.items():
            puesto = self.puestos[clave_puesto]
            productos_puesto = []
            for nombre, cat, precio, stock, unidad, descripcion in lista:
                categoria = self.categorias[cat]
                # Regla 2: la categoría debe estar asignada al puesto.
                asignar_categoria(puesto=puesto, categoria=categoria)
                producto, _ = Producto.objects.get_or_create(
                    id_puesto=puesto,
                    nombre=nombre,
                    defaults={
                        "id_categoria": categoria,
                        "descripcion": descripcion,
                        "precio": Decimal(precio),
                        "stock": stock,
                        "unidad_medida": unidad,
                    },
                )
                productos_puesto.append(producto)
            self.productos[clave_puesto] = productos_puesto

    # ------------------------------------------------------------------
    # Direcciones
    # ------------------------------------------------------------------
    def _crear_direcciones(self):
        for comprador, (barrio, direccion, alias, referencia) in zip(
            self.compradores, DIRECCIONES, strict=False
        ):
            if Direccion.objects.filter(id_usuario=comprador, alias=alias).exists():
                self.direcciones[comprador.pk] = Direccion.objects.filter(
                    id_usuario=comprador, alias=alias
                ).first()
                continue
            registro = direcciones_services.crear_direccion(
                usuario=comprador,
                datos={
                    "alias": alias,
                    "direccion": f"{direccion}, Barrio {barrio}",
                    "referencia": referencia,
                    "latitud": LAT_BASE,
                    "longitud": LON_BASE,
                },
            )
            self.direcciones[comprador.pk] = registro

    # ------------------------------------------------------------------
    # Cupones
    # ------------------------------------------------------------------
    def _crear_cupones(self):
        admin = self.usuarios["admin"]
        for codigo, puesto_key, tipo, valor, minimo, tope, usos_total, usos_usuario in CUPONES:
            if Cupon.objects.filter(codigo=codigo).exists():
                self.cupones[codigo] = Cupon.objects.get(codigo=codigo)
                continue
            puesto = self.puestos[puesto_key] if puesto_key else None
            cupon = promos_services.crear_cupon(
                usuario=admin,
                datos={
                    "codigo": codigo,
                    "id_puesto": puesto,
                    "tipo_descuento": tipo,
                    "valor": Decimal(valor),
                    "monto_minimo_pedido": Decimal(minimo),
                    "tope_descuento": Decimal(tope) if tope else None,
                    "usos_totales": usos_total,
                    "usos_por_usuario": usos_usuario,
                    "activo": True,
                },
            )
            self.cupones[codigo] = cupon

    # ------------------------------------------------------------------
    # Pedidos (+ pagos + transiciones)
    # ------------------------------------------------------------------
    def _crear_pedidos(self):
        for (
            clave,
            comprador_idx,
            puesto_key,
            items,
            estado,
            tipo_entrega,
            con_pago,
            metodo,
            pago_aprobado,
            cupon_codigo,
        ) in PEDIDOS:
            self._crear_pedido(
                clave=clave,
                comprador=self.compradores[comprador_idx],
                puesto=self.puestos[puesto_key],
                productos=self.productos[puesto_key],
                items=items,
                estado=estado,
                tipo_entrega=tipo_entrega,
                con_pago=con_pago,
                metodo=metodo,
                pago_aprobado=pago_aprobado,
                cupon_codigo=cupon_codigo,
            )

    def _crear_pedido(
        self,
        *,
        clave,
        comprador,
        puesto,
        productos,
        items,
        estado,
        tipo_entrega,
        con_pago,
        metodo,
        pago_aprobado,
        cupon_codigo,
    ):
        marcador = f"[{clave}]"
        if Pedido.objects.filter(notas__startswith=marcador).exists():
            self.pedidos[clave] = Pedido.objects.filter(notas__startswith=marcador).first()
            return

        vendedor = puesto.id_vendedor
        datos = {
            "id_puesto": puesto,
            "tipo_entrega": tipo_entrega,
            "notas": f"{marcador} Pedido de demostración del mercado de Riohacha.",
            "items": [
                {"id_producto": productos[idx], "cantidad": cantidad} for idx, cantidad in items
            ],
        }
        if tipo_entrega == Pedido.TipoEntrega.DOMICILIO:
            datos["id_direccion"] = self.direcciones[comprador.pk]
        if cupon_codigo:
            datos["codigo_cupon"] = cupon_codigo

        # Cada pedido es atómico: o queda con su pago y su estado final, o no
        # queda. Así el comando es reanudable si la red se corta a mitad.
        with transaction.atomic():
            pedido = orders_services.crear_pedido(usuario=comprador, datos=datos)
            self.pedidos[clave] = pedido

            if con_pago:
                pago = pagos_services.crear_pago(
                    pedido=pedido,
                    usuario=comprador,
                    datos={"metodo_pago": metodo},
                )
                if pago_aprobado:
                    if metodo == Pago.MetodoPago.EFECTIVO:
                        pagos_services.confirmar_efectivo(pago=pago, usuario=vendedor, datos={})
                    else:
                        # Datos de demo: aprueba como lo haría la pasarela (simular_pago solo
                        # admite el método «simulado»).
                        pagos_services._aplicar_estado(
                            pago=pago,
                            destino=Pago.Estado.APROBADO,
                            referencia=f"seed-{pago.pk}",
                            origen="seed",
                        )

            self._avanzar_estado(
                pedido=pedido, estado=estado, vendedor=vendedor, comprador=comprador
            )

    def _avanzar_estado(self, *, pedido, estado, vendedor, comprador):
        """Recorre los estados válidos del tipo de entrega del pedido (ver ADR-009)."""
        if estado == "cancelado":
            orders_services.cancelar_pedido(pedido=pedido, usuario=comprador)
            return
        es_retiro = pedido.tipo_entrega == Pedido.TipoEntrega.RETIRO
        salida = "listo_para_recoger" if es_retiro else "en_camino"
        if estado in ("confirmado", "en_preparacion", salida, "entregado"):
            orders_services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        if estado in ("en_preparacion", salida, "entregado"):
            orders_services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
        if estado in (salida, "entregado"):
            if es_retiro:
                orders_services.marcar_listo_para_recoger(pedido=pedido, usuario=vendedor)
            else:
                orders_services.marcar_enviado(pedido=pedido, usuario=vendedor)
        if estado == "entregado":
            # Domicilio: lo confirma el comprador. Retiro: el vendedor entrega y cobra en mano.
            orders_services.marcar_entregado(
                pedido=pedido, usuario=vendedor if es_retiro else comprador
            )

    # ------------------------------------------------------------------
    # Reseñas
    # ------------------------------------------------------------------
    def _crear_resenas(self):
        for (
            comprador_idx,
            puesto_key,
            calificacion,
            comentario,
            pedido_clave,
            respuesta,
        ) in RESENAS:
            comprador = self.compradores[comprador_idx]
            puesto = self.puestos[puesto_key]
            if Resena.objects.filter(id_usuario=comprador, id_puesto=puesto).exists():
                continue
            pedido = self.pedidos.get(pedido_clave)
            resena = reviews_services.crear_resena(
                usuario=comprador,
                datos={
                    "id_puesto": puesto,
                    "id_pedido": pedido,
                    "calificacion": calificacion,
                    "comentario": comentario,
                },
            )
            if respuesta:
                reviews_services.responder_resena(
                    resena=resena,
                    usuario=puesto.id_vendedor,
                    datos={"respuesta": respuesta},
                )

    # ------------------------------------------------------------------
    # Notificaciones de bienvenida (además de las generadas por el flujo)
    # ------------------------------------------------------------------
    def _crear_notificaciones_extra(self):
        from apps.notifications import services as notif

        for comprador in self.compradores:
            if Notificacion.objects.filter(
                id_usuario=comprador, tipo=Notificacion.Tipo.GENERAL, titulo="¡Bienvenido!"
            ).exists():
                continue
            notif.crear_notificacion(
                usuario=comprador,
                tipo=Notificacion.Tipo.GENERAL,
                titulo="¡Bienvenido!",
                mensaje="Gracias por unirte a RioMarket, el mercado de Riohacha.",
            )

    # ------------------------------------------------------------------
    # Reporte
    # ------------------------------------------------------------------
    def _reportar(self):
        modelos = [
            ("Usuario", Usuario),
            ("Vendedor", Vendedor),
            ("Categoria", Categoria),
            ("Puesto", Puesto),
            ("PuestoCategoria", PuestoCategoria),
            ("Producto", Producto),
            ("Direccion", Direccion),
            ("Pedido", Pedido),
            ("ItemPedido", ItemPedido),
            ("Pago", Pago),
            ("Cupon", Cupon),
            ("UsoCupon", UsoCupon),
            ("Resena", Resena),
            ("Notificacion", Notificacion),
            ("RegistroAuditoria", RegistroAuditoria),
        ]
        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("  Conteo de registros por modelo"))
        self.stdout.write("  " + "-" * 34)
        total = 0
        for nombre, modelo in modelos:
            cantidad = modelo.objects.count()
            total += cantidad
            self.stdout.write(f"  {nombre:<22}{cantidad:>8}")
        self.stdout.write("  " + "-" * 34)
        self.stdout.write(self.style.MIGRATE_HEADING(f"  {'TOTAL':<22}{total:>8}"))
        return total
