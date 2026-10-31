import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { VentasDia } from '../../api/payments';
import { BarrasPorDia, maximoRedondeado, resumenDelPeriodo } from './BarrasPorDia';

function serie(valores: number[]): VentasDia[] {
  // La última fecha es el 21 oct 2026 («hoy»).
  return valores.map((valor, indice) => {
    const dia = 21 - (valores.length - 1 - indice);
    return {
      fecha: `2026-10-${String(dia).padStart(2, '0')}`,
      pedidos: valor > 0 ? 2 : 0,
      ventas_brutas: `${valor}.00`,
      ingresos_netos: `${valor * 0.9}.00`,
    };
  });
}

describe('BarrasPorDia', () => {
  it('nombre accesible resume el periodo', () => {
    render(<BarrasPorDia datos={serie([0, 10000, 42000, 0, 8000, 0, 5000])} />);
    const grafico = screen.getByRole('img');
    const texto = 'Vendiste $ 65.000 en 7 días; el mejor día fue el 17 oct con $ 42.000.';
    // Intl pone un espacio duro entre el signo y la cifra: se compara con espacios normales.
    const normalizar = (valor: string) => valor.replace(/\s/g, ' ');
    expect(normalizar(grafico.getAttribute('aria-labelledby') ?? '')).not.toBe('');
    const rotulo = document.getElementById(grafico.getAttribute('aria-labelledby') ?? '');
    expect(normalizar(rotulo?.textContent ?? '')).toBe(texto);
  });

  it('cada barra tiene su título con el día, el monto y los pedidos', () => {
    const { container } = render(<BarrasPorDia datos={serie([0, 42000])} />);
    const titulos = [...container.querySelectorAll('svg title')].map((t) => (t.textContent ?? '').replace(/\s/g, ' '));
    expect(titulos).toEqual(['20 oct: $ 0 en 0 pedidos', '21 oct: $ 42.000 en 2 pedidos']);
  });

  it('cambia a tabla y vuelve al gráfico', () => {
    render(<BarrasPorDia datos={serie([0, 10000, 42000])} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Tabla' }));
    const tabla = screen.getByRole('table');
    expect(within(tabla).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Fecha', 'Pedidos', 'Ventas', 'Ingreso neto']);
    // Una fila por día, el más reciente primero.
    const filas = within(tabla).getAllByRole('row');
    expect(filas).toHaveLength(4);
    expect(filas[1]).toHaveTextContent('21 oct');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Gráfico' }));
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('marca hoy con un borde amarillo y la etiqueta «Hoy»', () => {
    const { container } = render(<BarrasPorDia datos={serie([5000, 0, 9000])} />);
    const borde = container.querySelector('[data-hoy="true"]');
    expect(borde).not.toBeNull();
    expect(borde?.getAttribute('fill')).toBe('none');
    expect(screen.getByText('Hoy')).toBeInTheDocument();
  });

  it('sin ventas dice que no hubo ventas y no dibuja barras', () => {
    const { container } = render(<BarrasPorDia datos={serie([0, 0, 0])} />);
    expect(container.querySelectorAll('path')).toHaveLength(0);
    expect(resumenDelPeriodo(serie([0, 0, 0]))).toBe('No hubo ventas en los últimos 3 días.');
  });

  it('la versión compacta no tiene selector de tabla ni ejes', () => {
    render(<BarrasPorDia datos={serie([0, 10000, 42000])} compacto />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

describe('maximoRedondeado', () => {
  it('sube al siguiente valor redondo', () => {
    expect(maximoRedondeado(0)).toBe(0);
    expect(maximoRedondeado(42000)).toBe(50000);
    expect(maximoRedondeado(100000)).toBe(100000);
    expect(maximoRedondeado(101000)).toBe(200000);
    expect(maximoRedondeado(21000)).toBe(25000);
    expect(maximoRedondeado(900)).toBe(1000);
  });
});
