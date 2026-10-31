import { COMPRADOR, expect, iniciarSesion, test } from './fixtures';

/**
 * Recorridos de la vendedora Carmen (dueña de «Palenque de Carmen» y «Dulces de Carmen»).
 * Los pedidos los crea por la API un comprador del seed que solo usa cada prueba; así la
 * vendedora ve pedidos nuevos y las demás pruebas no se enteran.
 */

const CARMEN = 'carmen@riomarket.test';

test('avanza un retiro hasta entregar y cobrar', async ({ page, api, limpiarPedido }) => {
  const comprador = await api(COMPRADOR.vendedorCobra);
  const arepa = await comprador.idProducto('Arepa de huevo');
  const pedido = await comprador.crearPedidoRetiro({
    id_puesto: arepa.puesto,
    items: [{ id_producto: arepa.id, cantidad: 1 }],
  });
  // Si la prueba falla antes de entregar, el pedido se cancela y el stock vuelve solo.
  limpiarPedido(comprador, pedido.id);

  try {
    await iniciarSesion(page, CARMEN, /\/vendedor$/);
    await page.goto('/vendedor/pedidos');
    const tarjeta = page.getByRole('article').filter({ has: page.getByRole('link', { name: `Pedido #${pedido.id}` }) });

    await tarjeta.getByRole('button', { name: 'Confirmar pedido' }).click();
    await tarjeta.getByRole('button', { name: 'Pasar a preparación' }).click();
    await tarjeta.getByRole('button', { name: 'Marcar listo para recoger' }).click();
    await expect(tarjeta.getByText('Esperando al cliente en el puesto. Entrega el pedido y cobra en efectivo.')).toBeVisible();
    await expect(tarjeta.getByText(/Vence el .* · quedan /)).toBeVisible();
    await tarjeta.getByRole('button', { name: 'Entregar y cobrar' }).click();
    await expect(tarjeta.getByText('Entregado', { exact: true })).toBeVisible();

    // La entrega y el cobro son una sola operación: el pago queda aprobado.
    await page.goto(`/pedidos/${pedido.id}`);
    await expect(page.getByText('Aprobado').first()).toBeVisible();
  } finally {
    // Un pedido entregado no se cancela: la vendedora repone la unidad que se vendió.
    const { estado } = await comprador.obtener<{ estado: string }>(`/api/orders/pedidos/${pedido.id}/`);
    if (estado === 'entregado') await (await api(CARMEN)).reponerStock(arepa.id, 1);
  }
});

test('acepta un encargo y queda confirmado', async ({ page, api, limpiarPedido }) => {
  const comprador = await api(COMPRADOR.vendedorAcepta);
  const bandeja = await comprador.idProducto('Bandeja de dulce de papaya con queso');
  const fecha = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
  fecha.setMinutes(0, 0, 0);
  const pedido = await comprador.crearPedidoRetiro({
    id_puesto: bandeja.puesto,
    fecha_solicitada: fecha.toISOString(),
    items: [{ id_producto: bandeja.id, cantidad: 1, detalles: 'Sin nueces. Que diga: Felicidades' }],
  });
  limpiarPedido(comprador, pedido.id);

  await iniciarSesion(page, CARMEN, /\/vendedor$/);
  await page.goto('/vendedor/pedidos');
  const tarjeta = page.getByRole('article').filter({ has: page.getByRole('link', { name: `Pedido #${pedido.id}` }) });

  await expect(tarjeta.getByText(/Encargo · /)).toBeVisible();
  await expect(tarjeta.getByText('Sin nueces. Que diga: Felicidades', { exact: false })).toBeVisible();
  await tarjeta.getByRole('button', { name: 'Aceptar encargo' }).click();
  await expect(tarjeta.getByText('Confirmado', { exact: true })).toBeVisible();
  await expect(tarjeta.getByRole('button', { name: 'Aceptar encargo' })).toHaveCount(0);
});

test('abre su panel de ventas y lo ve por día en una tabla', async ({ page }) => {
  await iniciarSesion(page, CARMEN, /\/vendedor$/);
  await page.goto('/vendedor/ventas');

  await expect(page.getByRole('heading', { name: 'Ventas', level: 1 })).toBeVisible();
  for (const tarjeta of ['Ingreso neto', 'Pedidos pagados', 'Ticket promedio']) {
    await expect(page.getByText(tarjeta, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('region', { name: 'Lo que más vendes' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Pedidos del periodo' })).toBeVisible();

  // Con 7 días, la tabla trae exactamente una fila por día.
  await page.getByRole('button', { name: '7 días' }).click();
  await expect(page.getByRole('button', { name: '7 días' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('tab', { name: 'Tabla' }).click();
  await expect(page.getByRole('region', { name: 'Ventas por día' }).locator('tbody tr')).toHaveCount(7);
});
