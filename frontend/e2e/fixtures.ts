import { expect, test as base, type Page } from '@playwright/test';
import { CLAVE_DEMO, SesionApi } from './api';

/** Compradores del seed que cada prueba usa en exclusiva, para que no se pisen entre sí. */
export const COMPRADOR = {
  retiro: 'ana@riomarket.test',
  encargo: 'andres@riomarket.test',
  vendedorCobra: 'diana@riomarket.test',
  vendedorAcepta: 'jorge@riomarket.test',
} as const;

/** Inicia sesión por la interfaz (el refresh rota: no se reutiliza `storageState`). */
export async function iniciarSesion(page: Page, correo: string, destino: RegExp) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(correo);
  await page.locator('#password').fill(CLAVE_DEMO);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(destino);
}

type Fixtures = {
  /** Abre una sesión de API; al terminar la prueba la cierra. */
  api: (correo: string) => Promise<SesionApi>;
  /** Registra un pedido para cancelarlo al terminar (si aún se puede) y devolver su stock. */
  limpiarPedido: (api: SesionApi, id: number) => void;
};

export const test = base.extend<Fixtures>({
  api: async ({ baseURL }, usar) => {
    const abiertas: SesionApi[] = [];
    await usar(async (correo) => {
      const sesion = await SesionApi.iniciar(baseURL!, correo);
      abiertas.push(sesion);
      return sesion;
    });
    await Promise.all(abiertas.map((sesion) => sesion.cerrar()));
  },
  limpiarPedido: async ({ api: _api }, usar) => {
    const pendientes: { api: SesionApi; id: number }[] = [];
    await usar((api, id) => {
      pendientes.push({ api, id });
    });
    // Se cancela antes de cerrar las sesiones (el fixture `api` se desmonta después).
    for (const { api, id } of pendientes) await api.cancelarPedido(id);
  },
});

export { expect };
