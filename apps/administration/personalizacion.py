"""Personalización del sitio desde el panel (ADR-024): nombre, textos, contacto y color de la marca.

Es lo que permite que quien compre el proyecto lo vuelva suyo sin tocar código. Solo lo toca quien
tiene el recurso ``admin.personalizacion`` (el administrador) y cada cambio deja su registro de
auditoría con el valor de antes y el de después.
"""

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.audit.services import registrar
from apps.configuracion import lectura
from apps.configuracion.models import PersonalizacionSitio
from apps.configuracion.sitio import CAMPOS, PALETAS, POR_CLAVE, limpiar, resolver_defectos


def personalizacion_actual() -> dict:
    """Los campos agrupados con su valor vigente, el de por defecto y si se cambió."""
    fila = PersonalizacionSitio.objects.filter(pk=1).first()
    propios = {c.clave: (getattr(fila, c.clave) if fila else "") for c in CAMPOS}
    defectos = resolver_defectos(propios)
    grupos: dict[str, list] = {}
    for campo in CAMPOS:
        propio = propios[campo.clave]
        grupos.setdefault(campo.grupo, []).append(
            {
                "clave": campo.clave,
                "etiqueta": campo.etiqueta,
                "ayuda": campo.ayuda,
                "tipo": campo.tipo,
                "largo": campo.largo,
                "valor": propio or defectos[campo.clave],
                "propio": propio,
                "defecto": defectos[campo.clave],
                "plantilla": campo.defecto,
                "personalizado": bool(propio),
            }
        )
    return {
        "grupos": [{"nombre": nombre, "campos": campos} for nombre, campos in grupos.items()],
        "paletas": [{"clave": k, "etiqueta": v[0], "color": v[1]} for k, v in PALETAS.items()],
        "actualizado": fila.fecha_actualizacion if fila else None,
    }


def actualizar_personalizacion(*, actor, valores: dict) -> dict:
    """Fija los campos enviados; vacío o ``null`` borra el propio y vuelve el de por defecto."""
    desconocidos = [k for k in valores if k not in POR_CLAVE]
    if desconocidos:
        raise ValidationError({"valores": f"Campo desconocido: {', '.join(desconocidos)}."})
    if not valores:
        raise ValidationError({"valores": "No cambiaste nada."})

    errores: dict[str, str] = {}
    nuevos: dict[str, str] = {}
    for clave, bruto in valores.items():
        try:
            nuevos[clave] = limpiar(POR_CLAVE[clave], bruto)
        except ValueError as error:
            errores[clave] = str(error)
    if errores:
        raise ValidationError(errores)

    with transaction.atomic():
        fila = PersonalizacionSitio.objects.select_for_update().get_or_create(pk=1)[0]
        # Los de por defecto que nombran la ciudad o la marca se calculan con lo que quedaría.
        quedaria = {c.clave: nuevos.get(c.clave, getattr(fila, c.clave)) for c in CAMPOS}
        defectos = resolver_defectos(quedaria)
        antes_defectos = resolver_defectos({c.clave: getattr(fila, c.clave) for c in CAMPOS})
        cambios = []
        for clave, nuevo in nuevos.items():
            antes = getattr(fila, clave)
            # Escribir justo el valor de por defecto equivale a no tener valor propio.
            if nuevo == defectos[clave]:
                nuevo = ""
            if antes == nuevo:
                continue
            cambios.append((POR_CLAVE[clave], antes, nuevo, antes_defectos[clave], defectos[clave]))
            setattr(fila, clave, nuevo)
        if not cambios:
            raise ValidationError({"valores": "No cambiaste nada."})
        fila.save()
        for campo, antes, nuevo, defecto_antes, defecto_despues in cambios:
            registrar(
                usuario=actor,
                accion="actualizar",
                entidad="personalizacion",
                id_entidad=fila.pk,
                detalle={
                    "campo": campo.etiqueta,
                    "de": antes or f"(por defecto) {defecto_antes}",
                    "a": nuevo or f"(por defecto) {defecto_despues}",
                },
            )
    lectura.invalidar_sitio()
    return personalizacion_actual()
