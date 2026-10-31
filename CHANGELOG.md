# Registro de cambios

Todos los cambios notables de RioMarket se documentan en este archivo.

El formato sigue [Keep a Changelog 1.1](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
[versionado semántico](https://semver.org/lang/es/). Las fechas son las de unión a `main` (los números
`#N` son pull requests de [calo159/riomarket-backend](https://github.com/calo159/riomarket-backend));
lo anterior al PR #1 se hizo con commits directos y se resume por fases. El PR #9 se cerró sin unir.

## [Sin publicar]

### Añadido

- **Observabilidad mínima ([ADR-015](docs/ADR-015-observabilidad.md)).** Cada respuesta lleva
  `X-Request-ID` (se reutiliza el del cliente solo si son 8 a 64 letras, números o guiones; si no, se
  genera uno); en producción los registros salen en JSON de una línea con `request_id`, y cada petición
  deja un registro de acceso con método, ruta sin query string, estado, duración y número de usuario,
  sin cuerpos, cabeceras, cookies ni datos personales. `/api/health/` suma `version` (commit corto),
  `migraciones`, `almacenamiento_externo` y `hora_servidor` sin quitar `status` ni `database`.
- **Pruebas end-to-end por rol en el CI ([ADR-016](docs/ADR-016-pruebas-end-to-end.md)).** Trabajo
  `e2e` (solo en pull requests y en `main`) que levanta PostgreSQL, siembra los datos de demostración,
  construye el frontend y lo sirve desde Django con la configuración de producción. Cubre al comprador
  (retiro con pago al recoger y encargo, en celular), a la vendedora (de «Confirmar» a «Entregar y
  cobrar», aceptar un encargo y panel de ventas), al administrador (resumen, auditoría del sistema,
  usuarios y roles) y a una persona sin sesión (landing, tienda, mapa y créditos de fotos). Cada
  prueba usa su propio comprador del seed y limpia lo que crea; un reintento por prueba solo en el CI,
  con las reintentadas anotadas en el resumen; trazas, capturas y vídeo solo si falla (7 días).
- **Umbral de cobertura en el CI.** El backend falla bajo el 91 % (medido 94 % con ramas); el
  workflow ya revisa también el formato de `scripts/`.

### Cambiado

- `LOG_FORMAT` (opcional): `json` por defecto en producción, `texto` en desarrollo y pruebas.

## [1.0.0] - AAAA-MM-DD

La fecha se fija al etiquetar la versión (ver «Publicar una versión» en [CONTRIBUTING.md](CONTRIBUTING.md)).

### Añadido

- **Núcleo del marketplace (7–9 oct, commits directos).** API REST con Django 5 y DRF: registro e inicio
  de sesión con JWT, catálogo (puestos, categorías, productos e imágenes), verificación de vendedores,
  pedidos de un solo puesto con stock transaccional, pagos con pasarela de pruebas, direcciones,
  notificaciones, reseñas, cupones y auditoría; CI de GitHub Actions.
- **Datos de demostración (14 oct).** Comando `seed_masivo` con datos de Riohacha (usuarios, puestos,
  productos, pedidos, pagos, reseñas, notificaciones y auditoría) y respaldos en `entrega/`.
- **Aplicación web y despliegue (23–28 oct, #1).** SPA en React y TypeScript para comprador, vendedor y
  administrador; refresh de sesión en cookie HttpOnly; despliegue en Render con PostgreSQL y datos demo
  automáticos.
- **Entrega por roles y administración (#2).** Entrega con confirmación del comprador, reporte «No me ha
  llegado», acciones permitidas por rol y estado en cada pedido, app de administración (usuarios,
  moderación de puestos y productos, resumen) y menú dinámico por rol.
- **RBAC con roles y recursos (#3).** Roles, recursos y permisos efectivos gobernados por el
  administrador, con candados anti-bloqueo y anti-escalada, y registro de auditoría de cada decisión.
- **Retiro en el puesto con pago al recoger (#16).** Estado «listo para recoger» solo para retiros,
  confirmación de un retiro con efectivo sin cobro previo y «Entregar y cobrar» en una sola operación
  ([ADR-009](docs/ADR-009-retiro-y-pago-al-recoger.md)).
- **Contacto, mapa, volver a pedir y app instalable (#17).** Botón «Escribir por WhatsApp» por puesto
  (apagado por defecto), mapa público `/mapa` con OpenStreetMap, «Volver a pedir» y manifiesto con página
  sin conexión ([ADR-010](docs/ADR-010-contacto-mapa-y-pwa.md)).
- **Rendimiento y SEO (#18).** Build comprimido (Brotli y gzip) con caché inmutable para archivos con
  hash, miniaturas de las fotos, precarga de datos, `robots.txt`, `sitemap.xml` y metaetiquetas por ruta;
  Lighthouse móvil sube de 79 a 97 (`/`), de 67 a 94 (`/tienda`) y de 70 a 91 (`/catalogo`)
  ([ADR-011](docs/ADR-011-rendimiento-y-seo.md), [medición](docs/rendimiento.md)).
- **Apartar con plazo (#20).** Un retiro que nadie confirma o recoge a tiempo se cancela solo y devuelve
  stock, cupón y pago; el vendedor puede dar más tiempo hasta dos veces; barrido perezoso sin cron y
  comando `cancelar_pedidos_vencidos` ([ADR-012](docs/ADR-012-apartar-con-plazo.md)).
- **Productos por encargo (#21).** Tortas, pudines y similares sin stock: tiempo de preparación, detalles
  del comprador y fecha pedida; «Aceptar encargo» como confirmación
  ([ADR-013](docs/ADR-013-productos-por-encargo.md)).
- **Panel de ventas (#22).** `GET /api/payments/ventas/` y pantalla `/vendedor/ventas` (y sección en
  `/admin`) con ventas por día, ingreso neto, ticket promedio, lo más vendido y pedidos por estado
  ([ADR-014](docs/ADR-014-panel-de-ventas.md)).
- **Documentación de ingeniería.** Matriz de trazabilidad requisito → pantalla → endpoint → prueba,
  verificada en el CI ([trazabilidad](docs/trazabilidad.md)), diagramas de secuencia y despliegue
  ([diagramas](docs/diagramas.md)), guion de demostración de 5 minutos
  ([presentación](docs/PRESENTACION.md)), `CHANGELOG.md`, `SECURITY.md` y `CONTRIBUTING.md`.

### Cambiado

- **Interfaz estilo marketplace (#10).** Rediseño de todas las pantallas del comprador, vendedor y
  administrador con encabezado con buscador, tarjetas y barra inferior en el celular; la lógica y los
  permisos no cambian.
- **Landing y tienda (#12, #14, #15).** La portada `/` es una landing propia y la tienda pasa a `/tienda`
  (`/inicio` redirige); categorías y accesos rápidos con fotos reales en lugar de iconos.
- **Optimización según la auditoría (#7).** Menos consultas en resúmenes y reordenamiento de imágenes,
  caché por petición de los permisos y mejoras del bundle y de la caché de datos del frontend.
- **Auditoría y pendientes (#3, #5).** Límite de intentos compartido (con Redis) y soporte de `NUM_PROXIES`,
  fotos de cédula en un bucket privado opcional, webhook de pagos con validación de monto y fecha, y
  pruebas de la suite contra PostgreSQL en el CI.
- **Archivos locales (#4).** `.claude/settings.json` deja de versionarse.
- **Sesiones (aviso de #18).** La landing ya no espera al servidor gracias a una cookie de pista de
  sesión (`rm_hay_sesion`, sin secretos). Las sesiones iniciadas antes de este cambio aparecen cerradas
  **una sola vez**: la persona debe volver a iniciar sesión.

### Corregido

- **Caché en memoria sin Redis (#8).** La caché del límite de intentos en base de datos añadía unas 6
  consultas por petición y hacía lentas las lecturas con una base remota; sin `REDIS_URL` se vuelve a la
  memoria del proceso.
- **Fotos demo (#11).** El seed recrea las fotos cuando Render borra el disco efímero.
- **Fotos del almacén externo (#13).** La política de seguridad de contenido (CSP) permite las imágenes
  servidas desde el almacenamiento externo configurado.
- **Contraste en la landing (#19).** Los títulos del seguimiento de pedido cumplen el contraste AA.

### Seguridad

- **Auditoría general (#3, #5).** 91 hallazgos revisados en [la auditoría](docs/AUDITORIA.md); entre los
  corregidos: reposición doble de stock al cancelar, cupón sin liberar, token de recuperación escrito en los
  logs, comparación de origen por prefijo y autoaprobación de pagos (limitada a los pagos simulados).
- **Dependencias (#6, #19).** Se cerraron las 20 alertas de Dependabot de aquel momento (vite, vitest,
  react-router, zod y otras) y la alerta alta de `follow-redirects`. Hoy `npm audit` solo reporta avisos
  moderados de herramientas de desarrollo (0 en dependencias de producción) y `pip-audit` no reporta
  vulnerabilidades. Ver [SECURITY.md](SECURITY.md).

[Sin publicar]: https://github.com/calo159/riomarket-backend/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/calo159/riomarket-backend/releases/tag/v1.0.0
