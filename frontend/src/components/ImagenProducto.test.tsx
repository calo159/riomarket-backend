import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Producto } from '../lib/types';
import { atributosFotoTarjeta, ImagenProducto, SIZES_TARJETA } from './ProductoCard';

const producto = (imagen: Record<string, unknown> | null) =>
  ({
    id: 1,
    nombre: 'Aguacate (kg)',
    imagenes: imagen ? [{ id: 1, orden: 1, es_principal: true, alt: 'Aguacate', ...imagen }] : [],
  }) as unknown as Producto;

describe('foto de la tarjeta de producto', () => {
  // El .env local puede traer VITE_API_URL: las URLs deben quedar tal cual (mismo origen).
  beforeEach(() => vi.stubEnv('VITE_API_URL', ''));

  it('usa_la_miniatura_y_deja_la_grande_en_el_srcset', () => {
    const atributos = atributosFotoTarjeta(
      producto({ url: '/media/grande.webp', miniatura: '/media/mini.webp', ancho: 1200, alto: 1200 }),
    );

    expect(atributos).toEqual({
      src: '/media/mini.webp',
      srcSet: '/media/mini.webp 400w, /media/grande.webp 1200w',
      sizes: SIZES_TARJETA,
      width: 400,
      height: 400,
    });
  });

  it('sin_ancho_el_srcset_supone_640w', () => {
    const { srcSet } = atributosFotoTarjeta(
      producto({ url: '/media/grande.webp', miniatura: '/media/mini.webp', ancho: null, alto: null }),
    ) as { srcSet: string };

    expect(srcSet).toBe('/media/mini.webp 400w, /media/grande.webp 640w');
  });

  it('sin_miniatura_distinta_usa_la_grande_sin_srcset', () => {
    for (const miniatura of [null, '/media/grande.webp']) {
      const atributos = atributosFotoTarjeta(
        producto({ url: '/media/grande.webp', miniatura, ancho: 640, alto: 640 }),
      );

      expect(atributos).toEqual({ src: '/media/grande.webp', width: 640, height: 640 });
      expect(atributos).not.toHaveProperty('srcSet');
    }
  });

  it('sin_imagenes_no_hay_foto', () => {
    expect(atributosFotoTarjeta(producto(null)).src).toBeNull();
  });

  it('con_prioridad_la_foto_se_pide_ya_y_con_prioridad_alta', () => {
    const { container } = render(
      <ImagenProducto
        producto={producto({ url: '/media/grande.webp', miniatura: '/media/mini.webp', ancho: 640, alto: 640 })}
        prioridad
      />,
    );
    const foto = container.querySelector('img')!;

    expect(foto).toHaveAttribute('src', '/media/mini.webp');
    expect(foto).toHaveAttribute('srcset', '/media/mini.webp 400w, /media/grande.webp 640w');
    expect(foto).toHaveAttribute('sizes', SIZES_TARJETA);
    expect(foto).toHaveAttribute('fetchpriority', 'high');
    expect(foto).toHaveAttribute('loading', 'eager');
    expect(foto).toHaveAttribute('width', '400');
  });

  it('sin_prioridad_se_carga_de_forma_diferida', () => {
    const { container } = render(
      <ImagenProducto producto={producto({ url: '/media/grande.webp', miniatura: '/media/mini.webp' })} />,
    );
    const foto = container.querySelector('img')!;

    expect(foto).toHaveAttribute('loading', 'lazy');
    expect(foto).not.toHaveAttribute('fetchpriority');
  });

  it('con_carga_inmediata_se_pide_ya_pero_sin_prioridad_alta', () => {
    const { container } = render(
      <ImagenProducto
        producto={producto({ url: '/media/grande.webp', miniatura: '/media/mini.webp' })}
        cargaInmediata
      />,
    );
    const foto = container.querySelector('img')!;

    expect(foto).toHaveAttribute('loading', 'eager');
    expect(foto).not.toHaveAttribute('fetchpriority');
  });
});
