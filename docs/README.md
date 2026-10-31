# Documentación de RioMarket

Índice de la documentación extendida. El README principal resume instalación,
stack, pruebas y despliegue.

## Visión general

- [Arquitectura](arquitectura.md): dependencias entre apps, ERD, flujo de
  estados y matriz de permisos por rol.
- [Diagramas](diagramas.md): secuencia del checkout y el pago, del retiro con
  «Entregar y cobrar», de apartar con plazo y del encargo; despliegue y estados
  del pedido (Mermaid).
- [Matriz de trazabilidad](trazabilidad.md): cada requisito con su pantalla, su
  endpoint y sus pruebas, generada desde [`requisitos.yml`](requisitos.yml) y
  verificada en el CI con `python scripts/trazabilidad.py --check`.
- [Despliegue](despliegue.md): Render, Supabase, límites del plan free y
  variables de producción.
- [Auditoría general (seguridad, rendimiento y calidad)](AUDITORIA.md): hallazgos, estado de
  cada uno y propuestas pendientes.
- [Auditoría y mantenimiento](MANTENIMIENTO.md): línea base, herramientas,
  dependencias, datos demo y decisiones de limpieza.
- [Rendimiento (Lighthouse antes/después)](rendimiento.md): método de medición,
  cifras y lo que no se pudo medir.
- [Alcance del frontend](alcance-frontend.md): encargo original y estado actual
  de la SPA.
- [Guion de presentación](PRESENTACION.md): demo de 5 minutos con las cuentas
  del seed, plan B y preguntas frecuentes.
- [Seguridad](../SEGURIDAD.md): controles, riesgos abiertos y checklist.
- [Política de seguridad](../SECURITY.md): cómo reportar una vulnerabilidad,
  controles y límites conocidos.
- [Registro de cambios](../CHANGELOG.md) y [cómo contribuir](../CONTRIBUTING.md)
  (incluye cómo publicar una versión).

## API

- [Ejemplos de API](api-ejemplos.md): flujo `curl` completo con autenticación
  por cookie, pedidos, pagos y errores.
- Swagger local: <http://127.0.0.1:8000/api/docs/>
- Esquema OpenAPI: <http://127.0.0.1:8000/api/schema/>

## Decisiones de arquitectura

- [ADR-001: enums y `choices`](ADR-001-enums.md)
- [ADR-002: media pública y privada](ADR-002-media-publica-y-privada.md)
- [ADR-003: pagos, montos y comisión](ADR-003-pagos.md)
- [ADR-004: direcciones y notificaciones](ADR-004-direcciones-y-notificaciones.md)
- [ADR-005: reputación y reseñas](ADR-005-reputacion-resenas.md)
- [ADR-006: promociones y cupones](ADR-006-promociones-cupones.md)
- [ADR-007: auditoría de acciones](ADR-007-auditoria.md)
- [ADR-008: almacenamiento de imágenes](ADR-008-almacenamiento-imagenes.md)
- [ADR-009: retiro en el puesto y pago al recoger](ADR-009-retiro-y-pago-al-recoger.md)
- [ADR-010: contacto por WhatsApp, mapa y app instalable](ADR-010-contacto-mapa-y-pwa.md)
- [ADR-011: rendimiento de la entrega y SEO](ADR-011-rendimiento-y-seo.md)
- [ADR-012: apartar con plazo y liberación perezosa del stock](ADR-012-apartar-con-plazo.md)
- [ADR-013: productos por encargo](ADR-013-productos-por-encargo.md)
- [ADR-014: panel de ventas](ADR-014-panel-de-ventas.md)

## Entrega

- [Guía de entrega](../entrega/LEEME_ENTREGA.md)
- [Flujo de prueba con curl](../entrega/flujo_prueba.curl.md)
- [Respaldo JSON](../entrega/datos_riomarket.json) *(histórico, anterior al RBAC)*
- [Respaldo SQL](../entrega/datos_riomarket.sql) *(histórico, anterior al RBAC)*
