# Guion de presentación (5 minutos)

Demostración cronometrada de RioMarket con las cuentas del seed (`seed_masivo`). Cada paso lleva el
resultado que se espera ver; todos se comprobaron ejecutándolos contra un servidor local (ver
«Cómo se verificó este guion»). Los textos entre «» son los de la pantalla.

## Cuentas

Contraseña de todas: `RioMarket2026!` (es la del seed y ya es pública en el README).

| Rol | Correo | Qué muestra en la demo |
| --- | --- | --- |
| Comprador | `luis@riomarket.test` | Compra en retiro y encargo |
| Vendedor aprobado | `carmen@riomarket.test` | Dueña de «Palenque de Carmen» y «Dulces de Carmen»: pedidos, cobro y ventas |
| Administrador | `admin@riomarket.test` | Resumen, auditoría, usuarios y roles |
| Vendedor aprobado | `diego@riomarket.test` | «Tejidos Guajiro» y «Pescadería La Bahía» (de reserva) |
| Vendedor aprobado | `rosa@riomarket.test` | «Frutas del Caribe» (dueña del pedido que se cancela solo) |

Otros usuarios del seed: `jose@riomarket.test` (vendedor, «Cocina de la Abuela») y compradores
`ana`, `andres`, `diana`, `jorge`, `kevin`, `laura`, `mario`, `sara` y `yuli` (todos `@riomarket.test`).

## Antes de empezar (2 minutos antes)

1. **Despertar el servicio** si es el de Render: abrir `https://riomarket-y67g.onrender.com/api/health/`
   (el plan gratis duerme el servicio y la primera respuesta tarda cerca de un minuto). Debe
   responder `{"status": "ok", "database": "up"}`.
2. Tener **tres ventanas** (o perfiles) del navegador: comprador, vendedor y administrador. Así no se
   pierde tiempo cerrando y abriendo sesión. La sesión del comprador se ve mejor en el celular o con
   DevTools a 390 px.
3. El seed corre **en cada despliegue** y es idempotente: no duplica nada ni recrea pedidos. Por eso el
   guion **no depende de números de pedido**: crea sus propios pedidos y los localiza por contenido. Solo
   el pedido `[SM-31]` (ver 4:00) se identifica por la fila de la auditoría.
4. Cada ensayo gasta 1 unidad de «Jugo de corozo» y deja pedidos nuevos; no rompe nada, pero el
   «Ingreso neto» del panel de ventas sube con cada ensayo.

## Guion

| Minuto | Quién | Qué mostrar | Qué decir (una frase) |
| --- | --- | --- | --- |
| 0:00–0:30 | anónimo, celular (390 px) | `/` y «Ir a la tienda» | Mercado de Riohacha en el celular |
| 0:30–1:30 | `luis@` | Buscar, agregar y pedir en retiro | El stock se aparta al crear el pedido |
| 1:30–2:15 | `luis@` | Encargar la «Bandeja de dulce de papaya con queso» | Productos por encargo |
| 2:15–3:15 | `carmen@` | Aceptar, preparar, marcar listo y «Entregar y cobrar» | Pago al recoger |
| 3:15–4:00 | `carmen@` | `/vendedor/ventas` | Panel de ventas con consultas fijas |
| 4:00–4:40 | `admin@` | Resumen, auditoría «Sistema · vencimiento» y roles | Trazabilidad y control |
| 4:40–5:00 | cualquiera | GitHub Actions en verde y `docs/trazabilidad.md` | Cada requisito tiene su prueba |

### 0:00–0:30 · Portada y tienda (anónimo, 390 px)

1. Abrir `/`. Se ve un solo título: «Haz el mercado desde el celular.»
2. Pulsar «Ir a la tienda». Abre `/tienda` («RioMarket, el mercado de Riohacha en línea») con los
   puestos «Cocina de la Abuela», «Dulces de Carmen», «Frutas del Caribe» y «Palenque de Carmen».

### 0:30–1:30 · Compra en retiro (`luis@`)

1. «Ingresar» con `luis@riomarket.test` (en el login hay además «Acceso rápido de demostración» con
   botones Comprador, Vendedor y Admin cuando la compilación tiene `VITE_DEMO_MODE=true`). Aterriza en
   `/tienda`.
2. En la barra «Buscar productos y puestos» escribir `jugo de corozo` y Enter (abre
   `/catalogo?q=jugo+de+corozo`). Pulsar el botón «Agregar Jugo de corozo al carrito».
3. `/carrito` (Pedido a Palenque de Carmen, $ 5.000) → «Continuar con la compra».
4. `/checkout`: «Retiro en el puesto» está elegido y dice «Te apartamos el pedido. Si no lo recoges a
   tiempo, se cancela solo.»; abajo, «Pagas en el puesto al recoger (efectivo)». Pulsar «Confirmar pedido».
5. Se abre `/pedidos/N`: «Tu pedido fue creado. Pasa por el puesto cuando esté listo. Pagas ahí.», el
   aviso «Si el puesto no lo confirma antes del …, el pedido se cancela solo. Quedan 23 h 59 min.» y el
   pago `efectivo` en «Pendiente». Anotar el número N: es el pedido de retiro.

### 1:30–2:15 · Producto por encargo (`luis@`)

1. Buscar `papaya con queso` y abrir «Bandeja de dulce de papaya con queso»: «Por encargo · listo en
   ~2 días», $ 45.000, de «Dulces de Carmen».
2. En «Para cuántas personas y qué nota quieres» escribir, por ejemplo, `Para 8 personas. Que diga:
   Felicidades Ana` y pulsar «Comprar ahora».
3. En `/checkout` aparece el paso «2. ¿Para cuándo lo necesitas?» con «Lo más pronto: …». Elegir una
   fecha y hora **posteriores** a ese mínimo (por ejemplo, dentro de 3 días a las 10:00) y «Confirmar
   pedido».
4. `/pedidos/M`: «Tu encargo fue enviado. El puesto lo revisa y lo acepta o te avisa si no puede. Pagas
   al recoger.», con «Detalles: …» y «Encargo para el …». Anotar M.

### 2:15–3:15 · El puesto atiende y cobra (`carmen@`)

1. Iniciar sesión como `carmen@riomarket.test` y abrir `/vendedor/pedidos`. Arriba están los dos pedidos
   nuevos, con «Vence el … · quedan 23 h 59 min».
2. En el encargo (`#M`): «Aceptar encargo» → pasa a «Confirmado». (Es el mismo «Confirmar» de siempre.)
3. En el retiro (`#N`): «Confirmar pedido» → «Pasar a preparación» → «Marcar listo para recoger». La
   tarjeta muestra «Vence el … · quedan 1 día» y «Esperando al cliente en el puesto. Entrega el pedido
   y cobra en efectivo.»; ahora hay «Entregar y cobrar» y «Dar 24 h más».
4. (Opcional, en la ventana de Luis, `/pedidos/N`): «Tu pedido está listo. Pasa por el puesto a
   recogerlo y págalo ahí en efectivo. Recógelo antes del …».
5. Pulsar «Entregar y cobrar»: el pedido pasa a «Entregado». En `/pedidos/N` el pago queda «Aprobado» con
   la referencia `efectivo-cobrado`: la entrega y el cobro ocurrieron en una sola operación.

### 3:15–4:00 · Panel de ventas (`carmen@`)

Abrir `/vendedor/ventas` («Lo que cobraste en tus puestos. Cuenta solo pagos aprobados.»):

- Selector de periodo (7, 30 o 90 días) y «Todos mis puestos / Dulces de Carmen / Palenque de Carmen».
- Tarjetas «Ingreso neto» («Después de la comisión y los cupones»), «Ventas», «Pedidos pagados» y
  «Ticket promedio».
- «Ventas por día» con el interruptor «Gráfico / Tabla», «Lo que más vendes» (los 5 productos
  más vendidos) y «Pedidos del periodo» por estado.

En la base limpia de la verificación, tras una sola demostración completa, se leyó: Ventas $ 90.500,
Pedidos pagados 8, Ingreso neto $ 83.975. Las cifras exactas dependen del día en que se sembró la base;
lo que debe verse es que el cobro del paso anterior ya está contado.

### 4:00–4:40 · Administración (`admin@`)

1. `/admin`: «Panel de administración», bloque «Requiere atención», «Resumen general» y «Ventas del
   mercado · últimos 30 días» con el selector «Todos los puestos» (el mercado completo).
2. `/admin/auditoria`: buscar la fila con usuario **«Sistema»**, acción **vencimiento** y entidad
   `pedido #K`. Es el barrido que cancela los retiros no recogidos (se ejecuta al arrancar el servicio y
   al leer el catálogo). Abrir `/pedidos/K`: «Se canceló solo: no se recogió antes del …» y la nota
   `[SM-31]`: es el pedido de demostración cuyo plazo nace vencido a propósito.
3. `/admin/roles`: pestañas «Lista» y «Matriz» (el menú de cada persona sale de los recursos de sus
   roles; ver README, «Administración y RBAC»).

### 4:40–5:00 · Evidencia

Mostrar la pestaña **Actions** del repositorio (CI en verde) y [`trazabilidad.md`](trazabilidad.md):
cada requisito enlazado a su pantalla, su endpoint y su prueba, verificado en el CI.

## Si algo falla (plan B)

- **Render dormido o caído:** demostrar en local. Con Python 3.12 y Node 22.12+:
  `python manage.py migrate`, `python manage.py seed_masivo`, `python manage.py seed_imagenes_demo`,
  `python manage.py runserver 127.0.0.1:8000` y, en otra terminal, `cd frontend && npm run dev`;
  abrir <http://127.0.0.1:3000> (con `127.0.0.1`, no `localhost`: la cookie es `SameSite=Strict`).
  Para que el pedido `[SM-31]` aparezca ya cancelado: `python manage.py cancelar_pedidos_vencidos`.
- **No hay conexión:** la PWA solo muestra una página «sin conexión»; no sirve la app. Usar el plan local.
- **Un botón no aparece:** la pantalla solo pinta las acciones que el backend permite
  (`acciones_permitidas`). Revisar con qué cuenta se entró y el estado del pedido.

## Mensajes clave

- Un pedido pertenece a **un solo puesto**; el servidor calcula montos, congela precios y descuenta el
  stock de forma transaccional.
- Pago al recoger y apartar con plazo: lo que no se recoge a tiempo se libera solo, sin cron.
- Los permisos viven en el backend (RBAC por recursos); el frontend solo pinta lo permitido.
- Refresh en cookie HttpOnly y acceso en memoria; cédulas cifradas y fotos privadas.
- Auditoría de acciones sensibles, incluidas las del sistema.

## Preguntas frecuentes

| Pregunta | Respuesta corta |
| --- | --- |
| ¿Por qué no hay pasarela real? | El alcance es académico: existe `PasarelaSandbox` (ADR-003) y el efectivo al recoger. Con una pasarela real se apaga `PAYMENTS_SANDBOX_ENABLED` y se integra el proveedor; el webhook ya valida firma, monto y ventana de tiempo. |
| ¿Por qué la liberación es «perezosa»? | Render gratis no tiene cron ni procesos en segundo plano (ADR-012). El barrido corre al arrancar y, como mucho una vez por minuto, cuando alguien lee el catálogo o los pedidos. Con un cron de pago bastaría llamar al mismo comando. |
| ¿Cómo se evita reponer dos veces el stock? | Toda cancelación pasa por una sola función que bloquea el pedido (`select_for_update`), relee su estado y repone dentro de la misma transacción; hay pruebas de doble cancelación (`test_concurrencia.py`) y de barridos repetidos (`test_vencimientos.py`). |
| ¿Y si el barrido choca con «Entregar y cobrar»? | El barrido bloquea con `skip_locked` (PostgreSQL): si el vendedor tiene el pedido, se salta, y reverifica el pago bajo bloqueo antes de cancelar. |
| ¿Por qué gráficos propios? | Para no añadir una librería: son barras SVG con alternativa en tabla accesible (ADR-014). |
| ¿Por qué cookie HttpOnly para el refresh? | El JavaScript no puede leerla, lo que reduce el robo por XSS; el acceso dura 15 minutos y vive solo en memoria. |
| ¿Cómo protegen la cédula? | Cifrado Fernet en reposo, huella HMAC para detectar duplicados y foto en almacenamiento privado servida solo al administrador. |
| ¿La contraseña demo es un riesgo? | Es pública a propósito, los datos son ficticios y el sandbox no mueve dinero real; está documentado como límite en [SECURITY.md](../SECURITY.md). |
| ¿Qué falta para producción real? | Pasarela real, SMTP, almacenamiento duradero, MFA para administradores, retención de la auditoría y rotación de las claves del historial (ver [SEGURIDAD.md](../SEGURIDAD.md)). |

## Cómo se verificó este guion

El 31/10/2026 se sembró una base **limpia** (`migrate`, `seed_masivo`, `seed_imagenes_demo`,
`generar_miniaturas` y `cancelar_pedidos_vencidos`, dos veces seguidas para imitar dos despliegues) y se
ejecutó el guion completo con Playwright (Chromium) contra el servidor local (Django en el puerto 8000 y
Vite en el 3000), con las cuentas del seed. Todos los textos y resultados de arriba son los observados.
La ejecución automática dura cerca de un minuto; **no se cronometró una persona real**: ensáyese una vez
para confirmar los 5 minutos. No se ejecutó contra Render (estaba suspendido).
