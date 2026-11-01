# Política de seguridad

Este documento dice cómo reportar una vulnerabilidad en RioMarket, qué controles existen y qué límites
se conocen y se aceptan. El detalle técnico de cada control está en [SEGURIDAD.md](SEGURIDAD.md) y los
hallazgos de la revisión general, en [docs/AUDITORIA.md](docs/AUDITORIA.md).

## Versiones con soporte

| Versión | Soporte |
| --- | --- |
| `1.x` (rama `main`) | Sí: las correcciones de seguridad se aplican aquí |
| Anteriores a `1.0.0` | No |

## Cómo reportar una vulnerabilidad

**No abra un issue público.** Use el aviso privado de GitHub:
[Security → Report a vulnerability](https://github.com/calo159/riomarket-backend/security/advisories/new)
(el repositorio tiene activado el reporte privado de vulnerabilidades).

Incluya, en lo posible:

- qué falla y qué permite hacer (impacto);
- los pasos para reproducirlo (petición, ruta, cuenta o rol usado);
- la versión o el commit, y si ocurre en local o en la demo publicada;
- cualquier prueba de concepto, sin datos reales de terceras personas.

Tiempo de respuesta orientativo: se intenta acusar recibo en pocos días y dar una primera evaluación en
un par de semanas. Es un proyecto académico mantenido por una persona: **no hay acuerdo de nivel de
servicio**. Se agradece la divulgación coordinada: espere la corrección antes de publicar el detalle.

### Qué no se considera una vulnerabilidad

- La demo pública usa **datos ficticios** y una **contraseña demo pública** (`RioMarket2026!`, escrita en
  el README) para las cuentas del seed, que se reaplica en cada arranque mientras `SEED_DEMO=true`.
- Los pagos son un **sandbox**: no mueven dinero real y el comprador puede simularlos a propósito.
- Lo que figure en «Límites conocidos» más abajo.

## Controles implementados

Cada línea se puede comprobar en el código y en su prueba (ver [la matriz de trazabilidad](docs/trazabilidad.md),
requisitos `RNF-01` y `RNF-02`).

- **Sesión:** acceso JWT de 15 minutos, solo en memoria del navegador; refresh en cookie `HttpOnly`,
  `SameSite=Strict`, `Secure` fuera de desarrollo y `Path=/api/auth/`; el refresh rota y el anterior queda
  en lista negra; renovar y cerrar sesión exigen la cabecera `X-Requested-With` u origen exacto permitido.
- **Autorización (RBAC):** roles comprador, vendedor y administrador, más roles y recursos configurables
  con candados contra bloqueo y contra escalada de privilegios; el backend es la autoridad y el
  frontend solo oculta lo no permitido. Un vendedor no verificado no publica ni cobra.
- **Auditoría:** las acciones sensibles (pedidos, pagos, cupones, decisiones del administrador y las del
  sistema, como los vencimientos) quedan en un registro de solo lectura para el administrador.
- **Límite de intentos (throttling):** 240/min anónimo, 600/min autenticado, 10/min en inicio de sesión y
  registro, 20/min en verificación y 60/min en pagos (configurables por entorno). Sin `REDIS_URL` el
  contador es por proceso.
- **Cabeceras:** `Content-Security-Policy` estricta (`default-src 'self'`, `frame-ancestors 'none'`, con
  excepciones acotadas para Swagger y el admin de Django), HSTS de un año, `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy` y `Permissions-Policy` en producción.
- **Datos sensibles:** la cédula del vendedor se guarda cifrada con Fernet y se compara con una huella
  HMAC-SHA256; su foto vive fuera de la carpeta pública (o en un bucket privado) y solo la sirve una vista
  autorizada al administrador. `FERNET_KEY` es obligatoria con `DEBUG=False`.
- **Archivos subidos:** se validan por contenido real, tamaño y dimensiones, y se renombran.
- **Pagos:** el endpoint de simulación solo actúa sobre pagos simulados y se apaga con
  `PAYMENTS_SANDBOX_ENABLED=False`; el webhook valida firma HMAC, monto y ventana de tiempo.
- **Dependencias y código:** análisis estático con **CodeQL** (configuración predeterminada de GitHub
  para Python, JavaScript/TypeScript y Actions, con ejecución semanal), alertas de **Dependabot**
  activadas y revisión manual con `pip-audit` y `npm audit`. En la última revisión, `pip-audit` no
  reportó vulnerabilidades y `npm audit` reportó 17 avisos **moderados** de herramientas de desarrollo y
  ninguno en las dependencias de producción.
- **Observabilidad sin datos personales:** cada petición lleva un `X-Request-ID` validado (8 a 64
  letras, números o guiones; cualquier otro valor se descarta) y el registro de acceso solo guarda
  método, ruta sin query string, estado, duración y el número de usuario; no guarda cuerpos,
  cabeceras, cookies, correos ni celulares, y se ocultan los JWT y `password=...` que se cuelen en un
  mensaje. `/api/health/` es público y solo muestra estado, versión corta del commit, migraciones,
  si hay almacenamiento externo y la hora; nunca claves, rutas, versiones de librerías ni errores de
  la base (ADR-015).
- **Pruebas:** la suite del backend corre en el CI contra PostgreSQL 16 e incluye pruebas de permisos,
  CSRF por origen, cabeceras y concurrencia.

## Límites conocidos

Se listan de forma deliberada, para que nadie los descubra por sorpresa:

1. **Pagos de pruebas.** Solo existe `PasarelaSandbox` y el efectivo al recoger. Antes de operar con
   dinero real hay que desactivar el sandbox e integrar un proveedor con conciliación.
2. **Credenciales en el historial público de git.** Un archivo `.env` con claves reales
   (`SECRET_KEY`, `FERNET_KEY` y el acceso a una base) estuvo versionado y **sigue visible en el historial**
   aunque ya no se versiona (ver [AUDITORIA.md](docs/AUDITORIA.md), hallazgo S-01). El dueño del proyecto
   **decidió conscientemente no rotarlas ni reescribir el historial por ahora**. Consecuencia aceptada:
   quien las obtenga podría acceder a los recursos que protegían; por eso esos recursos solo deben
   contener datos de demostración. **Antes de usar RioMarket con datos reales hay que rotar esas claves,
   re-cifrar las cédulas con la clave nueva y reescribir el historial.** Este documento no reproduce
   ningún valor.
3. **Cuentas demo públicas.** Con `SEED_DEMO=true`, cada arranque recrea las cuentas del seed (incluido
   un administrador) con una contraseña pública. En un despliegue real debe ponerse `SEED_DEMO=false`.
4. **Sin autenticación multifactor** para administradores ni política de rotación de contraseñas.
5. **La recuperación y el cambio de contraseña existen solo en la API** (`/api/auth/recuperar-contrasena/`,
   `/api/auth/restablecer-contrasena/`, `/api/auth/perfil/cambiar-contrasena/`); la aplicación web no
   tiene pantalla para ellos y el envío del correo depende de un SMTP que la demo no configura.
6. **Límite de intentos por proceso** si no se configura `REDIS_URL`: con varios procesos los límites no
   son globales. `NUM_PROXIES` debe definirse según los proxies reales para que se use la IP correcta.
7. **Almacenamiento efímero** en el plan gratuito de Render: las fotos subidas se pierden salvo que se
   configure el almacenamiento S3 compatible; la base gratuita caduca a los 30 días.
8. **Auditoría sin retención ni archivado:** la tabla crece con cada acción.
9. **Repositorio sin protecciones adicionales:** la rama `main` no tiene protección de rama, el análisis
   de secretos de GitHub y las actualizaciones automáticas de seguridad de Dependabot están
   desactivados, y no hay archivo `LICENSE`.
10. **Avisos moderados de `npm audit`** en herramientas de desarrollo cuya corrección exige saltos de
    versión mayor (ESLint); no afectan a lo que se despliega.

## Agradecimientos

Quien reporte una vulnerabilidad válida y lo desee será reconocido en el registro de cambios.
