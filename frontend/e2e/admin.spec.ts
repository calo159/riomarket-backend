import type { Page } from '@playwright/test';
import { expect, iniciarSesion, test } from './fixtures';

/**
 * Recorridos de la administradora (`admin@riomarket.test`). Son de solo lectura: no cambian nada.
 *
 * Se navega con el menú del panel y no con `page.goto('/admin/...')`: el servidor entrega las rutas
 * `/admin/...` al administrador de Django cuando se escriben en la barra de direcciones (ver
 * docs/ADR-016-pruebas-end-to-end.md), así que el recorrido real de la persona es el del menú.
 */

test.beforeEach(async ({ page }) => {
  await iniciarSesion(page, 'admin@riomarket.test', /\/admin$/);
});

const menu = (page: Page) => page.getByRole('navigation', { name: 'Navegación del panel' });

test('ve el resumen y las ventas del mercado', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Panel de administración', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Requiere atención' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resumen general' })).toBeVisible();

  const ventas = page.getByRole('region', { name: /^Ventas del mercado/ });
  await expect(ventas).toBeVisible();
  await expect(ventas.getByRole('combobox', { name: 'Puesto' })).toHaveValue('');
  await expect(ventas.getByText('Ingreso neto', { exact: true })).toBeVisible();
});

test('ve en la auditoría el vencimiento hecho por el sistema y el pedido vencido', async ({ page }) => {
  await menu(page).getByRole('link', { name: 'Auditoría' }).click();
  await expect(page.getByRole('heading', { name: 'Auditoría', level: 1 })).toBeVisible();

  // La auditoría muestra las últimas 100 acciones; el barrido que cancela los retiros no recogidos
  // (el pedido de demostración [SM-31] nace vencido) se hace al preparar la base, antes que las demás.
  const fila = page.getByRole('row').filter({ hasText: 'Sistema' }).filter({ hasText: 'vencimiento' }).first();
  await expect(fila).toBeVisible();
  const entidad = (await fila.getByRole('cell').nth(3).innerText()).trim();
  const idPedido = /^pedido #(\d+)$/.exec(entidad)?.[1];
  expect(idPedido, `La fila de vencimiento debe ser de un pedido, no «${entidad}»`).toBeTruthy();

  await page.goto(`/pedidos/${idPedido}`);
  await expect(page.getByText(/Se canceló solo: no se recogió antes del /)).toBeVisible();
});

test('consulta los usuarios y los roles', async ({ page }) => {
  await menu(page).getByRole('link', { name: 'Usuarios' }).click();
  await expect(page.getByRole('heading', { name: 'Usuarios', level: 1 })).toBeVisible();
  await page.getByRole('textbox', { name: 'Buscar usuario' }).fill('carmen@');
  const filas = page.getByRole('row').filter({ hasText: 'carmen@riomarket.test' });
  await expect(filas).toHaveCount(1);
  await expect(filas.getByText('Vendedor')).toBeVisible();
  await expect(filas.getByRole('button', { name: 'Gestionar acceso' })).toBeVisible();

  await menu(page).getByRole('link', { name: 'Roles' }).click();
  await expect(page.getByRole('heading', { name: 'Roles', level: 1 })).toBeVisible();
  for (const rol of ['administrador', 'comprador', 'vendedor']) {
    await expect(page.getByRole('heading', { level: 2, name: new RegExp(`^${rol}`) })).toBeVisible();
  }
  await page.getByRole('tab', { name: 'Matriz' }).click();
  await expect(page.getByRole('tab', { name: 'Matriz' })).toHaveAttribute('aria-selected', 'true');
});
