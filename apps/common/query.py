"""Utilidades de consulta compartidas por los módulos (filtros y orden).

Viven en ``common`` para que catálogo, pedidos y las próximas apps usen el
mismo comportamiento sin importarse entre sí.
"""

from django.core.exceptions import ValidationError
from django.db.models import QuerySet


def parametro_entero(params, nombre: str) -> int | None:
    """Parsea un parámetro entero; entrada inválida → 400."""
    valor = params.get(nombre)
    if not valor:
        return None
    try:
        return int(valor)
    except (TypeError, ValueError) as exc:
        raise ValidationError({nombre: "Debe ser un número entero."}) from exc


def parametro_booleano(params, nombre: str) -> bool | None:
    valor = params.get(nombre)
    if valor in (None, ""):
        return None
    texto = str(valor).lower()
    if texto in ("1", "true", "si", "s"):
        return True
    if texto in ("0", "false", "no", "n"):
        return False
    raise ValidationError({nombre: "Debe ser true o false."})


def validar_estado_parametro(valor: str, opciones) -> None:
    if valor not in opciones:
        raise ValidationError({"estado": f"Estado inválido. Use uno de: {', '.join(opciones)}."})


def aplicar_ordenamiento(
    queryset: QuerySet, parametro: str | None, permitidos: tuple[str, ...]
) -> QuerySet:
    """Ordena si el valor está en la lista blanca; si no, lanza 400.

    Un ``order_by`` con valor arbitrario permitiría filtrar por columnas
    internas (p. ej. ``?ordering=password``) y fallar con 500 al no existir.
    """
    if not parametro:
        return queryset
    campos = [c.strip() for c in parametro.split(",") if c.strip()]
    invalidos = [c for c in campos if c not in permitidos]
    if invalidos:
        raise ValidationError(
            {
                "ordering": (
                    f"Valor no permitido: {', '.join(invalidos)}. "
                    f"Use uno de: {', '.join(permitidos)}."
                )
            }
        )
    return queryset.order_by(*campos)
