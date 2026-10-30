# RioMarket

> Inferido del repositorio y del encargo del dueño («hazla como te parezca mejor»), sin entrevista.
> Los puntos marcados *(inferido)* no los ha confirmado el dueño.

## Qué es

Marketplace local para los puestos de mercado de Riohacha (La Guajira, Colombia). Conecta a vendedores
de puesto con compradores de la ciudad sin que el vendedor tenga que montar una tienda propia.

## Usuarios y tareas

- **Comprador:** habitante de Riohacha, casi siempre desde el celular *(inferido)*. Busca un producto o
  un puesto, arma un pedido, paga en efectivo o por el medio disponible, y sigue el pedido hasta recibirlo.
- **Vendedor:** dueño de un puesto, con poca experiencia en herramientas digitales *(inferido)*. Se
  verifica, publica productos, confirma, prepara y envía pedidos, y confirma cobros en efectivo.
- **Administrador:** verifica vendedores, modera puestos y productos, atiende pedidos y usuarios, y
  administra roles y recursos.

## Hechos que el diseño debe respetar

- Un pedido pertenece a **un solo puesto**. El carrito no mezcla puestos.
- Estados del pedido: pendiente, confirmado, en preparación, en camino, entregado o cancelado. El
  vendedor confirma, prepara y envía; solo el comprador (o un admin) confirma la entrega y puede reportar
  «no me ha llegado».
- Entrega a domicilio o retiro en el puesto.
- Los vendedores se verifican con su identidad antes de publicar.
- Pagos: efectivo confirmado por el vendedor y modo de prueba. **No hay pasarela real**.
- Reseñas solo de pedidos entregados. Cupones por puesto.
- Moneda: pesos colombianos. Idioma: español de Colombia.

## Voz

Directa y cercana, de tú, como en el mercado. Sin promesas que el producto no pueda sostener: no afirmar
«del día», «sin intermediarios», «pago seguro» ni cifras que el sistema no demuestre.

## Activos y restricciones

- Nombre: RioMarket. No hay logo ni marca registrada que preservar *(inferido)*.
- Las fotos las suben los vendedores: varían en calidad y pueden faltar. La interfaz debe verse bien con
  fotos malas o sin foto, y con pocos productos.
- Los motivos culturales wayuu pertenecen a ese pueblo: no usarlos como decoración.

## Plataforma

`web`: SPA responsive, prioridad móvil *(inferido)*. Tema claro y oscuro existentes. WCAG AA.
Se despliega en Render gratis: páginas ligeras y una CSP estricta (`script-src 'self'`).
