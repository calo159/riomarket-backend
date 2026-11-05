import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pedido, Puesto } from '../lib/types';
import { Escaparate } from './Escaparate';

const puesto = (id: number, extra: Record<string, unknown> = {}) =>
  ({
    id,
    nombre: `Puesto ${id}`,
    descripcion: 'Fruta de la Guajira',
    portada: `/media/portada-${id}.webp`,
    logo: null,
    calificacion_promedio: 4.5,
    ofrece_domicilio: true,
    ...extra,
  }) as unknown as Puesto;

const pedido = (extra: Record<string, unknown> = {}) =>
  ({ id: 7, id_puesto: 2, estado: 'en_camino', total: '45000.00', ...extra }) as unknown as Pedido;

function montar(puestos: Puesto[], ped?: Pedido | null) {
  return render(
    <MemoryRouter>
      <Escaparate puestos={puestos} pedido={ped} />
    </MemoryRouter>,
  );
}

describe('Escaparate', () => {
  // El .env local puede traer VITE_API_URL: las URLs deben quedar tal cual (mismo origen).
  beforeEach(() => vi.stubEnv('VITE_API_URL', ''));

  it('tiene_un_titular_fijo_y_las_dos_acciones', () => {
    montar([puesto(1)]);

    expect(screen.getByRole('heading', { level: 1, name: /Compra directo en los puestos de Riohacha/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver el catálogo' })).toHaveAttribute('href', '/catalogo');
    expect(screen.getByRole('link', { name: 'Conocer los puestos' })).toHaveAttribute('href', '#puestos');
  });

  it('muestra_la_foto_del_puesto_con_portada_primero_y_un_ticket_para_empezar', () => {
    const { container } = montar([puesto(1, { portada: null }), puesto(2)]);

    expect(container.querySelector('img')).toHaveAttribute('src', '/media/portada-2.webp');
    expect(screen.getByText('Un puesto para empezar')).toBeInTheDocument();
    expect(screen.getByText('Puesto 2')).toBeInTheDocument();
    expect(screen.getByText(/4\.5/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver el puesto' })).toHaveAttribute('href', '/puestos/2');
  });

  it('con_un_pedido_en_curso_el_ticket_es_el_pedido_y_lleva_a_seguirlo', () => {
    montar([puesto(1), puesto(2)], pedido());

    expect(screen.getByText('Tu pedido en curso')).toBeInTheDocument();
    expect(screen.getByText('Puesto 2')).toBeInTheDocument();
    expect(screen.getByText(/Total .*45\.000/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Seguir mi pedido' })).toHaveAttribute('href', '/pedidos/7');
    expect(screen.queryByText('Un puesto para empezar')).not.toBeInTheDocument();
  });

  it('con_un_pedido_la_foto_es_la_del_puesto_del_pedido', () => {
    const { container } = montar([puesto(1), puesto(2)], pedido());

    expect(container.querySelector('img')).toHaveAttribute('src', '/media/portada-2.webp');
  });

  it('si_el_puesto_del_pedido_no_esta_en_la_lista_dice_el_numero_del_pedido', () => {
    montar([puesto(1)], pedido({ id_puesto: 99 }));

    expect(screen.getByText('Pedido #7')).toBeInTheDocument();
  });

  it('sin_puestos_sigue_funcionando_y_no_inventa_un_ticket', () => {
    montar([]);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText('Un puesto para empezar')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver el puesto' })).not.toBeInTheDocument();
  });

  it('el_toldo_y_los_adornos_no_los_lee_un_lector_de_pantalla', () => {
    const { container } = montar([puesto(1)]);

    const adornos = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(adornos.length).toBeGreaterThan(0);
    // El único contenido «hablado» es el titular, el texto y las acciones: ningún svg decorativo con rol de imagen.
    expect(container.querySelectorAll('svg:not([aria-hidden="true"])').length).toBe(0);
  });
});
