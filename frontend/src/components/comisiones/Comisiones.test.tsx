import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Comision } from '../../api/payments';
import { ComisionDelVendedor } from './ComisionDelVendedor';
import { ComisionesAdmin } from './ComisionesAdmin';

const api = vi.hoisted(() => ({ listarComisiones: vi.fn(), registrarLiquidacion: vi.fn() }));
const toast = vi.hoisted(() => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('../../api/payments', () => api);
vi.mock('../ui/Toast', () => ({ useToast: () => toast }));

function cuenta(extra: Partial<Comision> = {}): Comision {
  return {
    id_vendedor: 7,
    vendedor: 'Carmen Gómez',
    pagos_en_efectivo: 4,
    cobrado_en_efectivo: '50000.00',
    comision_generada: '4000.00',
    comision_pagada: '1000.00',
    comision_pendiente: '3000.00',
    ultimo_pago: '2026-10-30T15:00:00Z',
    estado: 'al_dia',
    limite_aviso: '50000.00',
    limite_bloqueo: '150000.00',
    pagar_para_reactivar: '0.00',
    ...extra,
  };
}

function montar(pantalla: React.ReactElement) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{pantalla}</QueryClientProvider>,
  );
}

beforeEach(() => {
  api.listarComisiones.mockReset().mockResolvedValue([cuenta()]);
  api.registrarLiquidacion.mockReset().mockResolvedValue({});
  toast.exito.mockReset();
});

describe('ComisionesAdmin', () => {
  it('muestra lo que debe cada vendedor y el total por cobrar', async () => {
    api.listarComisiones.mockResolvedValue([cuenta(), cuenta({ id_vendedor: 8, vendedor: 'Luis Pérez', comision_pendiente: '500.00' })]);
    montar(<ComisionesAdmin />);

    const fila = (await screen.findByText('Carmen Gómez')).closest('tr')!;
    expect(within(fila).getByText(/3\.000/)).toBeInTheDocument();
    // 3.000 + 500
    expect(screen.getByText('Por cobrar en total').nextSibling).toHaveTextContent(/3\.500/);
  });

  it('el estado de cada cuenta se ve en la tabla: al día, en aviso o en pausa', async () => {
    api.listarComisiones.mockResolvedValue([
      cuenta({ id_vendedor: 1, vendedor: 'Uno', estado: 'bloqueado' }),
      cuenta({ id_vendedor: 2, vendedor: 'Dos', estado: 'aviso' }),
      cuenta({ id_vendedor: 3, vendedor: 'Tres', estado: 'al_dia' }),
    ]);
    montar(<ComisionesAdmin />);

    const estadoDe = async (nombre: string) => (await screen.findByText(nombre)).closest('tr')!;
    expect(within(await estadoDe('Uno')).getByText('En pausa')).toBeInTheDocument();
    expect(within(await estadoDe('Dos')).getByText('En aviso')).toBeInTheDocument();
    expect(within(await estadoDe('Tres')).getByText('Al día')).toBeInTheDocument();
  });

  it('un vendedor al día no tiene botón activo, y uno con saldo a favor lo indica', async () => {
    api.listarComisiones.mockResolvedValue([
      cuenta({ vendedor: 'Cuenta saldada', comision_pendiente: '0.00' }),
      cuenta({ id_vendedor: 9, vendedor: 'Con saldo', comision_pendiente: '-200.00' }),
    ]);
    montar(<ComisionesAdmin />);

    await screen.findByText('Cuenta saldada');
    for (const boton of screen.getAllByRole('button', { name: 'Anotar pago' })) expect(boton).toBeDisabled();
    expect(screen.getByText(/200.* a favor/)).toBeInTheDocument();
  });

  it('anota un pago con el monto propuesto y la nota, y avisa', async () => {
    montar(<ComisionesAdmin />);
    await userEvent.click(await screen.findByRole('button', { name: 'Anotar pago' }));

    const dialogo = await screen.findByRole('dialog');
    const monto = within(dialogo).getByLabelText('Monto recibido');
    expect(monto).toHaveValue('3000'); // propone lo que debe
    await userEvent.clear(monto);
    await userEvent.type(monto, '1500,5');
    await userEvent.type(within(dialogo).getByLabelText(/Nota/), 'Nequi del lunes');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Anotar pago' }));

    await waitFor(() =>
      expect(api.registrarLiquidacion).toHaveBeenCalledWith({ id_vendedor: 7, monto: '1500.5', nota: 'Nequi del lunes' }),
    );
    await waitFor(() => expect(toast.exito).toHaveBeenCalledWith('Anotamos el pago de Carmen Gómez.'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('un monto vacío o cero no llega al servidor', async () => {
    montar(<ComisionesAdmin />);
    await userEvent.click(await screen.findByRole('button', { name: 'Anotar pago' }));
    const dialogo = await screen.findByRole('dialog');
    await userEvent.clear(within(dialogo).getByLabelText('Monto recibido'));
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Anotar pago' }));

    expect(await within(dialogo).findByText('Escribe un monto mayor que cero.')).toBeInTheDocument();
    expect(api.registrarLiquidacion).not.toHaveBeenCalled();
  });

  it('si el servidor rechaza el monto, lo explica en la misma ventana y no la cierra', async () => {
    const respuesta = { status: 400, data: { errors: { monto: ['El vendedor debe $3.000; no puedes anotar más.'] } } } as AxiosResponse;
    api.registrarLiquidacion.mockRejectedValue(new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, respuesta));
    montar(<ComisionesAdmin />);
    await userEvent.click(await screen.findByRole('button', { name: 'Anotar pago' }));
    const dialogo = await screen.findByRole('dialog');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Anotar pago' }));

    expect(await within(dialogo).findByText(/no puedes anotar más/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('sin cobros en efectivo lo dice en vez de mostrar una tabla vacía', async () => {
    api.listarComisiones.mockResolvedValue([]);
    montar(<ComisionesAdmin />);

    expect(await screen.findByText('Todavía no hay cobros en efectivo aprobados.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('ComisionDelVendedor', () => {
  it('muestra lo que debe y cómo se compone', async () => {
    montar(<ComisionDelVendedor />);

    expect(await screen.findByText(/3\.000/, { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText(/ya pagaste.*1\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Entrégala a RioMarket/)).toBeInTheDocument();
  });

  it('al día: lo dice y no pide nada', async () => {
    api.listarComisiones.mockResolvedValue([cuenta({ comision_pendiente: '0.00', comision_pagada: '4000.00' })]);
    montar(<ComisionDelVendedor />);

    expect(await screen.findByText('Estás al día')).toBeInTheDocument();
    expect(screen.queryByText(/Entrégala a RioMarket/)).not.toBeInTheDocument();
  });

  it('al día no muestra ninguna advertencia', async () => {
    montar(<ComisionDelVendedor />);

    await screen.findByText(/Entrégala a RioMarket/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/pausa/)).not.toBeInTheDocument();
  });

  it('en aviso: dice a cuánto se pausan los pedidos nuevos, sin alarmar', async () => {
    api.listarComisiones.mockResolvedValue([cuenta({ estado: 'aviso', comision_pendiente: '60000.00' })]);
    montar(<ComisionDelVendedor />);

    expect(await screen.findByText(/Tu deuda va creciendo/)).toHaveTextContent(/150\.000.*pedidos nuevos/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('en pausa: lo dice como alerta, cuánto pagar y que los pedidos en curso siguen', async () => {
    api.listarComisiones.mockResolvedValue([
      cuenta({ estado: 'bloqueado', comision_pendiente: '151000.00', pagar_para_reactivar: '1001.00' }),
    ]);
    montar(<ComisionDelVendedor />);

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Tus puestos están en pausa para pedidos nuevos');
    expect(alerta).toHaveTextContent(/Paga.*1\.001/);
    expect(alerta).toHaveTextContent('Los pedidos que ya tienes en curso siguen igual');
  });

  it('no aparece si nunca cobró en efectivo', async () => {
    api.listarComisiones.mockResolvedValue([cuenta({ comision_generada: '0.00', comision_pagada: '0.00', comision_pendiente: '0.00' })]);
    const { container } = montar(<ComisionDelVendedor />);

    await waitFor(() => expect(api.listarComisiones).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('si la consulta falla no rompe la pantalla de ventas', async () => {
    api.listarComisiones.mockRejectedValue(new Error('sin red'));
    const { container } = montar(<ComisionDelVendedor />);

    await waitFor(() => expect(api.listarComisiones).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
