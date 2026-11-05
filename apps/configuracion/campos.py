"""Los ajustes de la plataforma que el administrador puede cambiar desde el panel.

Cada campo enlaza una columna de ``ConfiguracionPlataforma`` con el ajuste de ``settings`` que
reemplaza (el mismo nombre que lee ``apps.common.ajustes``). Los topes existen para que un error de
dedo (un 80 en vez de un 8) no se lleve la comisión de todo el mercado.
"""

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Campo:
    clave: str  # columna de ConfiguracionPlataforma
    ajuste: str  # nombre en settings
    etiqueta: str
    ayuda: str
    unidad: str  # "%" o "$"
    minimo: Decimal
    maximo: Decimal


CAMPOS = (
    Campo(
        clave="comision_porcentaje",
        ajuste="PLATFORM_COMMISSION_PERCENTAGE",
        etiqueta="Comisión de la plataforma",
        ayuda="Porcentaje que se descuenta al vendedor sobre la mercancía de cada pedido nuevo.",
        unidad="%",
        minimo=Decimal("0"),
        maximo=Decimal("50"),
    ),
    Campo(
        clave="tarifa_domicilio",
        ajuste="DOMICILIO_TARIFA_BASE",
        etiqueta="Tarifa de domicilio",
        ayuda="Lo que paga el comprador por cada pedido a domicilio nuevo; lo recibe el puesto.",
        unidad="$",
        minimo=Decimal("0"),
        maximo=Decimal("100000"),
    ),
    Campo(
        clave="limite_aviso",
        ajuste="COMISION_LIMITE_AVISO",
        etiqueta="Aviso por comisión pendiente",
        ayuda="Desde esta deuda de comisión en efectivo se le avisa al vendedor. 0 lo apaga.",
        unidad="$",
        minimo=Decimal("0"),
        maximo=Decimal("10000000"),
    ),
    Campo(
        clave="limite_bloqueo",
        ajuste="COMISION_LIMITE_BLOQUEO",
        etiqueta="Pausa por comisión pendiente",
        ayuda=(
            "Desde esta deuda sus puestos dejan de recibir pedidos nuevos (los que ya tiene "
            "siguen). 0 lo apaga."
        ),
        unidad="$",
        minimo=Decimal("0"),
        maximo=Decimal("10000000"),
    ),
)

POR_CLAVE = {c.clave: c for c in CAMPOS}
POR_AJUSTE = {c.ajuste: c for c in CAMPOS}
