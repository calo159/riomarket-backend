# Diagramas

Diagramas [Mermaid](https://mermaid.js.org/) que GitHub dibuja directamente. Cada uno sale del código
que describe (se cita el archivo y la función) y se validó con el analizador de Mermaid (ver
«Cómo se validaron» al final). Si el código cambia, el diagrama debe cambiar con él.

Contenido: [1. Checkout y pago a domicilio](#1-checkout-y-pago-a-domicilio-con-pago-sandbox) ·
[2. Retiro con pago al recoger](#2-retiro-con-pago-al-recoger-y-entregar-y-cobrar) ·
[3. Apartar con plazo](#3-apartar-con-plazo-liberación-automática-del-stock) ·
[4. Producto por encargo](#4-producto-por-encargo) · [5. Despliegue](#5-despliegue) ·
[6. Estados del pedido](#6-estados-del-pedido-por-tipo-de-entrega).

## 1. Checkout y pago a domicilio (con pago sandbox)

Código: `crear_pedido` y `_aplicar_transicion` en `apps/orders/services.py`, `crear_pago` y
`simular_pago` en `apps/payments/services.py`, `frontend/src/pages/Checkout.tsx` y
`frontend/src/pages/pedido/ModalesPedido.tsx`. En domicilio el vendedor **no puede confirmar** hasta
que el pago esté aprobado (`_exigir_pago_para_confirmar`) y solo el comprador cierra la entrega.

```mermaid
sequenceDiagram
    autonumber
    actor C as Comprador (SPA)
    participant AP as API pedidos
    participant S as orders.services
    participant DB as PostgreSQL
    participant AG as API pagos
    actor V as Vendedor (SPA)

    C->>AP: POST /api/orders/pedidos/ (domicilio, items, cupón opcional)
    AP->>S: crear_pedido(usuario, datos)
    S->>DB: BEGIN, SELECT ... FOR UPDATE de los productos (por PK)
    S->>DB: descuenta stock de cada producto con stock
    S->>DB: valida y registra el cupón, calcula total
    S->>DB: INSERT pedido + ítems con precios congelados, COMMIT
    S-->>AP: pedido pendiente (sin vence_en: es domicilio)
    AP-->>C: 201 Created
    C->>AG: POST /api/payments/pagos/ (método simulado)
    AG->>DB: INSERT pago pendiente con montos del servidor
    AG-->>C: 201 Created
    C->>AG: POST /api/payments/pagos/{id}/simular/ (aprobar)
    AG->>DB: pago aprobado
    AG-->>C: 200 OK
    V->>AP: POST /api/orders/pedidos/{id}/confirmar/
    AP->>S: confirmar_pedido (exige pago aprobado)
    S->>DB: estado confirmado
    AP-->>V: 200 OK
    V->>AP: POST .../en-preparacion/
    AP-->>V: 200 OK, estado en_preparacion
    V->>AP: POST .../enviar/
    AP-->>V: 200 OK, estado en_camino
    C->>AP: POST .../entregar/ (confirma recepción)
    AP->>S: marcar_entregado
    S->>DB: estado entregado
    AP-->>C: 200 OK
    Note over C,AP: Si no llega, el comprador usa POST .../no-recibido/ y el administrador resuelve
```

## 2. Retiro con pago al recoger y «Entregar y cobrar»

Código: `crearPedidoConPagoAlRecoger` en `frontend/src/api/orders.ts`, `_exigir_pago_para_confirmar`,
`_cerrar_cobro_en_mano` y `_plazo_al_pasar_a` en `apps/orders/services.py`, `confirmar_efectivo` en
`apps/payments/services.py` ([ADR-009](ADR-009-retiro-y-pago-al-recoger.md)). El cobro y la entrega
ocurren en **una sola transacción**: si el cobro falla, el pedido no queda entregado.

```mermaid
sequenceDiagram
    autonumber
    actor C as Comprador (SPA)
    participant AP as API pedidos
    participant S as orders.services
    participant DB as PostgreSQL
    participant AG as API pagos
    actor V as Vendedor (SPA)

    C->>AP: POST /api/orders/pedidos/ (retiro)
    AP->>S: crear_pedido
    S->>DB: descuenta stock, guarda vence_en = ahora + plazo de confirmación (24 h)
    AP-->>C: 201 Created, estado pendiente
    C->>AG: POST /api/payments/pagos/ (efectivo)
    AG->>DB: pago efectivo pendiente
    AG-->>C: 201 Created
    V->>AP: POST .../confirmar/
    AP->>S: confirmar_pedido
    Note over S,DB: Excepción de ADR-009: un retiro con efectivo registrado se confirma sin cobro previo
    S->>DB: estado confirmado, vence_en = NULL
    V->>AP: POST .../en-preparacion/
    V->>AP: POST .../listo-para-recoger/
    AP->>S: marcar_listo_para_recoger
    S->>DB: estado listo_para_recoger, vence_en = ahora + plazo del puesto (2 a 72 h)
    AP-->>V: 200 OK
    Note over C,V: El cliente pasa por el puesto
    V->>AP: POST .../entregar/ (Entregar y cobrar)
    AP->>S: marcar_entregado
    S->>DB: BEGIN, SELECT pedido FOR UPDATE
    S->>AG: _cerrar_cobro_en_mano, confirmar_efectivo
    AG->>DB: pago aprobado (comisión y neto del vendedor)
    S->>DB: estado entregado, vence_en = NULL, COMMIT
    AP-->>V: 200 OK
    Note over C,S: El comprador no puede cerrar un efectivo sin cobrar: lo hace el vendedor o el administrador
```

## 3. Apartar con plazo: liberación automática del stock

Código: `LiberarApartadosMiddleware` (`apps/orders/middleware.py`), `barrer_si_toca`, `barrer`,
`_procesar_vencido` y `cancelar_vencidos` (`apps/orders/vencimientos.py`), `_aplicar_transicion`
(`apps/orders/services.py`) y el arranque `scripts/render-start.sh`
([ADR-012](ADR-012-apartar-con-plazo.md)). No hay cron: el barrido es **perezoso** (al leer, como mucho
una vez por minuto por proceso) y también corre al arrancar el servicio.

```mermaid
sequenceDiagram
    autonumber
    actor U as Cualquier persona (SPA)
    participant M as LiberarApartadosMiddleware
    participant K as Caché (candado de 1 min)
    participant B as vencimientos.barrer
    participant DB as PostgreSQL
    participant N as Notificaciones y auditoría

    U->>M: GET /api/catalog/productos/ (o puestos, pedidos, pagos)
    M->>K: cache.add(candado)
    alt el candado ya existe
        K-->>M: False
        Note over M: no barre, la lectura sigue normal
    else el candado es nuevo
        K-->>M: True
        M->>B: barrer_si_toca, límite por barrido
        B->>DB: una consulta de candidatos con vence_en vencido
        loop cada pedido vencido, en su propia transacción
            B->>DB: SELECT pedido FOR UPDATE SKIP LOCKED
            alt otra petición lo tiene bloqueado (Entregar y cobrar o un pago)
                DB-->>B: sin fila, se omite
            else el pedido sigue vencido
                B->>DB: relee el pago bajo bloqueo
                alt el pago ya está aprobado o el estado cambió
                    B->>DB: quita vence_en y no cancela
                else corresponde cancelar
                    B->>DB: repone stock solo de ítems con stock, libera cupón, anula el pago
                    B->>DB: estado cancelado con motivo (no recogido o no confirmado)
                    B->>N: notifica comprador y vendedor, audita como Sistema
                end
            end
        end
    end
    M-->>U: la respuesta ya muestra el stock liberado
    Note over B,DB: El mismo barrido corre con manage.py cancelar_pedidos_vencidos al arrancar en Render
```

## 4. Producto por encargo

Código: `crear_pedido`, `_validar_linea_de_encargo`, `_resolver_fecha_solicitada` y
`_plazo_al_pasar_a` en `apps/orders/services.py`, `_reponer_stock`
([ADR-013](ADR-013-productos-por-encargo.md)). Un encargo no usa stock: se valida su cantidad máxima
(20), sus detalles y la fecha pedida (desde la mayor preparación del pedido hasta 60 días). «Aceptar»
es el mismo `confirmar` de siempre.

```mermaid
sequenceDiagram
    autonumber
    actor C as Comprador (SPA)
    participant AP as API pedidos
    participant S as orders.services
    participant DB as PostgreSQL
    actor V as Vendedor (SPA)

    C->>AP: POST /api/orders/pedidos/ (retiro, ítem por encargo con detalles, fecha_solicitada)
    AP->>S: crear_pedido
    S->>DB: bloquea productos, valida detalles, cantidad máxima y fecha
    Note over S,DB: El producto por encargo no valida ni descuenta stock. Un producto con stock del mismo pedido sí
    S->>DB: guarda pedido con fecha_solicitada y vence_en = el menor entre el plazo y la fecha pedida
    AP-->>C: 201 Created, estado pendiente
    S-->>V: notificación de encargo nuevo con la fecha
    C->>AP: POST /api/payments/pagos/ (efectivo)
    V->>AP: POST .../confirmar/ (aceptar el encargo)
    AP->>S: confirmar_pedido
    S->>DB: estado confirmado, vence_en = NULL
    S-->>C: notificación de encargo aceptado
    V->>AP: POST .../en-preparacion/
    V->>AP: POST .../listo-para-recoger/
    S->>DB: vence_en = plazo del puesto contado desde la fecha pedida si aún no llegó
    V->>AP: POST .../entregar/ (Entregar y cobrar)
    AP-->>V: 200 OK, entregado
    Note over C,V: En domicilio el comprador paga antes y, si el puesto no puede, cancela y se reembolsa
    Note over S,DB: Al cancelar solo se repone el stock de los ítems con stock
```

## 5. Despliegue

Fuentes: `.github/workflows/ci.yml`, `render.yaml`, `Dockerfile.render`, `scripts/render-start.sh` y
[docs/despliegue.md](despliegue.md).

```mermaid
flowchart LR
    DEV[Desarrollo local] -->|push o PR| GH[GitHub]
    GH -->|ejecuta| CI

    subgraph CI [GitHub Actions: ci.yml]
        direction TB
        T1[Trabajo test: ruff, migraciones, pytest en PostgreSQL 16, OpenAPI, matriz de trazabilidad]
        T2[Trabajo frontend: lint, typecheck, vitest, build]
    end

    GH -->|push a main, autoDeploy| RD[Render: Blueprint render.yaml]
    RD --> IMG[Docker multietapa: Node 22 compila la SPA, Python 3.12 la comprime y empaqueta]
    IMG --> START[render-start.sh: collectstatic, migrate, createcachetable, seeds, miniaturas, cancelar_pedidos_vencidos]
    START --> APP[gunicorn 2 procesos x 4 hilos: Django, WhiteNoise sirve la SPA y /api]
    APP <-->|DATABASE_URL| PG[(PostgreSQL 16, por ejemplo Supabase)]
    APP <-->|S3 compatible| ST[(Almacenamiento S3 compatible, por ejemplo Supabase Storage: bucket público para fotos y privado para cédulas)]
    BR[Navegador: SPA y /api en el mismo origen] -->|HTTPS| APP
    BR -->|teselas del mapa| OSM[OpenStreetMap]
    RD -.->|health check| H["/api/health/"]
    APP --- H
    NOTA[Plan gratis de Render: el servicio se duerme tras inactividad y el disco es efímero]
    RD --- NOTA
```

Notas: `DATABASE_URL` y las claves de almacenamiento las define el dueño en Render (no están en el
repositorio). Sin las variables `STORAGE_S3_*` el sistema usa el disco local, que es efímero en Render
(las fotos demo se recrean en cada arranque con `seed_imagenes_demo`). El CI usa un contenedor de
PostgreSQL 16 solo para las pruebas.

## 6. Estados del pedido por tipo de entrega

Tablas reales: `TRANSICIONES_POR_TIPO` en `apps/orders/services.py`. «Cancelado por el sistema» es el
barrido de vencidos de la sección 3 (solo retiros, solo desde `pendiente` o `listo_para_recoger`).

### Domicilio

```mermaid
stateDiagram-v2
    [*] --> pendiente: comprador crea
    pendiente --> confirmado: vendedor (pago aprobado)
    pendiente --> cancelado: comprador, vendedor o administrador
    confirmado --> en_preparacion: vendedor
    confirmado --> cancelado: comprador, vendedor o administrador
    en_preparacion --> en_camino: vendedor
    en_preparacion --> cancelado: comprador, vendedor o administrador
    en_camino --> entregado: comprador (o administrador)
    entregado --> [*]
    cancelado --> [*]
```

### Retiro en el puesto

```mermaid
stateDiagram-v2
    [*] --> pendiente: comprador crea (con vence_en)
    pendiente --> confirmado: vendedor (basta el efectivo registrado)
    pendiente --> cancelado: comprador, vendedor, administrador o el sistema por plazo
    confirmado --> en_preparacion: vendedor
    confirmado --> cancelado: comprador, vendedor o administrador
    en_preparacion --> listo_para_recoger: vendedor
    en_preparacion --> cancelado: comprador, vendedor o administrador
    listo_para_recoger --> entregado: vendedor entrega y cobra (o comprador y administrador si ya está pagado)
    listo_para_recoger --> cancelado: comprador, vendedor, administrador o el sistema por plazo
    entregado --> [*]
    cancelado --> [*]
```

## Cómo se validaron

Los siete bloques Mermaid de este archivo se validaron con el analizador oficial de `mermaid`
(`mermaid.parse`, versión 11.4.1, la librería que usa GitHub para dibujarlos) ejecutado en Node con
`jsdom`, en una carpeta temporal fuera del repositorio: no se añadió ninguna dependencia al proyecto.
El mismo script rechaza un diagrama con errores de sintaxis, lo que comprueba que la validación no es
vacía. Para repetirlo:

```bash
mkdir /tmp/mmd && cd /tmp/mmd && npm init -y && npm install mermaid@11.4.1 jsdom@25
# validar.mjs: carga jsdom como window/document, importa mermaid y llama a mermaid.parse(bloque)
# por cada bloque de código mermaid del archivo; sale con código 1 si alguno falla.
```

El analizador valida la sintaxis, no el aspecto: la vista previa de GitHub es la comprobación visual.
