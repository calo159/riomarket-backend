import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Pedido } from '../../lib/types';
import { formatearFechaHora } from '../../lib/format';
import { AvisosPedido } from './AvisosPedido';

const AHORA = new Date('2026-10-31T12:00:00Z').getTime();
const VENCE = new Date(AHORA + 5 * 3_600_000).toISOString();

function pedido(extra: Partial<Record<keyof Pedido, unknown>>): Pedido {
  return {
    id: 9,
    tipo_entrega: 'retiro',
    estado: 'listo_para_recoger',
    vence_en: VENCE,
    extensiones_plazo: 0,
    motivo_cancelacion: '',
    fecha_actualizacion: '2026-10-31T11:00:00Z',
    ...extra,
  } as unknown as Pedido;
}

describe('AvisosPedido: apartar con plazo', () => {
  it('muestra_recogelo_antes_del: el comprador sabe hasta cuándo y qué pasa si no pasa', () => {
    render(<AvisosPedido datos={pedido({})} esNuevo={false} esComprador efectivoPendiente ahora={AHORA} />);
    expect(screen.getByText((texto) => texto.startsWith(`Recógelo antes del ${formatearFechaHora(VENCE)}`) && texto.endsWith('.') && !texto.endsWith('..'))).toBeInTheDocument();
    expect(
      screen.getByText('Si no pasas, el pedido se cancela solo y el producto vuelve a la venta.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Quedan 5 h/)).toBeInTheDocument();
  });

  it('comprador con el pedido pendiente: avisa que el puesto debe confirmarlo', () => {
    render(<AvisosPedido datos={pedido({ estado: 'pendiente' })} esNuevo={false} esComprador ahora={AHORA} />);
    expect(
      screen.getByText(`Si el puesto no lo confirma antes del ${formatearFechaHora(VENCE)}, el pedido se cancela solo.`),
    ).toBeInTheDocument();
  });

  it('el vendedor ve el plazo del cliente y cuántas veces dio más tiempo', () => {
    render(
      <AvisosPedido
        datos={pedido({ extensiones_plazo: 1 })}
        esNuevo={false}
        esComprador={false}
        efectivoPendiente
        ahora={AHORA}
      />,
    );
    expect(
      screen.getByText(
        `El cliente tiene hasta el ${formatearFechaHora(VENCE)} para recoger. Después se cancela solo y el stock vuelve.`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Ya diste más tiempo 1 de 2 veces.')).toBeInTheDocument();
  });

  it('el vendedor con el pedido pendiente: «Confírmalo antes del…»', () => {
    render(<AvisosPedido datos={pedido({ estado: 'pendiente' })} esNuevo={false} esComprador={false} ahora={AHORA} />);
    expect(screen.getByText(`Confírmalo antes del ${formatearFechaHora(VENCE)} o se cancela solo.`)).toBeInTheDocument();
  });

  it('cuando faltan menos de 2 horas lo dice con claridad', () => {
    const pronto = new Date(AHORA + 45 * 60_000).toISOString();
    render(
      <AvisosPedido datos={pedido({ vence_en: pronto })} esNuevo={false} esComprador efectivoPendiente ahora={AHORA} />,
    );
    expect(screen.getByText(/Quedan 45 min\. Falta poco\./)).toBeInTheDocument();
  });

  it('sin plazo (domicilio, pagado, otros estados) no muestra nada de plazo', () => {
    const { container } = render(
      <AvisosPedido
        datos={pedido({ tipo_entrega: 'domicilio', estado: 'en_preparacion', vence_en: null })}
        esNuevo={false}
        esComprador
        ahora={AHORA}
      />,
    );
    expect(container.textContent).not.toMatch(/Recógelo|se cancela solo|Quedan/);
  });

  it('muestra_cancelado_por_plazo: no recogido', () => {
    render(
      <AvisosPedido
        datos={pedido({ estado: 'cancelado', vence_en: null, motivo_cancelacion: 'no_recogido' })}
        esNuevo={false}
        esComprador
        ahora={AHORA}
      />,
    );
    expect(screen.getByText(/Se canceló solo: no se recogió antes del/)).toBeInTheDocument();
    expect(screen.getByText(/Puedes hacer un pedido nuevo/)).toBeInTheDocument();
  });

  it('muestra_cancelado_por_plazo: el puesto no lo confirmó', () => {
    render(
      <AvisosPedido
        datos={pedido({ estado: 'cancelado', vence_en: null, motivo_cancelacion: 'no_confirmado' })}
        esNuevo={false}
        esComprador={false}
        ahora={AHORA}
      />,
    );
    expect(screen.getByText(/Se canceló solo: el puesto no lo confirmó a tiempo\./)).toBeInTheDocument();
    expect(screen.getByText(/El stock volvió a tu puesto/)).toBeInTheDocument();
  });

  it('un cancelado a mano no dice que se canceló solo', () => {
    const { container } = render(
      <AvisosPedido
        datos={pedido({ estado: 'cancelado', vence_en: null, motivo_cancelacion: '' })}
        esNuevo={false}
        esComprador
        ahora={AHORA}
      />,
    );
    expect(container.textContent).not.toMatch(/Se canceló solo/);
  });
});
