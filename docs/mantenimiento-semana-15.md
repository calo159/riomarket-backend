# Mantenimiento y evolución del software — Semana 15

Evidencia de que RioMarket cuenta con una estructura básica para administrar su evolución: diagnóstico de deuda técnica,
issues, ramas, cambios reales, commits descriptivos, pull requests, versión y tag. Repositorio:
<https://github.com/calo159/riomarket-backend>. Para el mantenimiento general del proyecto (línea base, herramientas,
datos demo) ver [MANTENIMIENTO.md](MANTENIMIENTO.md).

**Versión entregada:** `v1.1.0` · **Fecha:** 25 de noviembre de 2026 · **Responsable en GitHub:** `@calo159`

## Parte 1. Diagnóstico de deuda técnica

Revisión hecha sobre `main` (commit `453fa1f`) con la suite completa: 1688 pruebas pasan, cobertura 94,46 % (umbral 91 %),
`ruff` sin observaciones. La deuda no está en que «todo falle», sino en el mantenimiento que se va acumulando.

| ID | Deuda técnica | Evidencia | Impacto | Riesgo | Prioridad | Acción propuesta | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DT-01 | **Sin respaldo de la base en producción.** El workflow «Respaldo de la base» falla a diario porque faltan los 6 secretos. | Run `45471474642`: «Faltan secretos para el respaldo» | Alto | Alto | **Crítica** | Cargar los secretos y probar una restauración | Pendiente — [#109](https://github.com/calo159/riomarket-backend/issues/109) |
| DT-02 | **Servicio de producción suspendido y aviso poco claro.** Render responde `503 suspend`; el aviso solo decía `curl: 503` y reintentaba 6 veces. | Runs `45600255890`, `45529488923` | Alto | Alto | **Crítica** | Mensaje claro y fallo inmediato (hecho); reactivar el servicio (lo hace el dueño en Render) | **Corregido el aviso** — [#105](https://github.com/calo159/riomarket-backend/issues/105), PR #111. Reactivación pendiente |
| DT-03 | **Dependencias sin actualizar.** 7 PRs de Dependabot abiertos desde el 9 de noviembre (Django 5.2→6.1, jsdom 25→31, plugin-react 4→6…). | PRs #96, #97, #99, #100, #101, #102, #104 | Medio | Alto | **Alta** | Integrar las menores y planificar las mayores una por una | Pendiente — [#108](https://github.com/calo159/riomarket-backend/issues/108) |
| DT-04 | **Falta de versionado y trazabilidad.** Sin tags, sin issues, sin plantilla de PR, 366 líneas «Sin publicar» en el CHANGELOG, sin versión visible en ejecución. | `git tag` vacío; 0 issues | Medio | Medio | **Alta** | Flujo documentado, plantilla, versión SemVer, tags | **Corregido** — [#106](https://github.com/calo159/riomarket-backend/issues/106), [#107](https://github.com/calo159/riomarket-backend/issues/107), PRs #112 y #113 |
| DT-05 | **Manejo de errores demasiado genérico y código duplicado.** 30 bloques `except Exception`; la obtención de la URL de una imagen está copiada 3 veces en `catalog/serializers.py` y traga cualquier fallo de almacenamiento. | `apps/catalog/serializers.py` (`_url_imagen`, `get_url`, `get_miniatura`), `orders/serializers.py`, `sitio/seo.py` | Medio | Medio | **Media** | Una función con excepciones específicas y registro en el log | Pendiente — [#110](https://github.com/calo159/riomarket-backend/issues/110) |
| DT-06 | **Módulos y componentes muy extensos.** `apps/orders/services.py` (828 líneas), `administration/services.py` (695), `catalog/services.py` (639), `Checkout.tsx` (574), `Landing.tsx` (555). | `wc -l` | Medio | Medio | **Media** | Dividir por responsabilidad cuando se toque cada uno, con las pruebas actuales como red de seguridad | Pendiente (sin issue; se abre al planificarlo) |
| DT-07 | **Ramas sin limpiar.** 96 ramas remotas; 26 ya están integradas en `main`. | `git branch -r --merged` | Bajo | Bajo | **Baja** | Borrar las integradas al cerrar cada versión | Pendiente |

Lo que **no** es deuda (se verificó): no hay credenciales en el código (`SECRET_KEY` y `FERNET_KEY` salen del entorno y
producción se niega a arrancar con claves débiles), no hay `print` ni `TODO` olvidados, y `ruff format` pasa en los 292 archivos.

## Parte 2. Issues

| # | Tipo | Título | Prioridad | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| [#105](https://github.com/calo159/riomarket-backend/issues/105) | **Bug** | Tareas programadas reintenta en vano cuando Render está suspendido y no explica la causa | Alta | @calo159 | Cerrado por PR #111 |
| [#106](https://github.com/calo159/riomarket-backend/issues/106) | **Mejora** | Mostrar la versión semántica del sistema en `/api/health/` | Media | @calo159 | Cerrado por PR #112 |
| [#107](https://github.com/calo159/riomarket-backend/issues/107) | **Deuda técnica** | Documentar ramas, commits y versionado (CONTRIBUTING, CHANGELOG, plantilla de PR) | Media | @calo159 | Cerrado por PR #113 |
| [#108](https://github.com/calo159/riomarket-backend/issues/108) | Deuda técnica | Siete actualizaciones de dependencias sin revisar | Alta | @calo159 | Abierto |
| [#109](https://github.com/calo159/riomarket-backend/issues/109) | Deuda técnica | El respaldo diario de la base falla porque faltan los secretos | Alta | @calo159 | Abierto |
| [#110](https://github.com/calo159/riomarket-backend/issues/110) | Deuda técnica | Excepciones genéricas y obtención de URL de imágenes duplicada | Media | @calo159 | Abierto |

Cada issue trae descripción, prioridad (también como etiqueta `prioridad: alta|media|baja`), responsable y una lista
«Criterio para considerarlo solucionado» con casillas verificables.

## Partes 3 a 6. Ramas, cambios, commits y pull requests

| Rama | Tipo | Commits | Pull Request |
| --- | --- | --- | --- |
| `main` | Estable | solo recibe PRs con CI en verde | — |
| `fix/tareas-programadas-servicio-suspendido` | Corrección | `c09eb2f fix: detectar el servicio suspendido en las tareas programadas sin reintentar` | [#111](https://github.com/calo159/riomarket-backend/pull/111) |
| `feature/version-semantica-en-salud` | Función | `5d799ce feat: exponer la versión semántica del sistema en /api/health/` · `eb32c71 test: impedir que la versión del código y el CHANGELOG se desincronicen` | [#112](https://github.com/calo159/riomarket-backend/pull/112) |
| `docs/gobernanza-y-versionado` | Documentación | `docs: …` (ver el PR) | [#113](https://github.com/calo159/riomarket-backend/pull/113) |

Cada PR usa la plantilla (descripción, issue relacionado, explicación, cómo verificarlo, evidencia, tipo de cambio) y
se integró con *merge commit* y el CI en verde: pruebas, `ruff`, cobertura, frontend, e2e y CodeQL.

## Partes 7 y 8. Versión y tag

**Versión: `1.1.0`** (anterior: `1.0.0`, de 31 de octubre de 2026).

| Nivel | ¿Sube? | Justificación |
| --- | --- | --- |
| MAJOR | No | Ningún cambio rompe a quien ya usaba la API o la aplicación: el campo `release` se **agrega** a `/api/health/` y no se quita nada. |
| **MINOR** | **Sí** | Hay funcionalidad nueva compatible hacia atrás: el campo `release` y, además, todo lo acumulado desde `1.0.0` (personalizar el sitio desde el panel, panel animado, optimización de la tienda, etc.; ver el CHANGELOG). |
| PATCH | No (queda incluido) | La corrección del bug #105 sola sería `1.0.1`, pero al ir junto con funciones nuevas manda el nivel más alto: MINOR. |

Tags: `v1.0.0` (creado de forma retroactiva sobre `14237df «CHANGELOG: publicar la versión 1.0.0 (#27)»`, el commit que
cerró esa versión) y **`v1.1.0`** sobre el commit de `main` que contiene los tres PRs. Los enlaces de comparación del
CHANGELOG (`v1.0.0...v1.1.0`) ya apuntan a ellos.

## Parte 9. Documentación

| Archivo | Qué se hizo |
| --- | --- |
| [README.md](../README.md) | Ya explicaba qué hace el proyecto, stack, requisitos, instalación y ejecución; se agrega la sección «Versionado y estado actual». |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Flujo issue→versión, nombres de rama, formato de commits, proceso de PR, reglas básicas, SemVer y cómo publicar una versión. |
| [CHANGELOG.md](../CHANGELOG.md) | Se cierra `[1.1.0] - 2026-11-25`, se documentan el arreglo, la función y la documentación, y se actualizan los enlaces. |
| [`.github/pull_request_template.md`](../.github/pull_request_template.md) | Plantilla de pull request. |

## Parte 10. Trazabilidad de dos cambios

### Cambio 1 — Corrección de un bug

| Eslabón | Evidencia |
| --- | --- |
| **Issue** | [#105](https://github.com/calo159/riomarket-backend/issues/105) — *Tareas programadas reintenta en vano cuando Render está suspendido y no explica la causa* (bug, prioridad alta) |
| **Problema** | Con `x-render-routing: suspend` el workflow reintentaba 6 veces (1 min 23 s) y fallaba con `curl: (22) 503`, sin decir la causa |
| **Rama** | `fix/tareas-programadas-servicio-suspendido` |
| **Commit** | `c09eb2f` — `fix: detectar el servicio suspendido en las tareas programadas sin reintentar` |
| **Verificación** | Run [`45667890979`](https://github.com/calo159/riomarket-backend/actions/runs/45667890979): falla en **9 s** con «El servicio … está SUSPENDIDO en Render» (antes 1 min 23 s) |
| **Pull Request** | [#111](https://github.com/calo159/riomarket-backend/pull/111) — CI en verde |
| **Integración** | Merge commit `cbf4847` en `main`; el issue #105 se cerró solo |
| **Versión** | `v1.1.0` — sección «Corregido» del CHANGELOG |

### Cambio 2 — Mejora / funcionalidad pequeña

| Eslabón | Evidencia |
| --- | --- |
| **Issue** | [#106](https://github.com/calo159/riomarket-backend/issues/106) — *Mostrar la versión semántica del sistema en `/api/health/`* (mejora, prioridad media) |
| **Problema** | No había forma de saber qué release corre ni de relacionarlo con el CHANGELOG; `version` solo mostraba un commit |
| **Rama** | `feature/version-semantica-en-salud` |
| **Commits** | `5d799ce` — `feat: exponer la versión semántica del sistema en /api/health/` · `eb32c71` — `test: impedir que la versión del código y el CHANGELOG se desincronicen` |
| **Verificación** | `pytest apps/common tests`: 290 passed; respuesta real `{"status": "ok", "database": "up", "release": "1.1.0", …}` |
| **Pull Request** | [#112](https://github.com/calo159/riomarket-backend/pull/112) — CI en verde (incluye e2e) |
| **Integración** | Merge commit `de11b54` en `main`; el issue #106 se cerró solo |
| **Versión** | `v1.1.0` — sección «Añadido» del CHANGELOG |

Recorrido completo en ambos casos: **Issue → Rama → Commit → Pull Request → Integración → Versión.**

## Parte 11. Estado actual del software

- **Versión actual:** 1.1.0.
- **Funcionalidades principales:** catálogo de puestos y productos, carrito y checkout, pedidos de un solo puesto con stock
  transaccional, apartar con plazo, productos por encargo, pagos en sandbox y efectivo, verificación de vendedores, reseñas,
  cupones, notificaciones, auditoría, administración con RBAC editable, panel de ventas y personalización del sitio.
- **Principales cambios en esta actividad:** aviso claro cuando Render está suspendido (#105), versión semántica visible y
  protegida por una prueba (#106), gobernanza del repositorio: flujo, ramas, commits, PR, SemVer y tags (#107).
- **Errores pendientes:** el servicio de producción sigue **suspendido en Render** (hay que reactivarlo desde su panel); el
  respaldo diario sigue fallando por secretos sin cargar (#109).
- **Mejoras pendientes:** actualizar dependencias (#108), unificar el manejo de errores de las imágenes (#110), dividir los
  módulos más extensos (DT-06), limpiar las ramas ya integradas (DT-07).
- **Deudas identificadas:** 7 (DT-01 a DT-07). **Corregidas:** 2 totalmente (DT-04 y el aviso de DT-02); las otras 5 quedan
  registradas con issue y criterio de cierre.

## Parte 12. Reflexión final

1. **¿Principal deuda técnica?** No tener un respaldo funcionando de la base de producción (DT-01). Todo lo demás se puede
   rehacer desde el repositorio; los datos de usuarios y pedidos, no.
2. **¿Qué riesgo representa no corregirla?** Perder datos de forma irrecuperable ante un error humano, una falla del proveedor
   o la eliminación accidental de la base, y no poder demostrar que existe una copia restaurable.
3. **¿Qué tipo de mantenimiento realizaron?** *Correctivo* (el aviso de servicio suspendido, #105), *perfectivo* (la versión
   visible, #106) y *preventivo* (diagnóstico de deuda, prueba de sincronía versión/CHANGELOG, documentación del flujo, #107).
4. **¿Ventajas de trabajar con ramas?** `main` nunca quedó roto: cada cambio se probó aparte y con el CI antes de unirse; dos
   cambios avanzaron a la vez sin pisarse (incluso en carpetas distintas con `git worktree`); y cada rama es un historial
   legible de una sola idea.
5. **¿Utilidad de los issues?** Obligaron a escribir primero *qué* es el problema y *cuándo* se considera resuelto; dieron un
   número al que se amarran la rama, el commit y el PR; y las deudas pendientes quedan visibles en lugar de perderse.
6. **¿Cómo ayudan los commits a entender la evolución?** El historial deja de ser una lista de «cambios» y pasa a contar una
   historia: `fix:` explica un error, `feat:` una capacidad nueva, `test:` una garantía. Con el cuerpo del mensaje se entiende
   el porqué meses después.
7. **¿Utilidad de tags y versiones?** Son puntos de referencia: permiten decir «producción corre 1.1.0», comparar
   `v1.0.0...v1.1.0`, volver a un estado conocido y comunicar si un cambio rompe o no (SemVer).
8. **¿Qué pasaría sin control de versiones?** Archivos pisados entre personas, cambios que nadie sabe quién hizo ni por qué,
   copias como `final_v2_ahora-si`, imposibilidad de volver atrás tras un error y de revisar antes de unir.
9. **¿Otro desarrollador podría continuar fácilmente?** Sí, con matices. A favor: README con instalación y ejecución,
   `CONTRIBUTING.md` con el flujo, ADRs que explican las decisiones, 1688 pruebas con 94 % de cobertura, CI que bloquea errores
   y datos demo. En contra: hay módulos extensos (DT-06) y excepciones genéricas (DT-05) que cuestan entender, y hay que cargar
   secretos y reactivar Render antes de operar producción.
10. **¿Qué mantener o mejorar después?** Primero el respaldo (#109), luego las dependencias (#108) y, al tocar esos archivos,
    el manejo de errores (#110) y la división de los módulos grandes.
