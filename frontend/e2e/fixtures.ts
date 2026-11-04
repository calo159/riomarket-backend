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
  /**
   * Registra un pedido para cancelarlo al terminar (si aún se puede) y devolver su stock.
   * El comprador solo cancela mientras está pendiente; si el puesto ya lo aceptó, `puesto` (la sesión
   * del vendedor) lo cancela en su lugar.
   */
  limpiarPedido: (api: SesionApi, id: number, puesto?: SesionApi) => void;
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
    const pendientes: { sesiones: SesionApi[]; id: number }[] = [];
    await usar((api, id, puesto) => {
      pendientes.push({ sesiones: puesto ? [api, puesto] : [api], id });
    });
    // Se cancela antes de cerrar las sesiones (el fixture `api` se desmonta después).
    for (const { sesiones, id } of pendientes) {
      for (const sesion of sesiones) if (await sesion.cancelarPedido(id)) break;
    }
  },
});

export { expect };
