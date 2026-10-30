import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Puesto } from '../../lib/types';
import { InterruptorWhatsapp } from './InterruptorWhatsapp';

const mocks = vi.hoisted(() => ({
  actualizarPuesto: vi.fn(),
  exito: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../api/catalog', () => ({ actualizarPuesto: mocks.actualizarPuesto }));
vi.mock('../../auth/SessionProvider', () => ({ useSession: () => ({ usuario: { id: 1, celular: '3001234567' } }) }));
vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ exito: mocks.exito, error: mocks.error, info: vi.fn() }),
}));

const puesto = (acepta: boolean) => ({ id: 7, nombre: 'Frutas del Caribe', acepta_whatsapp: acepta }) as unknown as Puesto;

function montar(acepta: boolean) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <InterruptorWhatsapp puesto={puesto(acepta)} />
    </QueryClientProvider>,
  );
}

describe('InterruptorWhatsapp', () => {
  beforeEach(() => {
    mocks.actualizarPuesto.mockReset();
    mocks.exito.mockReset();
    mocks.error.mockReset();
  });

  it('avisa con claridad que el número será visible y no está activo por defecto', () => {
    montar(false);
    const interruptor = screen.getByRole('switch', { name: 'Recibir mensajes por WhatsApp' });
    expect(interruptor).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText(/Tu número de celular será visible para los compradores/)).toBeInTheDocument();
    expect(screen.getByText(/termina en 4567/)).toBeInTheDocument();
  });

  it('al activarlo guarda acepta_whatsapp en true solo en ese puesto', async () => {
    mocks.actualizarPuesto.mockResolvedValue({});
    const usuario = userEvent.setup();
    montar(false);
    await usuario.click(screen.getByRole('switch'));
    await waitFor(() => expect(mocks.actualizarPuesto).toHaveBeenCalledWith(7, { acepta_whatsapp: true }));
    await waitFor(() => expect(mocks.exito).toHaveBeenCalled());
  });

  it('al apagarlo guarda false', async () => {
    mocks.actualizarPuesto.mockResolvedValue({});
    const usuario = userEvent.setup();
    montar(true);
    const interruptor = screen.getByRole('switch');
    expect(interruptor).toHaveAttribute('aria-checked', 'true');
    await usuario.click(interruptor);
    await waitFor(() => expect(mocks.actualizarPuesto).toHaveBeenCalledWith(7, { acepta_whatsapp: false }));
  });

  it('si el servidor falla muestra el error', async () => {
    mocks.actualizarPuesto.mockRejectedValue(new Error('falló'));
    const usuario = userEvent.setup();
    montar(false);
    await usuario.click(screen.getByRole('switch'));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
  });
});
