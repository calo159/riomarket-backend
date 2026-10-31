# ADR-016: pruebas end-to-end por rol en el CI

**Estado**: Aceptado

## Contexto

Las pruebas de backend (pytest) y de componentes (Vitest) no demuestran que el sistema completo
funcione en un navegador: faltaba una prueba que recorra, con el backend real, PostgreSQL y el
frontend construido, lo que hace cada rol. El guion de [PRESENTACION.md](PRESENTACION.md) ya se había
ejecutado con Playwright a mano; este ADR lo convierte en pruebas que corren solas.

## Decisión

### Qué se prueba

Un archivo por rol en `frontend/e2e/`, con selectores por rol y texto accesible (`getByRole`,
`getByLabel`), que de paso comprueban la accesibilidad. No se añadió ningún `data-testid` ni se cambió
la interfaz.

| Archivo (proyecto) | Recorrido |
| --- | --- |
| `comprador.spec.ts` (celular, Pixel 7) | Buscar, agregar, carrito, checkout en retiro con pago al recoger y ver el pedido con su vencimiento; encargar la bandeja de papaya con detalles y fecha |
| `vendedor.spec.ts` (escritorio) | Confirmar, preparar, marcar listo y «Entregar y cobrar»; aceptar un encargo; abrir `/vendedor/ventas` |
| `admin.spec.ts` (escritorio) | Resumen, auditoría con la fila «Sistema · vencimiento» y el pedido vencido, usuarios y roles |
| `anonimo.spec.ts` (escritorio) | Landing, tienda, mapa y créditos de fotos, sin errores de consola |
| `smoke.spec.ts` | Sin cambios |

### Cuándo corren

El trabajo `e2e` de `.github/workflows/ci.yml` corre **solo en pull requests y en `main`**, y después
de `test` y `frontend` (`needs`): no gasta minutos si lo básico falla. Tiene `timeout-minutes: 15`.
En una rama sin PR los otros dos trabajos bastan.

### Cómo se sirve el sistema

Django sirve el frontend ya construido, con `config.settings.prod` (WhiteNoise, la CSP y las cabeceras
reales), en `http://127.0.0.1:8000` y **sin proxy ni segundo servidor**. Se desactiva solo la
redirección a HTTPS (`SECURE_SSL_REDIRECT=False`); las cookies siguen siendo `Secure` y Chromium las
acepta en `127.0.0.1`. Se midió la alternativa (`config.settings.dev` con `vite preview` y proxy): la
duración fue la misma (43 s las 15 pruebas en ambos casos), pero necesita dos procesos y no ejercita la
CSP ni WhiteNoise, es decir, no es lo que corre en Render. Con el servidor real, además, cualquier
violación de la CSP aparece como error de consola y rompe `anonimo.spec.ts`.

Consecuencia que aflora al probar así: una ruta `/admin/...` escrita en la barra de direcciones (o al
recargar la página) la entrega Django a su administrador (`config/urls.py` excluye `admin/` del
catch-all de la SPA); solo `/admin` abre el panel. Las pruebas del administrador navegan con el menú,
que es lo que hace una persona. No se cambió el comportamiento en este paquete.

### Aislamiento de datos

- Cada prueba usa un **comprador del seed en exclusiva** (`COMPRADOR` en `fixtures.ts`) y crea sus
  pedidos con nombres e identificadores propios; ninguna depende del orden ni de números de pedido.
- Lo que una prueba crea se **cancela al terminar** (fixture `limpiarPedido`), con lo que el stock
  vuelve a su valor. La única venta real (el pedido que se entrega y cobra) se compensa subiendo en uno
  el stock de «Arepa de huevo» con la API de la vendedora.
- El refresh de la sesión rota, así que no se reutiliza `storageState`: cada prueba inicia sesión por
  la interfaz. La preparación y la limpieza usan un contexto de API aparte (`SesionApi`).
- El seed corre en cada despliegue y deja plazos que cambian: las pruebas no leen cifras del seed, solo
  forma (por ejemplo, con «7 días» la tabla de ventas trae 7 filas).
- Excepción conocida: la auditoría muestra las **últimas 100 acciones**. La prueba de la fila
  «Sistema · vencimiento» necesita que ese barrido (hecho al preparar la base) siga dentro de esa
  ventana: en el CI la base es nueva y `admin.spec.ts` corre primero; en local, repetidas corridas sobre
  la misma base la empujan fuera. Recréela (`migrate`, `seed_masivo`, `seed_imagenes_demo`,
  `cancelar_pedidos_vencidos`) si falla por eso.

### Esperas y red

Solo esperas por condición (`expect` con reintento automático): no hay `waitForTimeout`. Las pruebas no
dependen de internet: las teselas del mapa (`tile.openstreetmap.org`) pueden fallar sin que falle la
prueba, y el único error de consola tolerado además de ese es el 401 de la sesión. Los límites de
peticiones (`THROTTLE_*`) se suben solo en el proceso del trabajo.

### Reintentos y artefactos

- `retries: 1` solo en el CI (`CI=true`), con un solo trabajador. Un reintento no oculta nada: el
  reporter `reintentos-reporter.ts` anota en el resumen del trabajo las pruebas que pasaron solo en el
  segundo intento, y esas hay que arreglar.
- Si algo falla, el trabajo sube `frontend/playwright-report` y `frontend/test-results` (trazas,
  capturas y vídeo) como artefacto `playwright-report`, con **retención de 7 días**. En una prueba que
  pasa no se guarda nada.
- Chromium es lo único que se instala (`npx playwright install --with-deps chromium`), con la carpeta
  `~/.cache/ms-playwright` en caché por versión de Playwright.
- No se usa `continue-on-error`.

## Alternativas descartadas

- **E2E en cada push:** gasta minutos en ramas que nadie revisa todavía.
- **`vite preview` + `config.settings.dev`:** ver arriba; no es lo que corre en producción.
- **`storageState` compartido:** el refresh rotado e invalidado lo vuelve inestable.
- **Mocks de red (`page.route`):** dejarían de ser pruebas de extremo a extremo.

## Consecuencias

- Cada PR demuestra en un navegador real los recorridos críticos de los tres roles.
- El trabajo suma unos minutos al CI de cada PR (la duración medida está en la descripción del PR).
- Si cambia un texto que una prueba busca, la prueba falla a propósito: es el aviso de que el recorrido
  cambió. La matriz de trazabilidad (`docs/requisitos.yml`) enlaza cada prueba con su requisito.
