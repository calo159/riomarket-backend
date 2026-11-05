import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfiguracionAdmin } from '../../api/admin';
import { Configuracion } from './Configuracion';

const mocks = vi.hoisted(() => ({ obtenerConfiguracion: vi.fn(), guardarConfiguracion: vi.fn() }));
const toast = vi.hoisted(() => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('../../api/admin', () => mocks);
vi.mock('../../components/ui/Toast', () => ({ useToast: () => toast }));

const CONFIGURACION: ConfiguracionAdmin = {
  campos: [
    { clave: 'comision_porcentaje', etiqueta: 'Comisión de la plataforma', ayuda: 'Porcentaje.', unidad: '%', minimo: '0.00', maximo: '50.00', valor: '8.00', del_servidor: '8.00', origen: 'servidor' },
    { clave: 'tarifa_domicilio', etiqueta: 'Tarifa de domicilio', ayuda: 'Lo que paga el comprador.', unidad: '$', minimo: '0.00', maximo: '100000.00', valor: '3000.00', del_servidor: '3000.00', origen: 'servidor' },
    { clave: 'limite_aviso', etiqueta: 'Aviso por comisión pendiente', ayuda: 'Aviso.', unidad: '$', minimo: '0.00', maximo: '10000000.00', valor: '50000.00', del_servidor: '50000.00', origen: 'servidor' },
    { clave: 'limite_bloqueo', etiqueta: 'Pausa por comisión pendiente', ayuda: 'Pausa.', unidad: '$', minimo: '0.00', maximo: '10000000.00', valor: '150000.00', del_servidor: '150000.00', origen: 'servidor' },
  ],
  vendedores: { al_dia: 5, aviso: 2, bloqueado: 1 },
  actualizado: null,
};

function conComisionDelPanel(): ConfiguracionAdmin {
  return {
    ...CONFIGURACION,
    campos: CONFIGURACION.campos.map((c) => (c.clave === 'comision_porcentaje' ? { ...c, valor: '5.00', origen: 'panel' as const } : c)),
  };
}

function errorBackend(errors: Record<string, string[]>): AxiosError {
  const respuesta = { data: { errors }, status: 400, statusText: 'Bad Request', headers: {}, config: {} } as unknown as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, respuesta);
}

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Configuracion />
    </QueryClientProvider>,
  );
}

const comision = () => screen.getByLabelText('Comisión de la plataforma');
const guardar = () => screen.getByRole('button', { name: 'Guardar cambios' });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.obtenerConfiguracion.mockResolvedValue(CONFIGURACION);
  mocks.guardarConfiguracion.mockResolvedValue(conComisionDelPanel());
});

describe('Configuración', () => {
  it('muestra los valores que rigen y de dónde vienen', async () => {
    renderizar();

    expect(await screen.findByLabelText('Tarifa de domicilio')).toHaveValue('3000');
    expect(comision()).toHaveValue('8');
    expect(screen.getAllByText('del servidor').length).toBeGreaterThan(0);
    expect(screen.getByText(/Con los límites guardados hoy/)).toHaveTextContent('5 vendedores al día, 2 en aviso, 1 en pausa');
    expect(guardar()).toBeDisabled();
  });

  it('muestra en pesos qué significa el porcentaje', async () => {
    renderizar();
    await screen.findByLabelText('Tarifa de domicilio');

    expect(screen.getByText(/Ejemplo:/)).toHaveTextContent('la comisión es $ 4.000');

    await userEvent.clear(comision());
    await userEvent.type(comision(), '5');

    expect(screen.getByText(/Ejemplo:/)).toHaveTextContent('la comisión es $ 2.500');
    expect(screen.getByText(/Ejemplo:/)).toHaveTextContent('recibe $ 47.500');
  });

  it('lista lo que va a cambiar y guarda solo eso, con el motivo', async () => {
    renderizar();
    await screen.findByLabelText('Tarifa de domicilio');

    await userEvent.clear(comision());
    await userEvent.type(comision(), '5');

    expect(screen.getByText(/Comisión de la plataforma: 8 % →/)).toHaveTextContent('→ 5 %');
    await userEvent.type(screen.getByLabelText(/Motivo del cambio/), 'Acuerdo con los vendedores');
    await userEvent.click(guardar());

    await waitFor(() => expect(mocks.guardarConfiguracion).toHaveBeenCalledWith({ comision_porcentaje: '5' }, 'Acuerdo con los vendedores'));
    expect(toast.exito).toHaveBeenCalled();
    expect(await screen.findByText('del panel')).toBeInTheDocument();
    expect(comision()).toHaveValue('5');
  });

  it('no deja guardar sin cambios ni sin motivo', async () => {
    renderizar();
    await screen.findByLabelText('Tarifa de domicilio');
    expect(guardar()).toBeDisabled();

    await userEvent.clear(comision());
    await userEvent.type(comision(), '6');
    await userEvent.click(guardar());

    expect(await screen.findByText('Indica un motivo de al menos 5 caracteres.')).toBeInTheDocument();
    expect(mocks.guardarConfiguracion).not.toHaveBeenCalled();
  });

  it('un valor fuera de rango o no numérico bloquea el guardado', async () => {
    renderizar();
    await screen.findByLabelText('Tarifa de domicilio');

    await userEvent.clear(comision());
    await userEvent.type(comision(), '80');
    expect(screen.getByText(/Debe estar entre 0 % y 50 %/)).toBeInTheDocument();
    expect(guardar()).toBeDisabled();

    await userEvent.clear(comision());
    await userEvent.type(comision(), 'mucho');
    expect(screen.getByText('Escribe un número.')).toBeInTheDocument();
    expect(guardar()).toBeDisabled();
  });

  it('avisa si la pausa queda por debajo del aviso', async () => {
    renderizar();
    const pausa = await screen.findByLabelText('Pausa por comisión pendiente');

    await userEvent.clear(pausa);
    await userEvent.type(pausa, '10000');

    expect(screen.getByText('La pausa no puede ser menor que el aviso.')).toBeInTheDocument();
    expect(guardar()).toBeDisabled();
  });

  it('cero en la pausa es válido: la apaga', async () => {
    renderizar();
    const pausa = await screen.findByLabelText('Pausa por comisión pendiente');

    await userEvent.clear(pausa);
    await userEvent.type(pausa, '0');

    expect(screen.queryByText('La pausa no puede ser menor que el aviso.')).not.toBeInTheDocument();
    expect(screen.getByText(/Pausa por comisión pendiente: .* →/)).toBeInTheDocument();
  });

  it('«Usar el del servidor» borra el valor del panel y se envía null', async () => {
    mocks.obtenerConfiguracion.mockResolvedValue(conComisionDelPanel());
    renderizar();
    expect(await screen.findByLabelText('Comisión de la plataforma')).toHaveValue('5');
    expect(screen.getByText('El del servidor es 8 %.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Usar el del servidor/ }));

    expect(comision()).toHaveValue('8');
    expect(screen.getByText('Al guardar vuelve al del servidor.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Motivo del cambio/), 'Volvemos al valor original');
    await userEvent.click(guardar());

    await waitFor(() => expect(mocks.guardarConfiguracion).toHaveBeenCalledWith({ comision_porcentaje: null }, 'Volvemos al valor original'));
  });

  it('muestra el error que devuelve el servidor junto al campo', async () => {
    mocks.guardarConfiguracion.mockRejectedValue(errorBackend({ tarifa_domicilio: ['Debe estar entre 0 y 100000 pesos.'] }));
    renderizar();
    const tarifa = await screen.findByLabelText('Tarifa de domicilio');

    await userEvent.clear(tarifa);
    await userEvent.type(tarifa, '4000');
    await userEvent.type(screen.getByLabelText(/Motivo del cambio/), 'Nueva tarifa');
    await userEvent.click(guardar());

    expect(await screen.findByText('Debe estar entre 0 y 100000 pesos.')).toBeInTheDocument();
    expect(toast.exito).not.toHaveBeenCalled();
  });

  it('si no carga, ofrece reintentar', async () => {
    mocks.obtenerConfiguracion.mockRejectedValueOnce(new Error('caído')).mockResolvedValue(CONFIGURACION);
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: /Reintentar/ }));

    expect(await screen.findByLabelText('Tarifa de domicilio')).toBeInTheDocument();
  });
});
