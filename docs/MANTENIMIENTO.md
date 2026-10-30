# Mantenimiento y auditoría del repositorio

Documento de evidencia para la limpieza previa a la entrega. No cambia el
contrato de la API: registra qué se revisó, qué se encontró y cómo se verificó
cada decisión.

## Contexto

- Rama: `chore/limpieza-repo` (creada desde `main`).
- Alcance: backend Django/DRF, SPA React/Vite, documentación, datos demo y
  configuración de despliegue.
- Restricciones: no borrar migraciones, `package-lock.json`, `entrega/`,
  `.env`, `.env.example`, ADRs ni tests; justificar cada eliminación; no hacer
  push ni fusionar sin autorización.

## Línea base (antes de limpiar)

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Suite backend | `pytest -q` | 589 pruebas aprobadas |
| Lint backend | `ruff check apps config tests --no-cache` | Sin errores |
| Formato backend | `ruff format --check apps config tests` | Sin cambios |
| Migraciones | `python manage.py makemigrations --check --dry-run` | No changes detected |
| OpenAPI | `python manage.py spectacular --file schema.yaml --validate` | 0 errores, 1 warning de colisión de enum `estado` |
| Lint frontend | `npm run lint` | Sin errores ni warnings |
| Tipos frontend | `npm run typecheck` | Sin errores |
| Tests frontend | `npm test` | 21 pruebas aprobadas |
| Build frontend | `npm run build` | Build de producción correcto |

En Windows, `spectacular` sin `--file` falla al imprimir `→` en consola
`cp1252`; la verificación se ejecutó con `PYTHONIOENCODING=utf-8` y
`--file schema.yaml`.

## Inventario

- 307 archivos rastreados: 161 en `apps/`, 94 en `frontend/`, 18 en la raíz,
  13 en `docs/`, 9 en `config/`, 5 en `entrega/`, 5 en `tests/`, 1 en
  `scripts/` y 1 en `.github/`.
- No hay `node_modules/`, `dist/`, `staticfiles/`, `media/`, bases SQLite,
  `__pycache__/` ni archivos de cobertura rastreados.
- No hay archivos con BOM, UTF-8 inválido, U+FFFD ni mojibake en el índice.
  `.gitattributes` fuerza LF en el repositorio; el árbol de trabajo de Windows
  conserva CRLF por `core.autocrlf=true`, sin afectar al contenido versionado.
- Duplicados exactos: varios `__init__.py` vacíos (necesarios) y
  `apps/common/admin.py` vacío (eliminado).

## Código y componentes sin uso

- `vulture` no encontró código de producción muerto. Solo reportó el fixture
  `media_privada` (se usa por su efecto en `override_settings`) y el parámetro
  `auto_schema` (lo exige la interfaz de `drf-spectacular`): falsos positivos.
- Frontend: se eliminaron `src/auth/Puede.tsx` y
  `src/components/EnlacePrecarga.tsx` (sin importaciones), además de las
  exportaciones `getAccessToken`, `CLAVE_AVISO_SESION`, `Selector` y
  `SeccionTitulo`, que no se usaban.
- `frontend/PROMPT.md` se movió como documento histórico a
  `docs/alcance-frontend.md`; su descripción de autenticación se actualizó.

## Dependencias

### Backend

`pip-audit` detectó 49 avisos en tres paquetes fijados: Django 5.1.15,
Django REST Framework 3.17.2 y Pillow 12.3.0. Se actualizó a las versiones
corregidas (Django 5.2.17, DRF 3.18.2 y Pillow 13.0.0) y se repitió la suite
completa: **589 pruebas en verde**, lint/formato correctos y esquema sin errores.
`pip-audit -r requirements.txt` ya no reporta vulnerabilidades conocidas.

### Frontend

`npm audit` reportó inicialmente 14 avisos. Tras actualizar los parches
compatibles (`react-router-dom` 6.30.6 y `postcss` 8.5.31), quedan **12 avisos:
2 críticos, 2 altos y 8 moderados**, casi todos de herramientas de desarrollo.
Las correcciones disponibles exigen saltos mayores:

- `vitest`/`tinypool`/`vite`/`@vitest/mocker`: Vitest 5 o Vite 8.
- `tailwindcss`/`postcss-selector-parser`: Tailwind 4.
- `react-router`: la rama 6 ya no recibe el parche; la corrección es v7.18.
- `zod`: la corrección es v4 y el peer actual de `@hookform/resolvers` es v3.

No se aplican saltos mayores sin una migración probada. El frontend sigue con
lint, typecheck, 21 tests y build correctos.

## Documentación

- Enlaces internos verificados con un comprobador de rutas y anclas: 0 rotos.
  Las anclas reales coinciden con los enlaces de `README`, `frontend/README`,
  `docs/arquitectura.md` y `docs/ADR-001-enums.md`.
- `README.md` y `README.en.md` estaban desactualizados: decían “solo backend”,
  478 pruebas, refresh en `localStorage`, y que faltaba gunicorn aunque
  `Dockerfile.render` ya lo usa. Se reescribieron con el estado real.
- `SEGURIDAD.md`, `docs/PRESENTACION.md` y `docs/README.md` eran placeholders;
  se completaron.
- `docs/rendimiento.md` y `docs/capturas/README.md` solo contenían “pendiente”;
  se retiraron para no simular documentación inexistente.
- `docs/api-ejemplos.md` mostraba el refresh en el cuerpo del login, pero el
  backend lo entrega en una cookie HttpOnly. Se corrigió el flujo con
  `curl -c/-b` y la cabecera `X-Requested-With`. El README y el README del
  frontend también se alinearon con la cookie y con los 589/21 tests actuales.

## Datos demo

- `entrega/datos_riomarket.json` contiene 522 registros de dominio: 15
  usuarios, 4 vendedores, 8 categorías, 6 puestos, 40 productos, 30 pedidos,
  28 pagos, 5 cupones y 15 reseñas.
- `entrega/datos_riomarket.sql` contiene 682 filas en bloques `COPY`, que
  incluyen las tablas de sistema de Django además de los 522 registros de
  dominio.
- `seed_masivo` ya existía, es idempotente y supera el mínimo de 100. Faltaba
  conectarlo al arranque de Render: `scripts/render-start.sh` ejecutaba
  `seed_demo`. Ahora ejecuta `seed_masivo --if-empty`, que omite la carga si
  ya hay al menos 100 registros y completa una base pequeña.

## Despliegue

- `Dockerfile`: desarrollo/Compose, instala `requirements-dev.txt` y usa
  `runserver`.
- `Dockerfile.render`: producción; compila el frontend con Vite, instala
  `requirements.txt` y arranca con gunicorn y WhiteNoise.
- `render.yaml`: servicio free, PostgreSQL free (caduca a los 30 días),
  `PAYMENTS_SANDBOX_ENABLED=True` para la demo y `SEED_DEMO=true` para cargar
  datos en el arranque.
- No hay Docker local disponible en el equipo de limpieza; el build de
  contenedores no se pudo ejecutar aquí. Sí se validaron los comandos nativos
  de backend y frontend.

## Riesgos y pendientes

- `.env` está versionado a propósito para la entrega y contiene credenciales
  reales de Supabase; el repositorio es público. Rotar la contraseña o hacerlo
  privado después de la entrega.
- Los 12 avisos de frontend que exigen saltos mayores se documentan; no se
  actualizan a ciegas.
- La base free de Render caduca a los 30 días y el disco es efímero.
- La pasarela de pagos real, el SMTP real, el almacenamiento de objetos y la
  retención de auditoría siguen fuera del alcance de la demo.
