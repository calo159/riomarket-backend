import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Puesto } from '../lib/types';
import { Destacados } from './Destacados';

const puesto = (id: number, portada: string | null = `/media/portada-${id}.webp`) =>
  ({ id, nombre: `Puesto ${id}`, descripcion: 'Fruta de la Guajira', portada, logo: null }) as unknown as Puesto;

function montar(puestos: Puesto[]) {
  return render(
    <MemoryRouter>
      <Destacados puestos={puestos} />
    </MemoryRouter>,
  );
}

const fotos = (contenedor: HTMLElement) => Array.from(contenedor.querySelectorAll('img'));

describe('Destacados', () => {
  // El .env local puede traer VITE_API_URL: las URLs deben quedar tal cual (mismo origen).
  beforeEach(() => vi.stubEnv('VITE_API_URL', ''));

  it('solo_la_primera_foto_tiene_prioridad', () => {
    const { container } = montar([puesto(1), puesto(2), puesto(3), puesto(4)]);
    const [primera] = fotos(container);

    expect(primera).toHaveAttribute('src', '/media/portada-1.webp');
    expect(primera).toHaveAttribute('fetchpriority', 'high');
    expect(primera).toHaveAttribute('loading', 'eager');
    expect(primera).toHaveAttribute('decoding', 'async');
    // Medidas reservadas: las fotos de las portadas son de 640 × 640.
    expect(primera).toHaveAttribute('width', '640');
    expect(primera).toHaveAttribute('height', '640');

    // Cuando llega la siguiente, esa NO es prioritaria y se carga de forma diferida.
    fireEvent.load(primera);
    const prioritarias = fotos(container).filter((foto) => foto.hasAttribute('fetchpriority'));
    expect(prioritarias).toEqual([primera]);
    expect(fotos(container)[1]).toHaveAttribute('loading', 'lazy');
  });

  it('no_pinta_las_fotos_de_diapositivas_lejanas', () => {
    const { container } = montar([puesto(1), puesto(2), puesto(3), puesto(4)]);

    // Al abrir: solo la visible; la siguiente espera a que la visible termine de cargar.
    expect(fotos(container).map((foto) => foto.getAttribute('src'))).toEqual(['/media/portada-1.webp']);

    fireEvent.load(fotos(container)[0]);
    expect(fotos(container).map((foto) => foto.getAttribute('src'))).toEqual([
      '/media/portada-1.webp',
      '/media/portada-2.webp',
    ]);
    // La tercera y la cuarta no existen en el DOM.
    expect(container.querySelector('img[src="/media/portada-3.webp"]')).toBeNull();
    expect(container.querySelector('img[src="/media/portada-4.webp"]')).toBeNull();
  });

  it('si_la_foto_visible_falla_la_siguiente_no_se_queda_esperando', () => {
    const { container } = montar([puesto(1), puesto(2), puesto(3)]);

    fireEvent.error(fotos(container)[0]);

    expect(fotos(container)).toHaveLength(2);
  });

  it('las_ya_vistas_conservan_su_foto', () => {
    const { container, getByRole } = montar([puesto(1), puesto(2), puesto(3), puesto(4)]);
    fireEvent.load(fotos(container)[0]);

    fireEvent.click(getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(getByRole('button', { name: 'Siguiente' }));

    const origenes = fotos(container).map((foto) => foto.getAttribute('src'));
    expect(origenes).toContain('/media/portada-1.webp');
    expect(origenes).toContain('/media/portada-2.webp');
    expect(origenes).toContain('/media/portada-3.webp');
  });

  it('mantiene_el_carrusel_accesible_y_las_diapositivas_ocultas_para_lectores', () => {
    const { container } = montar([puesto(1), puesto(2)]);
    const diapositivas = container.querySelectorAll('[aria-roledescription="diapositiva"]');

    expect(container.querySelector('[aria-roledescription="carrusel"]')).toHaveAttribute('aria-label', 'Destacados');
    expect(diapositivas).toHaveLength(2);
    expect(diapositivas[0]).toHaveAttribute('aria-hidden', 'false');
    expect(diapositivas[1]).toHaveAttribute('aria-hidden', 'true');
  });

  it('sin_portadas_no_hay_fotos', () => {
    const { container } = montar([puesto(1, null), puesto(2, null)]);

    expect(fotos(container)).toHaveLength(0);
  });
});
