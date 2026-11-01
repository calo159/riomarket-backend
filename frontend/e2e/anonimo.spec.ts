import type { ConsoleMessage, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * Recorridos de una persona sin sesión. Además de ver cada pantalla, comprueban que carga sin
 * errores de consola. Se toleran dos casos que no son fallos de la aplicación:
 * - el 401 de la sesión (el refresh de quien no ha iniciado sesión);
 * - las teselas del mapa (tile.openstreetmap.org), que dependen de internet y el CI no las pide.
 */

function esRuidoEsperado(mensaje: ConsoleMessage): boolean {
  const { url } = mensaje.location();
  if (url && new URL(url).hostname === 'tile.openstreetmap.org') return true;
  return /status of 401/.test(mensaje.text());
}

/** Recoge los errores de consola y de la página mientras corre la prueba. */
function vigilarErrores(page: Page): () => string[] {
  const errores: string[] = [];
  page.on('console', (mensaje) => {
    if (mensaje.type() === 'error' && !esRuidoEsperado(mensaje)) errores.push(mensaje.text());
  });
  page.on('pageerror', (error) => errores.push(error.message));
  return () => errores;
}

test('la landing carga sin errores y lleva a la tienda', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Haz el mercado desde el celular/i })).toBeVisible();
  await page.getByRole('link', { name: 'Ir a la tienda' }).first().click();
  await expect(page).toHaveURL(/\/tienda$/);
  await expect(page.getByRole('heading', { name: /RioMarket, el mercado de Riohacha/i })).toBeAttached();
  await page.waitForLoadState('networkidle');
  expect(errores()).toEqual([]);
});

test('la tienda muestra los puestos y el catálogo busca productos', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.goto('/tienda');
  await expect(page.getByRole('link', { name: /Palenque de Carmen/ }).first()).toBeVisible();

  await page.getByRole('combobox', { name: 'Buscar productos' }).fill('arepa de huevo');
  await page.getByRole('combobox', { name: 'Buscar productos' }).press('Enter');
  await expect(page).toHaveURL(/\/catalogo\?q=arepa/);
  await expect(page.getByRole('link', { name: 'Arepa de huevo' }).first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(errores()).toEqual([]);
});

test('el mapa lista los puestos y los marca en el mapa', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.goto('/mapa');
  await expect(page.getByRole('heading', { name: 'Mapa de puestos', level: 1 })).toBeVisible();
  const mapa = page.getByRole('region', { name: 'Mapa de puestos de Riohacha' });
  await expect(mapa.getByRole('button', { name: 'Palenque de Carmen' })).toBeVisible();
  await expect(page.getByRole('region', { name: /^\d+ puestos$/ })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(errores()).toEqual([]);
});

test('la página de créditos de fotos lista los autores', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.goto('/creditos-fotos');
  await expect(page.getByRole('heading', { name: 'Créditos de fotos', level: 1 })).toBeVisible();
  await expect(page.getByText(/Wikimedia Commons/).first()).toBeVisible();
  await expect(page.getByRole('listitem').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(errores()).toEqual([]);
});

test('olvidé mi contraseña: desde el login se pide el enlace y la respuesta no revela si la cuenta existe', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.goto('/login');
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(page).toHaveURL(/\/olvide-contrasena$/);

  await page.getByLabel('Correo electrónico').fill('nadie-registrado@riomarket.test');
  await page.getByRole('button', { name: 'Enviarme el enlace' }).click();
  await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
  await expect(page.getByText('tiene una cuenta, te enviamos un enlace')).toBeVisible();
  expect(errores()).toEqual([]);
});

test('restablecer contraseña: un enlace inválido se explica y ofrece pedir otro', async ({ page }) => {
  await page.goto('/restablecer-contrasena?token=enlace-que-no-existe');
  await page.getByLabel('Contraseña nueva', { exact: true }).fill('ClaveNueva2026');
  await page.getByLabel('Repite la contraseña', { exact: true }).fill('ClaveNueva2026');
  await page.getByRole('button', { name: 'Cambiar contraseña' }).click();

  await expect(page.getByRole('alert')).toContainText('venció o ya se usó');
  await expect(page.getByRole('link', { name: 'Pedir un enlace nuevo' })).toHaveAttribute('href', '/olvide-contrasena');
});
