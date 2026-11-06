import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CanastaVacia, PuestoCerrado } from './Ilustraciones';
import { TituloSeccion } from './TituloSeccion';
import { ToldoPuesto } from './ToldoPuesto';
import { EstadoVacio } from './Estado';
import { TONOS } from '../tonoCategoria';

describe('detalles de mercado', () => {
  it('el_toldo_del_puesto_toma_el_color_de_su_categoria_y_no_lo_lee_un_lector_de_pantalla', () => {
    const { container } = render(<ToldoPuesto categoria="Frutas y verduras" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    const rellenos = Array.from(svg.querySelectorAll('path')).map((p) => p.getAttribute('fill'));
    expect(rellenos[0]).toBe(TONOS.frutas.punto);
    expect(rellenos[1]).toBe('#FFF4DC');
    expect(rellenos).toHaveLength(12);
  });

  it('sin_categoria_el_toldo_usa_el_tono_neutro', () => {
    const { container } = render(<ToldoPuesto />);
    expect(container.querySelector('path')).toHaveAttribute('fill', TONOS.generico.punto);
  });

  it('el_titulo_con_ola_se_nombra_solo_por_su_texto', () => {
    render(<TituloSeccion texto="Recién llegados" />);
    expect(screen.getByRole('heading', { name: 'Recién llegados' })).toBeInTheDocument();
  });

  it('las_ilustraciones_son_decorativas', () => {
    const { container } = render(
      <>
        <CanastaVacia />
        <PuestoCerrado />
      </>,
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(2);
    svgs.forEach((s) => expect(s).toHaveAttribute('aria-hidden', 'true'));
  });

  it('un_estado_vacio_con_ilustracion_la_muestra_en_lugar_del_icono', () => {
    const { container } = render(<EstadoVacio titulo="Sin nada" ilustracion={<CanastaVacia />} />);
    expect(screen.getByRole('heading', { name: 'Sin nada' })).toBeInTheDocument();
    expect(container.querySelector('.hoja-cae')).not.toBeNull();
  });
});
