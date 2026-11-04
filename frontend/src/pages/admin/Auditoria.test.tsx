import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auditoria } from './Auditoria';

const mocks = vi.hoisted(() => ({ listarAuditoria: vi.fn() }));
vi.mock('../../api/audit', () => mocks);
vi.mock('../../components/admin/BotonExportar', () => ({
  BotonExportar: ({ params }: { params: Record<string, unknown> }) => (
    <button type="button" data-params={JSON.stringify(params)}>
      Exportar CSV
    </button>
  ),
}));

const REGISTRO = {
  id: 1,
  id_usuario: 3,
  usuario_correo: 'admin@riomarket.test',
  accion: 'actualizar',
  entidad: 'usuario',
  id_entidad: 9,
  detalle: { campo: 'rol', de: 'comprador', a: 'vendedor', motivo: 'Pidió vender' },
  direccion_ip: '10.0.0.1',
  fecha_creacion: '2026-11-04T15:00:00Z',
};

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Auditoria />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.listarAuditoria.mockReset().mockResolvedValue({ count: 1, next: null, previous: null, results: [REGISTRO] });
});

describe('Auditoría', () => {
  it('muestra qué cambió, con la acción en español', async () => {
    renderizar();

    expect(await screen.findByText('rol: comprador → vendedor · Motivo: Pidió vender')).toBeInTheDocument();
    expect(screen.getByText('Actualizar', { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByText('usuario #9')).toBeInTheDocument();
  });

  it('una acción del sistema (sin usuario) se marca como tal', async () => {
    mocks.listarAuditoria.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [{ ...REGISTRO, id_usuario: null, usuario_correo: null, accion: 'vencimiento', detalle: {} }],
    });
    renderizar();

    expect(await screen.findByText('Sistema')).toBeInTheDocument();
    expect(screen.getByText('Cancelado por plazo', { selector: 'td' })).toBeInTheDocument();
  });

  it('filtra por acción y por texto, vuelve a la primera página y exporta con los mismos filtros', async () => {
    renderizar();
    await screen.findByText('Actualizar', { selector: 'td' });

    await userEvent.selectOptions(screen.getByLabelText('Filtrar por acción'), 'crear');
    await userEvent.type(screen.getByLabelText('Buscar en la auditoría'), 'ana');

    await waitFor(() =>
      expect(mocks.listarAuditoria).toHaveBeenLastCalledWith(
        expect.objectContaining({ accion: 'crear', q: 'ana', page: 1, page_size: 25 }),
      ),
    );
    const exportar = screen.getByRole('button', { name: 'Exportar CSV' });
    expect(JSON.parse(exportar.dataset.params ?? '{}')).toEqual({ q: 'ana', accion: 'crear' });
  });

  it('filtra por rango de fechas', async () => {
    renderizar();
    await screen.findByText('Actualizar', { selector: 'td' });

    await userEvent.type(screen.getByLabelText('Desde'), '2026-11-01');
    await userEvent.type(screen.getByLabelText('Hasta'), '2026-11-04');

    await waitFor(() =>
      expect(mocks.listarAuditoria).toHaveBeenLastCalledWith(expect.objectContaining({ desde: '2026-11-01', hasta: '2026-11-04' })),
    );
  });

  it('pagina cuando hay más de una página', async () => {
    mocks.listarAuditoria.mockResolvedValue({ count: 60, next: 'x', previous: null, results: [REGISTRO] });
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: /Siguiente/ }));

    await waitFor(() => expect(mocks.listarAuditoria).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });

  it('sin resultados lo dice', async () => {
    mocks.listarAuditoria.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    renderizar();

    expect(await screen.findByText('Sin registros con esos filtros')).toBeInTheDocument();
  });
});
