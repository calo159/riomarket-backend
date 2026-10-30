# ADR-001: ENUM de PostgreSQL vs `choices` de Django

**Estado**: Aceptado (Fase 0)

## Decisión

Usar `models.TextChoices` de Django en los campos tipo ENUM, reforzados con
`CheckConstraint` a nivel de base de datos en los campos críticos del dominio
(rol, estado de pedido, tipo de entrega, etc.). **No** se usan los tipos
`ENUM` nativos de PostgreSQL.

## Contexto

El diseño de base de datos define 13 campos ENUM (rol, estado de usuario,
estado de verificación, estado de pedido, método de pago, etc.). PostgreSQL
ofrece tipos `ENUM` nativos que garantizan los valores a nivel de BD.

## Consecuencias

### A favor de `choices` de Django (lo elegido)

1. **Migraciones reversibles**: agregar un valor a un `ENUM` de PostgreSQL
   requiere `ALTER TYPE ... ADD VALUE`, que en PostgreSQL < 12 solo podía
   hacerse fuera de una transacción y Django no lo genera automáticamente
   (hay que escribir SQL crudo en la migración). `choices` cambia con una
   migración normal y reversible.
2. **Validación + documentación automáticas**: DRF y `drf-spectacular`
   leen `choices` y generan los `enum` del OpenAPI/Swagger sin código extra.
3. **Portabilidad de los tests**: la suite corre igual en PostgreSQL (dev/prod)
   y en SQLite si hace falta depurar localmente.
4. **Legibilidad del modelo**: `Usuario.Rol.VENDEDOR` se usa en permisos,
   servicios y factories sin consultas a `pg_type`.

### Contra/riesgos

- `choices` **no** crea restricción en la BD por sí solo (solo valida Django).
  Mitigación: añadir `CheckConstraint(condition=Q(campo__in=[...]))` en los
  campos donde el dato corrupto sería grave; ya está hecho para `rol`,
  `estado` de `Usuario`, y se hará igual para `Pedido`, `Pago`, etc.

## Decisión relacionada: `password_hash`

El campo `password_hash` del modelo lógico se implementa con el campo
`password` de `AbstractBaseUser`: ahí Django almacena el hash PBKDF2 (nunca
texto plano). Renombrarlo rompería `set_password`/`check_password`, el admin
y `django.contrib.auth`. Se documenta como equivalente 1:1.

## Nota: estado `listo_para_recoger` (ADR-009)

El `choices` y el `CheckConstraint` de `Pedido.estado` incluyen `listo_para_recoger`
(sustituye a `en_camino` en los pedidos de retiro). Es el ejemplo de la ventaja
elegida: agregar un valor fue una migración normal (más una migración de datos
reversible), sin `ALTER TYPE`. El campo pasó de 15 a 20 caracteres. Ver
[ADR-009](ADR-009-retiro-y-pago-al-recoger.md).
