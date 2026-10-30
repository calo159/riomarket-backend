"""Reglas de negocio de la gestión de roles y recursos.

Candados anti-bloqueo: los roles y recursos de sistema no se eliminan ni se
desactivan, y el rol "administrador" conserva los recursos que permiten seguir
administrando. Anti-escalada: quien no es administrador base no puede cambiar
los recursos de un rol que él mismo tiene.
"""

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import Count, OuterRef, Subquery
from django.db.models.functions import Coalesce, Lower

from apps.audit.models import RegistroAuditoria
from apps.audit.services import registrar
from apps.common.motivo import validar_motivo
from apps.rbac.acceso import recursos_de_usuario
from apps.rbac.defaults import ADMINISTRADOR, RECURSOS_OBLIGATORIOS_ADMIN
from apps.rbac.models import Recurso, Rol, RolRecurso, UsuarioRol

NOMBRE_MIN, NOMBRE_MAX = 3, 40
CAMPOS_FIJOS_RECURSO_SISTEMA = ("codigo", "ruta", "ambito", "es_publico", "activo")


def _auditar(actor, accion, entidad, pk, **detalle) -> None:
    registrar(usuario=actor, accion=accion, entidad=entidad, id_entidad=pk, detalle=detalle)


# ----------------------------------------------------------------------
# Roles
# ----------------------------------------------------------------------
def roles_con_conteos():
    def _contar(modelo):
        cuenta = (
            modelo.objects.filter(id_rol=OuterRef("pk"))
            .order_by()
            .values("id_rol")
            .annotate(total=Count("pk"))
            .values("total")
        )
        return Coalesce(Subquery(cuenta), 0)

    # Dos joins con Count multiplican las filas (usuarios x recursos): subconsultas no.
    return Rol.objects.annotate(
        total_usuarios=_contar(UsuarioRol), total_recursos=_contar(RolRecurso)
    ).prefetch_related("vinculos")


def _nombre_rol(nombre: str, excluir_pk=None) -> str:
    nombre = " ".join((nombre or "").split())
    if not NOMBRE_MIN <= len(nombre) <= NOMBRE_MAX:
        raise ValidationError(
            {"nombre": f"El nombre debe tener entre {NOMBRE_MIN} y {NOMBRE_MAX} caracteres."}
        )
    repetido = Rol.objects.annotate(n=Lower("nombre")).filter(n=nombre.lower())
    if excluir_pk is not None:
        repetido = repetido.exclude(pk=excluir_pk)
    if repetido.exists():
        raise ValidationError({"nombre": "Ya existe un rol con ese nombre."})
    return nombre


def crear_rol(*, actor, nombre: str, descripcion: str = "", activo: bool = True) -> Rol:
    nombre = _nombre_rol(nombre)
    rol = Rol.objects.create(nombre=nombre, descripcion=descripcion.strip(), activo=activo)
    _auditar(actor, RegistroAuditoria.Accion.CREAR, "rol", rol.pk, campo="rol", de="", a=nombre)
    return rol


def actualizar_rol(*, rol: Rol, actor, datos: dict) -> Rol:
    if rol.es_sistema:
        bloqueados = [c for c in ("nombre", "activo") if c in datos and datos[c] != getattr(rol, c)]
        if bloqueados:
            raise ValidationError(
                {"rol": "Los roles de sistema solo permiten editar la descripción."}
            )
    cambios = {}
    if "nombre" in datos and datos["nombre"] != rol.nombre:
        cambios["nombre"] = _nombre_rol(datos["nombre"], excluir_pk=rol.pk)
    if "descripcion" in datos and datos["descripcion"].strip() != rol.descripcion:
        cambios["descripcion"] = datos["descripcion"].strip()
    if "activo" in datos and datos["activo"] != rol.activo:
        cambios["activo"] = datos["activo"]
    with transaction.atomic():
        for campo, nuevo in cambios.items():
            _auditar(
                actor,
                RegistroAuditoria.Accion.ACTUALIZAR,
                "rol",
                rol.pk,
                campo=campo,
                de=str(getattr(rol, campo)),
                a=str(nuevo),
            )
            setattr(rol, campo, nuevo)
        if cambios:
            rol.save(update_fields=list(cambios))
    return rol


def eliminar_rol(*, rol: Rol, actor) -> None:
    if rol.es_sistema:
        raise ValidationError({"rol": "Los roles de sistema no se pueden eliminar."})
    usuarios = UsuarioRol.objects.filter(id_rol=rol).count()
    if usuarios:
        raise ValidationError(
            {
                "rol": (
                    f"El rol tiene {usuarios} usuario(s) asignado(s). "
                    "Quítaselo primero o desactívalo en lugar de eliminarlo."
                )
            }
        )
    pk, nombre = rol.pk, rol.nombre
    rol.delete()
    _auditar(actor, RegistroAuditoria.Accion.ELIMINAR, "rol", pk, campo="rol", de=nombre, a="")


def fijar_recursos_de_rol(*, rol: Rol, actor, recursos_ids: list[int], motivo: str) -> Rol:
    motivo = validar_motivo(motivo)
    if (
        not actor.es_administrador
        and UsuarioRol.objects.filter(id_usuario=actor, id_rol=rol).exists()
    ):
        raise PermissionDenied("No puedes modificar los recursos de un rol que tú mismo tienes.")

    ids = set(recursos_ids)
    recursos = list(Recurso.objects.filter(pk__in=ids))
    if len(recursos) != len(ids):
        raise ValidationError({"recursos": "Alguno de los recursos indicados no existe."})
    if not actor.es_administrador:
        # Anti-escalada: quien no es administrador base no toca los roles de sistema (afectarían
        # a todos sus usuarios) ni entrega recursos que él mismo no tiene.
        if rol.es_sistema:
            raise PermissionDenied("Solo un administrador puede modificar los roles de sistema.")
        propios = recursos_de_usuario(actor)
        ajenos = sorted(r.codigo for r in recursos if r.codigo not in propios)
        if ajenos:
            raise PermissionDenied(
                "No puedes otorgar recursos que tú no tienes: " + ", ".join(ajenos) + "."
            )
    if rol.es_sistema and rol.nombre == ADMINISTRADOR:
        faltan = set(RECURSOS_OBLIGATORIOS_ADMIN) - {r.codigo for r in recursos}
        if faltan:
            raise ValidationError(
                {
                    "recursos": (
                        "El rol administrador no puede perder: " + ", ".join(sorted(faltan)) + "."
                    )
                }
            )

    with transaction.atomic():
        actuales = {v.id_recurso.codigo: v for v in rol.vinculos.select_related("id_recurso")}
        nuevos = {r.codigo: r for r in recursos}
        RolRecurso.objects.filter(
            pk__in=[v.pk for c, v in actuales.items() if c not in nuevos]
        ).delete()
        RolRecurso.objects.bulk_create(
            [RolRecurso(id_rol=rol, id_recurso=r) for c, r in nuevos.items() if c not in actuales]
        )
    if set(actuales) != set(nuevos):
        _auditar(
            actor,
            RegistroAuditoria.Accion.ACTUALIZAR,
            "rol",
            rol.pk,
            campo="recursos",
            de=", ".join(sorted(actuales)),
            a=", ".join(sorted(nuevos)),
            motivo=motivo,
        )
    return rol


# ----------------------------------------------------------------------
# Recursos
# ----------------------------------------------------------------------
def crear_recurso(*, actor, datos: dict) -> Recurso:
    recurso = Recurso.objects.create(**datos, es_sistema=False)
    _auditar(
        actor,
        RegistroAuditoria.Accion.CREAR,
        "recurso",
        recurso.pk,
        campo="recurso",
        de="",
        a=recurso.codigo,
    )
    return recurso


def actualizar_recurso(*, recurso: Recurso, actor, datos: dict) -> Recurso:
    cambios = {c: v for c, v in datos.items() if getattr(recurso, c) != v}
    if recurso.es_sistema:
        bloqueados = [c for c in CAMPOS_FIJOS_RECURSO_SISTEMA if c in cambios]
        if bloqueados:
            raise ValidationError(
                {
                    "recurso": (
                        "En un recurso de sistema no se puede cambiar: "
                        + ", ".join(bloqueados)
                        + "."
                    )
                }
            )
    with transaction.atomic():
        for campo, nuevo in cambios.items():
            _auditar(
                actor,
                RegistroAuditoria.Accion.ACTUALIZAR,
                "recurso",
                recurso.pk,
                campo=campo,
                de=str(getattr(recurso, campo)),
                a=str(nuevo),
            )
            setattr(recurso, campo, nuevo)
        if cambios:
            recurso.save(update_fields=list(cambios))
    return recurso


def eliminar_recurso(*, recurso: Recurso, actor) -> int:
    """Elimina un recurso personalizado y sus vínculos; devuelve los roles afectados."""
    if recurso.es_sistema:
        raise ValidationError({"recurso": "Los recursos de sistema no se pueden eliminar."})
    afectados = RolRecurso.objects.filter(id_recurso=recurso).count()
    pk, codigo = recurso.pk, recurso.codigo
    recurso.delete()
    _auditar(
        actor,
        RegistroAuditoria.Accion.ELIMINAR,
        "recurso",
        pk,
        campo="recurso",
        de=codigo,
        a="",
        roles_afectados=afectados,
    )
    return afectados
