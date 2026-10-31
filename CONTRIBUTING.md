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

## Ramas y commits

- Cree la rama desde `main` con un prefijo: `feat/` (función nueva), `mejora/` (cambio sin función
  nueva), `docs/` (solo documentación) o `fix/` (corrección).
- Mensajes de commit **en español, en imperativo y en una línea clara** («Corregir el contraste de la
  landing»). Un commit por tema.
- **Sin líneas de coautoría automáticas** (`Co-Authored-By`) ni atribuciones a herramientas, ni en los
  commits ni en la descripción del pull request: es una preferencia expresa del dueño.
- Mantenga los cambios pequeños, con sus pruebas, y no incluya secretos en commits nuevos.

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

1. Con `main` verde en el CI y todos los cambios unidos, abra un pull request pequeño que mueva lo de
   `[Sin publicar]` a `## [1.0.0] - AAAA-MM-DD` en [CHANGELOG.md](CHANGELOG.md) (con la fecha del
   etiquetado). Opcional: suba `version` en `frontend/package.json` a `1.0.0` en ese mismo PR.
2. Etiquete y suba la etiqueta:

   ```bash
   git switch main && git pull
   git tag -a v1.0.0 -m "RioMarket 1.0.0"
   git push origin v1.0.0
   ```

3. Cree la publicación en GitHub con las notas de esa sección del CHANGELOG:

   ```bash
   sed -n '/^## \[1.0.0\]/,/^## \[/p' CHANGELOG.md | sed '$d' > /tmp/notas.md
   gh release create v1.0.0 --title "RioMarket 1.0.0" --notes-file /tmp/notas.md
   ```

   (revise que `notas.md` solo tenga la sección de la versión y no los enlaces del final; o pegue la
   sección a mano en la pantalla de nueva publicación de GitHub).
4. Los enlaces de comparación del final del CHANGELOG ya apuntan a la etiqueta `v1.0.0`.

## Licencia

El repositorio todavía **no tiene archivo `LICENSE`**; hasta que el dueño elija una, el código no puede
reutilizarse fuera del contexto académico.
