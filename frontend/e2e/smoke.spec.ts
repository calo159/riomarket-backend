import { expect, test } from '@playwright/test';

test('carga la portada pública', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/RioMarket/);
  await expect(page.getByRole('heading', { name: /RioMarket, el mercado de Riohacha/i })).toBeVisible();
});

test('muestra el login y permite ir al registro', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
  await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();

  await page.getByRole('link', { name: 'Crea una cuenta' }).click();
  await expect(page.getByRole('heading', { name: /Crea tu cuenta/i })).toBeVisible();
});
