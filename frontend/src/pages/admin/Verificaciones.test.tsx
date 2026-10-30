import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Verificaciones } from './Verificaciones';

const mocks = vi.hoisted(() => ({
  listarSolicitudes: vi.fn(),
  decidirSolicitud: vi.fn(),
  obtenerFotoCedula: vi.fn(),
}));

vi.mock('../../api/verification', () => mocks);
vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));
vi.mock('../../navigation/useMenu', () => ({ invalidarMenu: vi.fn() }));

const SOLICITUD = {
  id: 4,
  nombre_usuario: 'Carmen Vendedora',
  correo_usuario: 'carmen@example.com',
  estado_verificacion: 'pendiente',
  fecha_solicitud: '2026-03-01T10:00:00Z',
  fecha_revision: null,
};

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Verificaciones />
    </QueryClientProvider>,
  );
}

describe('Verificaciones', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.listarSolicitudes.mockResolvedValue({ count: 1, next: null, previous: null, results: [SOLICITUD] });
    mocks.decidirSolicitud.mockResolvedValue(SOLICITUD);
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:cedula');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('los botones solo-icono tienen nombre accesible', async () => {
    renderizar();
    expect(await screen.findByRole('button', { name: 'Aprobar a Carmen Vendedora' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rechazar a Carmen Vendedora' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver la cédula de Carmen Vendedora' })).toBeInTheDocument();
  });

  it('muestra la foto de la cédula antes de decidir', async () => {
    mocks.obtenerFotoCedula.mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
    renderizar();
    await userEvent.click(await screen.findByRole('button', { name: /Ver la cédula/ }));
    const dialogo = await screen.findByRole('dialog');
    expect(await within(dialogo).findByRole('img', { name: /cédula de Carmen/ })).toHaveAttribute('src', 'blob:cedula');
    expect(mocks.obtenerFotoCedula).toHaveBeenCalledWith(4);
  });

  it('aprobar pide confirmación y no decide al primer clic', async () => {
    renderizar();
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar a Carmen Vendedora' }));
    expect(mocks.decidirSolicitud).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprobar' }));
    await waitFor(() => expect(mocks.decidirSolicitud).toHaveBeenCalledWith(4, { estado: 'aprobado', motivo_rechazo: undefined }));
  });
});
