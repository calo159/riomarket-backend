# ADR-007: Auditoría de acciones

**Estado**: Aceptado (Fase 6c)

## Contexto

Faltaba trazabilidad de quién hizo qué en las operaciones sensibles (crear
pedidos, avanzar estados, cobrar/reembolsar pagos, gestionar cupones y
responder reseñas). Se necesitaba un rastro consultable sin acoplar el esquema
de la auditoría a cada módulo.

## Decisiones

1. **App `apps/audit` con `RegistroAuditoria`**: `id_usuario`
   (`SET_NULL`, la acción sobrevive al borrado de la cuenta), `accion` (enum),
   `entidad` + `id_entidad` (referencia genérica, sin FK dura),
   `detalle` (`JSONField`), `direccion_ip`, `fecha_creacion`. Índices por
   `(entidad, id_entidad)`, `accion` y `fecha_creacion`.

2. **Registro best-effort**: `services.registrar(...)` captura cualquier
   excepción, la registra en el log y devuelve `None`; la acción de negocio
   **nunca** se rompe por un fallo de auditoría (mismo criterio que las
   notificaciones). La IP se toma de `X-Forwarded-For` (primer valor) o
   `REMOTE_ADDR`.

3. **Hooks explícitos en los services** (no señales automáticas): pedidos
   (`crear`, `transicion`), pagos (`crear`, `aprobar`/`rechazar`/`reembolsar`/
   `anular` mapeados desde el estado destino), cupones (`crear`/`actualizar`/
   `eliminar`/`usar_cupon`) y reseñas (`crear`/`actualizar`/`responder`/
   `eliminar`). Se usan imports diferidos para no crear ciclos.

4. **Lectura solo para el admin**: `GET /api/audit/registros/` con
   `IsAuthenticated` + `exigir_admin` en el queryset (anónimo 401, autenticado
   no-admin 403). Filtros: `entidad`, `accion`, `usuario`, `id_entidad`,
   `desde`, `hasta`; ordenamiento whitelisted. El admin de Django es de solo
   lectura (`has_add_permission = False`).

## Consecuencias

- Cobertura en `apps/audit/tests/test_auditoria.py` (servicio, visibilidad,
  filtros, endpoint y hooks de pedido/pago/cupón).
- La auditoría crece con cada mutación; en producción conviene un job de
  retención/archivado (fuera del alcance de esta fase).

## Integración continua (Fase 6d)

`.github/workflows/ci.yml` corre en cada push/PR sobre `ubuntu-latest` con
PostgreSQL 16 de servicio y Python 3.12:

1. `ruff check` + `ruff format --check`
2. `python manage.py makemigrations --check --dry-run`
3. `pytest -q`
4. `python manage.py spectacular --file schema.yaml --validate`
