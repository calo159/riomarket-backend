import { COMPRADOR, expect, iniciarSesion, test } from './fixtures';

/**
 * Recorridos del comprador (celular). Cada prueba usa su propio comprador del seed y cancela
 * al terminar lo que creó, así el stock vuelve a su valor y el orden de ejecución no importa.
 */

test('compra en retiro con pago al recoger y ve cuándo vence', async ({ page, api, limpiarPedido }) => {
  const sesion = await api(COMPRADOR.retiro);
  await iniciarSesion(page, COMPRADOR.retiro, /\/tienda$/);

  await page.getByRole('combobox', { name: 'Buscar productos' }).fill('jugo de corozo');
  await page.getByRole('combobox', { name: 'Buscar productos' }).press('Enter');
  await expect(page).toHaveURL(/\/catalogo\?q=jugo/);
  await page.getByRole('button', { name: 'Agregar Jugo de corozo al carrito' }).click();

  await page.getByRole('navigation', { name: 'Navegación' }).getByRole('link', { name: /^Carrito, 1 producto/ }).click();
  await expect(page.getByRole('heading', { name: 'Tu carrito', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar con la compra' }).click();

  await expect(page.getByText('Pagas en el puesto al recoger (efectivo)')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();

  await expect(page).toHaveURL(/\/pedidos\/\d+/);
  const id = Number(new URL(page.url()).pathname.split('/').pop());
  limpiarPedido(sesion, id);

  await expect(page.getByText('Tu pedido fue creado. Pasa por el puesto cuando esté listo. Pagas ahí.')).toBeVisible();
  await expect(page.getByText(/Si el puesto no lo confirma antes del .*, el pedido se cancela solo\./)).toBeVisible();
});

/** Fecha local `AAAA-MM-DDTHH:mm` (lo que acepta un `datetime-local`) a los `dias` días, a las 10:00. */
function fechaLocal(dias: number, hora = 10): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(hora)}:00`;
}

test('encarga una bandeja con detalles y fecha', async ({ page, api, limpiarPedido }) => {
  const sesion = await api(COMPRADOR.encargo);
  await iniciarSesion(page, COMPRADOR.encargo, /\/tienda$/);

  await page.getByRole('combobox', { name: 'Buscar productos' }).fill('papaya con queso');
  await page.getByRole('combobox', { name: 'Buscar productos' }).press('Enter');
  await page.getByRole('link', { name: 'Bandeja de dulce de papaya con queso' }).first().click();

  await expect(page.getByText(/Por encargo/).first()).toBeVisible();
  await page.getByLabel('Para cuántas personas y qué nota quieres').fill('Para 8 personas. Que diga: Felicidades Ana');
  await page.getByRole('button', { name: 'Comprar ahora' }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  const fecha = page.getByLabel('Fecha y hora para recogerlo');
  // El campo no admite fechas anteriores al mínimo que fija el puesto.
  await fecha.fill(fechaLocal(0, 8));
  expect(await fecha.evaluate((input: HTMLInputElement) => input.validity.rangeUnderflow)).toBe(true);
  await fecha.fill(fechaLocal(5));
  expect(await fecha.evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(true);
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();

  await expect(page).toHaveURL(/\/pedidos\/\d+/);
  limpiarPedido(sesion, Number(new URL(page.url()).pathname.split('/').pop()));
  await expect(page.getByText('Tu encargo fue enviado.', { exact: false })).toBeVisible();
  await expect(page.getByText('Para 8 personas. Que diga: Felicidades Ana', { exact: false })).toBeVisible();
  await expect(page.getByText(/Encargo para el /)).toBeVisible();
});
