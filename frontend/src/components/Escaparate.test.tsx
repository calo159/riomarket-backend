import { fireEvent, render, screen } from '@testing-library/react';
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

  it('entre_los_puestos_con_portada_elige_el_mejor_calificado', () => {
    const { container } = montar([puesto(1, { calificacion_promedio: 4.1 }), puesto(2, { calificacion_promedio: 4.9 }), puesto(3, { calificacion_promedio: 4.5 })]);

    expect(container.querySelector('img')).toHaveAttribute('src', '/media/portada-2.webp');
    expect(screen.getByText('Puesto 2')).toBeInTheDocument();
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

  describe('vitrina que rota', () => {
    const tres = () => [
      puesto(1, { calificacion_promedio: 4.9 }),
      puesto(2, { calificacion_promedio: 4.5 }),
      puesto(3, { calificacion_promedio: 4.1 }),
    ];

    it('con_varios_puestos_ofrece_un_punto_por_puesto_y_empieza_por_el_mejor', () => {
      montar(tres());

      expect(screen.getByRole('group', { name: 'Puestos de la vitrina' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ver Puesto 1' })).toHaveAttribute('aria-current', 'true');
      expect(screen.getByRole('button', { name: 'Ver Puesto 3' })).toHaveAttribute('aria-current', 'false');
      expect(screen.getByRole('link', { name: 'Ver el puesto' })).toHaveAttribute('href', '/puestos/1');
    });

    it('al_terminar_el_relleno_pasa_al_siguiente_puesto_y_da_la_vuelta', () => {
      const { container } = montar(tres());

      for (const esperado of [2, 3, 1]) {
        fireEvent.animationEnd(container.querySelector('.relleno-punto')!);
        expect(screen.getByRole('link', { name: 'Ver el puesto' })).toHaveAttribute('href', `/puestos/${esperado}`);
        expect(screen.getByText(`Puesto ${esperado}`, { selector: 'b' })).toBeInTheDocument();
      }
    });

    it('al_pulsar_un_punto_va_a_ese_puesto', () => {
      montar(tres());

      fireEvent.click(screen.getByRole('button', { name: 'Ver Puesto 3' }));

      expect(screen.getByRole('link', { name: 'Ver el puesto' })).toHaveAttribute('href', '/puestos/3');
      expect(screen.getByRole('button', { name: 'Ver Puesto 3' })).toHaveAttribute('aria-current', 'true');
    });

    it('solo_la_foto_activa_se_lee_y_las_demas_se_piden_de_a_una', () => {
      const { container } = montar(tres());

      const fotos = container.querySelectorAll('.vitrina-diapositiva');
      // La activa y la siguiente; la tercera todavía no se pidió.
      expect(fotos).toHaveLength(2);
      expect(fotos[0]).toHaveAttribute('aria-hidden', 'false');
      expect(fotos[1]).toHaveAttribute('aria-hidden', 'true');
    });

    it('no_hay_boton_de_pausa_pero_el_indicador_sigue_siendo_de_puntos', () => {
      montar(tres());

      expect(screen.queryByRole('button', { name: /pausa|Pausar|Reanudar/i })).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /^Ver Puesto/ })).toHaveLength(3);
    });

    it('con_un_solo_puesto_o_con_un_pedido_no_rota', () => {
      const { unmount } = montar([puesto(1)]);
      expect(screen.queryByRole('group', { name: 'Puestos de la vitrina' })).not.toBeInTheDocument();
      unmount();

      montar(tres(), pedido({ id_puesto: 2 }));
      expect(screen.queryByRole('group', { name: 'Puestos de la vitrina' })).not.toBeInTheDocument();
    });

    it('se_turnan_como_mucho_cinco_puestos', () => {
      montar(Array.from({ length: 8 }, (_, i) => puesto(i + 1)));

      expect(screen.getByRole('group', { name: 'Puestos de la vitrina' }).querySelectorAll('button[aria-label^="Ver "]')).toHaveLength(5);
    });
  });
});
