import { expect, test } from '@playwright/test';

test('la portada es la landing', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Haz el mercado desde el celular/);
  await expect(page.getByRole('heading', { level: 1, name: /Haz el mercado desde el celular/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ir a la tienda' }).first()).toHaveAttribute('href', '/tienda');
});

test('la tienda vive en /tienda', async ({ page }) => {
  await page.goto('/tienda');

  await expect(page).toHaveTitle(/RioMarket/);
  await expect(page.getByRole('heading', { name: /RioMarket, el mercado de Riohacha/i })).toBeAttached();
});

test('muestra el login y permite ir al registro', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
  await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();

  await page.getByRole('link', { name: 'Crea una cuenta' }).click();
  await expect(page.getByRole('heading', { name: /Crea tu cuenta/i })).toBeVisible();
});
