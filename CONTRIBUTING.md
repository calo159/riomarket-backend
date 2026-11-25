# Cómo contribuir a RioMarket

Gracias por querer mejorar RioMarket. Esta guía es corta a propósito. Para reportar una vulnerabilidad,
**no abra un issue**: siga [SECURITY.md](SECURITY.md).

## Requisitos

- Python 3.12 y Node.js 22.12 o superior (el CI usa Node 22).
- PostgreSQL 16 o Docker para correr igual que en producción; SQLite sirve para desarrollar y para la suite
  de pruebas local.

## Levantar el proyecto

Siga la sección «Inicio rápido» del [README](README.md#inicio-rápido): backend (`migrate`,
`seed_masivo`, `runserver`) y frontend (`npm ci`, `npm run dev`). Entre por `127.0.0.1:3000` y no por
`localhost`: la cookie de sesión es `SameSite=Strict`. Las cuentas demo están en
[«Datos demo»](README.md#datos-demo). El archivo `.env` no se versiona: cópielo desde `.env.example`.

## Flujo de trabajo (de la idea a la versión)

Todo cambio sigue el mismo recorrido, y cada paso deja una huella que se puede seguir:

```
Issue  →  Rama  →  Commits  →  Pull Request  →  Integración en main  →  Versión (tag)
```

1. **Issue.** Antes de tocar código, registre un issue con título, descripción, prioridad (etiqueta
   `prioridad: alta|media|baja`), responsable y **criterio para considerarlo solucionado**. Use las
   etiquetas `bug`, `enhancement` o `deuda técnica`.
2. **Rama** desde `main` actualizado (nunca se trabaja directo sobre `main`).
3. **Commits** pequeños y descriptivos.
4. **Pull Request** hacia `main` que cierre el issue (`Closes #N`).
5. **Integración** solo con el CI en verde.
6. **Versión**: al juntar cambios suficientes se cierra una versión (ver «Publicar una versión»).

## Ramas

| Rama | Para qué | Ejemplo |
| --- | --- | --- |
| `main` | Siempre estable y desplegable; solo recibe Pull Requests con CI en verde. | `main` |
| `feature/<tema>` | Función nueva o mejora visible. | `feature/version-semantica-en-salud` |
| `fix/<tema>` | Corrección de un error. | `fix/tareas-programadas-servicio-suspendido` |
| `docs/<tema>` | Solo documentación. | `docs/gobernanza-y-versionado` |
| `chore/<tema>` | Mantenimiento sin cambio de comportamiento (dependencias, limpieza, CI). | `chore/limpiar-ramas-integradas` |

Nombres en minúsculas, con guiones y que describan el tema (no «arreglo» ni «prueba2»). Las ramas antiguas del
proyecto (`mejora/…`, `feat/…`) se conservan como historia; las nuevas siguen esta tabla.

## Commits

Formato: `tipo: descripción en español, en imperativo y en una línea clara` (hasta ~72 caracteres). Si hace
falta explicar el porqué, se deja una línea en blanco y un cuerpo breve; el issue se cita al final (`Refs #N`).

| Tipo | Se usa para | Ejemplo |
| --- | --- | --- |
| `feat` | Funcionalidad nueva | `feat: exponer la versión semántica del sistema en /api/health/` |
| `fix` | Corrección de un error | `fix: detectar el servicio suspendido en las tareas programadas sin reintentar` |
| `refactor` | Reorganizar código sin cambiar su comportamiento | `refactor: unificar la obtención de la URL de las imágenes` |
| `test` | Agregar o ajustar pruebas | `test: impedir que la versión del código y el CHANGELOG se desincronicen` |
| `docs` | Solo documentación | `docs: explicar el flujo de ramas y versiones` |
| `chore` | Mantenimiento, dependencias, CI | `chore: actualizar las dependencias menores de Python` |

No son mensajes aceptables: `cambios`, `final`, `arreglo`, `ahora-si`, `wip`. Un commit por tema.

- **Sin líneas de coautoría automáticas** (`Co-Authored-By`) ni atribuciones a herramientas, ni en los
  commits ni en la descripción del pull request: es una preferencia expresa del dueño.
- Mantenga los cambios pequeños, con sus pruebas, y no incluya secretos en commits nuevos.

## Pull Requests

La plantilla [`.github/pull_request_template.md`](.github/pull_request_template.md) se carga sola. Todo PR debe
incluir:

1. **Descripción**: qué problema o necesidad resuelve.
2. **Issue relacionado**: `Closes #N` (GitHub lo cierra al integrarlo).
3. **Explicación del cambio**: qué archivos y por qué.
4. **Cómo verificarlo**: pasos que otra persona pueda repetir.
5. **Evidencia**: salida de pruebas, capturas o la ejecución de un workflow, cuando el cambio la admita.
6. **Tipo de cambio** (PATCH, MINOR o MAJOR) para decidir la versión.

Se integra cuando el CI está en verde (pruebas, lint, cobertura ≥ 91 %, frontend, e2e y CodeQL). Se usa
*merge commit* para conservar los commits descriptivos de la rama en el historial de `main`; las ramas
no se borran hasta cerrar la versión para poder mostrar el recorrido.

## Reglas básicas de contribución

- Un PR resuelve **un** issue; si aparece algo más, se registra otro issue.
- Todo cambio de comportamiento trae su prueba; la cobertura no puede bajar del umbral.
- No se suben secretos ni el `.env`; no se sube `db.sqlite3` con datos reales.
- Se actualiza `CHANGELOG.md` en el mismo PR (sección `[Sin publicar]`).
- Quien revisa no aprueba su propio cambio sin que el CI haya pasado.
- Las vulnerabilidades no se reportan en issues públicos: ver [SECURITY.md](SECURITY.md).

## Versionado (SemVer)

El proyecto usa [versionado semántico](https://semver.org/lang/es/) `MAJOR.MINOR.PATCH`:

- **PATCH** (`1.1.1`): corrección de errores sin cambiar lo que la API o la pantalla prometen.
- **MINOR** (`1.2.0`): funcionalidad nueva compatible hacia atrás.
- **MAJOR** (`2.0.0`): cambio incompatible (un endpoint que cambia de forma, un dato que se elimina).

La versión vive en un solo lugar, [`config/version.py`](config/version.py), se ve en ejecución en
`GET /api/health/` (campo `release`) y una prueba obliga a que coincida con
[`CHANGELOG.md`](CHANGELOG.md).

## Reglas de dependencia

Las apps del backend y las carpetas del frontend forman **capas** y solo dependen hacia abajo
([ADR-017](docs/ADR-017-arquitectura-en-capas.md)). Si tu cambio necesita importar de una capa superior, no lo
hagas: invierte la dependencia con un punto de extensión (mira `apps/rbac/menu.py` y
`apps/catalog/anotaciones.py`) o mueve el código a la capa correcta. Una app o carpeta nueva debe declarar su
nivel en `tests/test_arquitectura.py` o en `frontend/src/arquitectura.test.ts`; esas pruebas fallan con un
mensaje que indica qué importación sobra.

## Antes de abrir un pull request

Todo esto debe pasar (es lo que ejecuta el CI):

```bash
# Backend (desde la raíz)
ruff check apps config tests scripts
ruff format --check apps config tests scripts
python manage.py makemigrations --check --dry-run
python -m pytest -q --cov=apps --cov=apps   # falla bajo el umbral de pyproject.toml (91 %)
python scripts/trazabilidad.py --check

# Frontend
cd frontend
npm run lint && npm run typecheck && npm test && npm run build
```

Las pruebas end-to-end (Playwright) corren en el CI solo en pull requests y en `main`. Para correrlas
en local, con la base sembrada y el servidor levantado, siga «Modo CI en local» en
[frontend/README.md](frontend/README.md#modo-ci-en-local-e2e_ci1) y use `E2E_CI=1 npx playwright test`
dentro de `frontend/`. Si cambia un texto o un botón que recorren, ajuste la prueba y su enlace en
`docs/requisitos.yml`.

Si cambia serializers o rutas, regenere los tipos del frontend con el backend corriendo
(`npm run gen:api`) y valide el esquema: `python manage.py spectacular --file schema.yaml --validate`.

## Lo que se automatiza solo

- **Dependabot** abre cada lunes un PR con las actualizaciones de Python y npm (agrupadas las menores y los parches)
  y cada mes las de GitHub Actions. El CI las prueba; si pasa, se revisa el CHANGELOG de la biblioteca y se une.
- **Seguridad** (`.github/workflows/seguridad.yml`): `pip-audit` y `npm audit` en cada PR a `main` y una vez
  por semana. Para correr las de dependencias en local: `pip install pip-audit && pip-audit -r requirements.txt
  --no-deps --disable-pip` y `npm audit --omit=dev --audit-level=high` dentro de `frontend/`.
- **Prueba de humo tras cada despliegue** (`despliegue.yml`): espera a que Render sirva el commit unido y corre
  `python scripts/humo_produccion.py <url>`. Solo lee y no necesita credenciales; también sirve a mano.
- **Tareas programadas** (`tareas-programadas.yml`): cada 10 minutos despierta el servicio y dispara la liberación de
  pedidos vencidos (ver [ADR-012](docs/ADR-012-apartar-con-plazo.md)).

## La matriz de trazabilidad

[`docs/requisitos.yml`](docs/requisitos.yml) es la fuente de verdad de los requisitos y
[`docs/trazabilidad.md`](docs/trazabilidad.md) se **genera** a partir de ella. El script comprueba que
cada prueba, endpoint y pantalla citados existen y falla en el CI si algo apunta a la nada.

Para añadir o cambiar una función:

1. Añada una entrada a `docs/requisitos.yml` (siguiente `RF-NN` o `RNF-NN` libre) con `titulo`, `actor`,
   `origen` (un ADR o documento), `pantallas` (rutas de `frontend/src/App.tsx`), `endpoints`
   (`MÉTODO /ruta/` como sale del OpenAPI) y `pruebas` (`ruta.py::Clase::prueba`, o
   `frontend/...::texto exacto del it/test`). Un `RF` necesita al menos una prueba; un `RNF`, una prueba
   o una `evidencia`. `pendiente: true` declara un requisito aún sin completar.
2. Ejecute `python scripts/trazabilidad.py` para regenerar `docs/trazabilidad.md` y confirme ambos
   archivos.
3. `python scripts/trazabilidad.py --check` debe terminar con código 0.

El script también revisa que los enlaces relativos de los `.md` de documentación apunten a archivos que
existen.

## Decisiones de arquitectura (ADR)

Escriba un ADR en `docs/` cuando una decisión cambie el comportamiento, los datos o la operación y
alguien pudiera preguntar «¿por qué así?» (nuevos estados, reglas de negocio, almacenamiento,
dependencias, seguridad). Use el siguiente número libre (hoy, **ADR-016**), el nombre
`ADR-NNN-tema-en-minusculas.md`, y enlácelo desde [docs/README.md](docs/README.md). Siga la forma de los
existentes: contexto, decisión, consecuencias y, si aplica, alternativas descartadas.

## Estilo visual y de texto

Lea [PRODUCT.md](PRODUCT.md) y [DESIGN.md](DESIGN.md) antes de tocar la interfaz: sin degradados ni
vidrio, sombras solo al pasar el cursor y fotos reales con crédito (`/creditos-fotos`) en lugar de
iconos de relleno. Los textos de pantalla van en español
claro y en lenguaje de la persona usuaria.

## Publicar una versión

Lo hace el dueño del repositorio (o quien revise), no un agente:

Los ejemplos usan `X.Y.Z`; reemplácelo por la versión que se publica (la última fue la **1.1.0**).

1. Con `main` verde en el CI y todos los cambios unidos, abra un pull request pequeño que mueva lo de
   `[Sin publicar]` a `## [X.Y.Z] - AAAA-MM-DD` en [CHANGELOG.md](CHANGELOG.md) (con la fecha del
   etiquetado), cambie `__version__` en [`config/version.py`](config/version.py) y justifique en el PR si
   sube MAJOR, MINOR o PATCH. La prueba `test_version.py` falla si las dos cifras no coinciden.
   Opcional: suba `version` en `frontend/package.json` en ese mismo PR.
2. Etiquete (etiqueta anotada, sobre el commit de `main` que ya contiene ese PR) y suba la etiqueta:

   ```bash
   git switch main && git pull
   git tag -a vX.Y.Z -m "RioMarket X.Y.Z"
   git push origin vX.Y.Z
   ```

3. Opcional: cree la publicación en GitHub con las notas de esa sección del CHANGELOG:

   ```bash
   sed -n '/^## \[X.Y.Z\]/,/^## \[/p' CHANGELOG.md | sed '$d' > /tmp/notas.md
   gh release create vX.Y.Z --title "RioMarket X.Y.Z" --notes-file /tmp/notas.md
   ```

   (revise que `notas.md` solo tenga la sección de la versión y no los enlaces del final; o pegue la
   sección a mano en la pantalla de nueva publicación de GitHub).
4. Los enlaces de comparación del final del CHANGELOG (`[X.Y.Z]: …compare/vANTERIOR...vX.Y.Z`) se actualizan en
   el mismo PR.

## Licencia

El repositorio todavía **no tiene archivo `LICENSE`**; hasta que el dueño elija una, el código no puede
reutilizarse fuera del contexto académico.
