"""Añade el recurso ``vendedor.ventas`` (panel de ventas, ADR-014) y lo asigna al rol vendedor.

Idempotente: ``sembrar`` solo crea lo que falta (si ya existe un recurso con ese código, no lo
toca ni re-vincula roles que el administrador haya quitado). Además corre un lugar el orden de
los recursos del vendedor que van después, pero solo si siguen en su valor por defecto anterior
(un orden que el administrador ya cambió se respeta).
"""

from django.db import migrations

from apps.rbac.defaults import sembrar

# código -> (orden anterior, orden nuevo)
CORRIMIENTO = {
    "vendedor.verificacion": (2, 3),
    "vendedor.puestos": (3, 4),
    "vendedor.productos": (4, 5),
    "vendedor.pedidos": (5, 6),
    "vendedor.cupones": (6, 7),
    "vendedor.resenas": (7, 8),
}


def agregar_ventas(apps, schema_editor):
    Rol = apps.get_model("rbac", "Rol")
    Recurso = apps.get_model("rbac", "Recurso")
    RolRecurso = apps.get_model("rbac", "RolRecurso")
    nuevo = not Recurso.objects.filter(codigo="vendedor.ventas").exists()
    sembrar(Rol, Recurso, RolRecurso)
    if nuevo:
        for codigo, (antes, despues) in CORRIMIENTO.items():
            Recurso.objects.filter(codigo=codigo, orden=antes).update(orden=despues)


def quitar_ventas(apps, schema_editor):
    Recurso = apps.get_model("rbac", "Recurso")
    for codigo, (antes, despues) in CORRIMIENTO.items():
        Recurso.objects.filter(codigo=codigo, orden=despues).update(orden=antes)
    Recurso.objects.filter(codigo="vendedor.ventas", es_sistema=True).delete()


class Migration(migrations.Migration):
    dependencies = [("rbac", "0002_sembrar_rbac")]

    operations = [migrations.RunPython(agregar_ventas, quitar_ventas)]
