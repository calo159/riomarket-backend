# Seguridad de RioMarket

Resumen de los controles implementados y de los riesgos que siguen abiertos en
la entrega académica. No sustituye una revisión de seguridad profesional.

## Autenticación y sesión

- **Access token JWT** de 15 minutos (configurable con `JWT_ACCESS_MINUTES`),
  enviado como `Authorization: Bearer`. La SPA lo mantiene solo en memoria.
- **Refresh token** de 7 días (configurable con `JWT_REFRESH_DAYS`) en la cookie
  `rm_refresh`: `HttpOnly`, `SameSite=Strict`, `Secure` cuando `DEBUG=False` y
  `Path=/api/auth/`.
- El refresh **rota** en cada uso y el anterior se agrega a la blacklist de
  SimpleJWT. El logout también lo blacklistea.
- Las rutas de refresh y logout exigen `X-Requested-With: XMLHttpRequest` o un
  origen permitido (`CSRF_TRUSTED_ORIGINS`/`CORS_ALLOWED_ORIGINS`). Esto reduce
  peticiones CSRF contra la cookie.
- La API no acepta el refresh en el cuerpo del login; no se expone al
  `localStorage` ni al JavaScript de la SPA.
- Si el refresh falla, el frontend limpia la sesión y redirige a
  `/login?expirada=1`. La autorización definitiva siempre es del backend.

## Autorización

- Roles en `Usuario.rol`: comprador, vendedor y administrador.
- Permisos DRF reutilizables en `apps/common/permissions.py`:
  `EsComprador`, `EsVendedor`, `EsVendedorAprobado`, `EsAdministrador` y
  `EsDuenoOAdmin` (este último valida la cadena de propiedad del objeto).
- Un vendedor sin verificación aprobada no puede publicar. La foto de cédula solo
  se sirve al administrador mediante una vista protegida.
- El frontend oculta rutas y acciones, pero no es una frontera de seguridad.
- La matriz por módulo está en
  [`docs/arquitectura.md`](docs/arquitectura.md#matriz-de-permisos-por-rol).

## Protección de datos

- La cédula del vendedor se guarda **cifrada con Fernet** (`FERNET_KEY`) y se
  compara con una **huella HMAC-SHA256** con `unique=True`, para detectar
  duplicados sin descifrar.
- `FERNET_KEY` es obligatoria cuando `DEBUG=False`; el arranque falla si falta.
- La foto de cédula se guarda en `PRIVATE_MEDIA_ROOT`, fuera de `MEDIA_ROOT`, y
  nunca se sirve con `static()`. La vista de descarga exige rol administrador.
- Las imágenes se validan con Pillow (MIME real, no solo extensión), con tamaño
  máximo (`MAX_IMAGE_SIZE`, 2 MB por defecto) y nombre saneado a UUID.
- No se registran contraseñas, tokens ni contenido de cédulas en logs.

## Cabeceras y transporte

En producción (`config/settings/prod.py` y `SecurityHeadersMiddleware`):

- Redirección HTTPS y HSTS de un año con `includeSubDomains` y `preload`.
- `SESSION_COOKIE_SECURE` y `CSRF_COOKIE_SECURE`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy` sin
  cámara, micrófono ni geolocalización.
- `Content-Security-Policy` estricta para la app y la API
  (`default-src 'self'`, `frame-ancestors 'none'`). Swagger y el admin de Django
  tienen excepciones acotadas porque usan scripts/CDN.
- El health check interno de Render queda exento de la redirección HTTPS.

## Límites de uso y errores

- Throttling de DRF: 60/min anónimo, 300/min autenticado, 10/min en login y
  registro, 20/min en verificación y 60/min en pagos.
- Los errores usan un envoltorio uniforme sin trazas internas en producción.
- La auditoría registra acciones sensibles (usuario, acción, entidad e IP) y es
  de solo lectura para el administrador. Es *best-effort*: un fallo de auditoría
  no revierte la operación principal.

## Pagos

- Solo existe `PasarelaSandbox`. El endpoint `simular` y el método `simulado`
  están bloqueados si `PAYMENTS_SANDBOX_ENABLED=False`.
- El webhook sandbox valida una firma HMAC-SHA256 con
  `PAYMENTS_WEBHOOK_SECRET`; sin secreto o sin firma se rechaza.
- No hay integración con una pasarela real, cobro con tarjeta ni conciliación
  bancaria. No debe presentarse como producción.

## Dependencias

- Backend: `pip-audit -r requirements.txt` no reporta vulnerabilidades conocidas
  tras actualizar Django 5.2.17, DRF 3.18.2 y Pillow 13.0.0.
- Frontend: quedan avisos de herramientas de desarrollo (`vitest`, `vite`,
  `tinypool`) y de `react-router`/`zod` que exigen saltos mayores. Se actualizaron
  los parches compatibles (`react-router-dom` 6.30.6 y `postcss` 8.5.31); el
  detalle y la decisión están en [`docs/MANTENIMIENTO.md`](docs/MANTENIMIENTO.md).
- `npm audit` debe revisarse de nuevo antes de una entrega o despliegue real.

## Riesgos abiertos

- **`.env` versionado**: contiene credenciales reales de Supabase y el repositorio
  es público. Rotar la contraseña o hacer el repositorio privado después de la
  entrega. No reutilizar esas credenciales en otro entorno.
- **Plan free de Render**: la base caduca a los 30 días, el servicio se duerme y
  el disco es efímero; las imágenes pueden perderse.
- **Sin MFA** para administradores y sin política de rotación de contraseñas.
- **Throttling en memoria** si no se configura `REDIS_URL`: con varios workers,
  los límites no son globales.
- **Sin retención/archivado** de auditoría; la tabla crece con cada mutación.
- **Sin SMTP real** configurado: el correo es opcional y la demo funciona in-app.
- **Sin LICENSE**: el dueño debe elegir una antes de publicar el repositorio.

## Checklist antes de exponerlo

1. Rotar `SECRET_KEY`, `FERNET_KEY`, `DATABASE_URL` y cualquier credencial de
   `.env`; no reutilizar las de la entrega.
2. Poner `DEBUG=False`, `PAYMENTS_SANDBOX_ENABLED=False` y configurar
   `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` y `CORS_ALLOWED_ORIGINS` reales.
3. Servir todo por HTTPS y mantener HSTS/cookies seguras.
4. Configurar `REDIS_URL` si habrá más de un worker.
5. Revisar `pip-audit` y `npm audit`; planear los saltos mayores pendientes.
6. Probar el flujo de verificación y comprobar que la cédula no es accesible sin
   rol administrador.
7. Definir respaldo de la base y retención de auditoría.
