import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersonalizacionAdmin } from '../../api/sitio';
import { reiniciarSitio, sitioActual } from '../../lib/sitio';
import { Personalizacion } from './Personalizacion';

const mocks = vi.hoisted(() => ({ obtenerPersonalizacion: vi.fn(), guardarPersonalizacion: vi.fn() }));
const toast = vi.hoisted(() => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('../../api/sitio', () => mocks);
vi.mock('../../components/ui/Toast', () => ({ useToast: () => toast }));

const campo = (clave: string, etiqueta: string, tipo: string, defecto: string, propio = '', largo = 40) => ({
  clave,
  etiqueta,
  ayuda: `Ayuda de ${etiqueta}`,
  tipo,
  largo,
  valor: propio || defecto,
  propio,
  defecto,
  plantilla: defecto,
  personalizado: Boolean(propio),
});

const PALETAS = [
  { clave: 'turquesa', etiqueta: 'Turquesa (la original)', color: '#00626D' },
  { clave: 'verde', etiqueta: 'Verde selva', color: '#306345' },
];

function datos(propios: Record<string, string> = {}): PersonalizacionAdmin {
  return {
    grupos: [
      {
        nombre: 'Marca',
        campos: [
          campo('nombre_marca', 'Nombre de la marca', 'texto', 'RioMarket', propios.nombre_marca),
          campo('ciudad', 'Ciudad', 'texto', 'Riohacha', propios.ciudad),
          campo('color_marca', 'Color de la marca', 'paleta', 'turquesa', propios.color_marca, 20),
        ],
      },
      { nombre: 'Contacto', campos: [campo('correo_soporte', 'Correo de soporte', 'correo', '', propios.correo_soporte, 120)] },
    ],
    paletas: PALETAS,
    actualizado: null,
  } as unknown as PersonalizacionAdmin;
}

function errorBackend(errors: Record<string, string[]>): AxiosError {
  const respuesta = { data: { errors }, status: 400, statusText: 'Bad Request', headers: {}, config: {} } as unknown as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, respuesta);
}

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Personalizacion />
    </QueryClientProvider>,
  );
}

const guardar = () => screen.getByRole('button', { name: 'Guardar cambios' });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.obtenerPersonalizacion.mockResolvedValue(datos());
  mocks.guardarPersonalizacion.mockResolvedValue(datos({ nombre_marca: 'MercaCaribe' }));
});
afterEach(() => reiniciarSitio());

describe('Personalización', () => {
  it('muestra cada campo con su valor de por defecto como sugerencia y nada que guardar', async () => {
    renderizar();

    const nombre = await screen.findByLabelText('Nombre de la marca');
    expect(nombre).toHaveValue('');
    expect(nombre).toHaveAttribute('placeholder', 'RioMarket');
    expect(screen.getAllByText('Rige el de por defecto').length).toBeGreaterThan(0);
    expect(guardar()).toBeDisabled();
  });

  it('al escribir el nombre, toda la página ya lo muestra antes de guardar', async () => {
    renderizar();

    await userEvent.type(await screen.findByLabelText('Nombre de la marca'), 'MercaCaribe');

    expect(sitioActual().nombre_marca).toBe('MercaCaribe');
    expect(guardar()).toBeEnabled();
  });

  it('elegir un color lo pone en la página y se manda al guardar', async () => {
    renderizar();

    await userEvent.click(await screen.findByRole('radio', { name: /Verde selva/ }));

    expect(document.documentElement.dataset.marca).toBe('verde');
    expect(screen.getByRole('radio', { name: /Verde selva/ })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(guardar());
    await waitFor(() => expect(mocks.guardarPersonalizacion).toHaveBeenCalledWith({ color_marca: 'verde' }));
  });

  it('solo se manda lo que cambió', async () => {
    renderizar();

    await userEvent.type(await screen.findByLabelText('Nombre de la marca'), 'MercaCaribe');
    await userEvent.click(guardar());

    await waitFor(() => expect(mocks.guardarPersonalizacion).toHaveBeenCalledWith({ nombre_marca: 'MercaCaribe' }));
    expect(toast.exito).toHaveBeenCalled();
    expect(sitioActual().nombre_marca).toBe('MercaCaribe');
  });

  it('escribir el valor de por defecto no cuenta como un cambio', async () => {
    renderizar();

    await userEvent.type(await screen.findByLabelText('Ciudad'), 'Riohacha');

    expect(guardar()).toBeDisabled();
  });

  it('«Volver al de por defecto» borra el valor propio', async () => {
    mocks.obtenerPersonalizacion.mockResolvedValue(datos({ nombre_marca: 'MercaCaribe' }));
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: /Volver al de por defecto/ }));
    await userEvent.click(guardar());

    await waitFor(() => expect(mocks.guardarPersonalizacion).toHaveBeenCalledWith({ nombre_marca: '' }));
  });

  it('un error del servidor aparece junto a su campo y no se pierde lo escrito', async () => {
    mocks.guardarPersonalizacion.mockRejectedValue(errorBackend({ correo_soporte: ['Escribe un correo válido.'] }));
    renderizar();

    await userEvent.type(await screen.findByLabelText('Correo de soporte'), 'mal');
    await userEvent.click(guardar());

    expect(await screen.findByText('Escribe un correo válido.')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo de soporte')).toHaveValue('mal');
  });

  it('descartar deja todo como estaba', async () => {
    renderizar();

    await userEvent.type(await screen.findByLabelText('Nombre de la marca'), 'MercaCaribe');
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));

    expect(screen.getByLabelText('Nombre de la marca')).toHaveValue('');
    expect(sitioActual().nombre_marca).toBe('RioMarket');
  });
});
