import { defineConfig, devices } from '@playwright/test';

/**
 * Dos modos:
 * - Local (por defecto): `npm run dev` en el puerto 3000; el backend lo levanta usted en el 8000.
 * - Modo CI (`E2E_CI=1`): Django sirve el frontend ya construido (como en producción) en el
 *   puerto 8000, sin proxy; Playwright arranca ese servidor. Ver docs/ADR-016-pruebas-end-to-end.md.
 */
const modoCI = Boolean(process.env.E2E_CI);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? (modoCI ? 'http://127.0.0.1:8000' : 'http://127.0.0.1:3000');

export default defineConfig({
  testDir: './e2e',
  // La base es compartida y cada prueba usa sus propios usuarios; aun así se corre de a una
  // en el CI para que los tiempos sean predecibles.
  fullyParallel: !modoCI,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: modoCI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }], ['./e2e/reintentos-reporter.ts']] : 'list',
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: modoCI
    ? {
        // `E2E_CI=1` supone el entorno de config.settings.prod que prepara el CI (ver ci.yml).
        command: 'python manage.py runserver 127.0.0.1:8000 --noreload',
        cwd: '..',
        url: 'http://127.0.0.1:8000/api/health/',
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      }
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    // El comprador se prueba en un celular; el resto, en escritorio.
    { name: 'chromium-movil', testMatch: /comprador\.spec\.ts/, use: { ...devices['Pixel 7'] } },
    { name: 'chromium', testIgnore: /comprador\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
  ],
});
