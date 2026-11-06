import { afterEach, describe, expect, it } from 'vitest';
import { partirNombre } from '../components/layout/Logo';
import { aplicarSitio, ciudadSitio, nombreMarca, reiniciarSitio, SITIO_POR_DEFECTO, sitioActual, tituloPagina } from './sitio';

afterEach(() => reiniciarSitio());

describe('sitio', () => {
  it('sin nada del panel rige RioMarket en Riohacha', () => {
    expect(nombreMarca()).toBe('RioMarket');
    expect(ciudadSitio()).toBe('Riohacha');
    expect(sitioActual().correo_soporte).toBe('');
  });

  it('el titulo_de_la_pestana_lleva_el_nombre_de_la_marca', () => {
    aplicarSitio({ ...SITIO_POR_DEFECTO, nombre_marca: 'MercaCaribe' });

    expect(tituloPagina('Carrito')).toBe('Carrito · MercaCaribe');
    expect(tituloPagina('Auditoría', 'Administración')).toBe('Auditoría · Administración · MercaCaribe');
  });

  it('aplicar el sitio pone la paleta y el color de la barra del navegador', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#00626D" />';

    aplicarSitio({ ...SITIO_POR_DEFECTO, color_marca: 'verde', color_tema: '#306345' });

    expect(document.documentElement.dataset.marca).toBe('verde');
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#306345');
  });
});

describe('partirNombre', () => {
  it.each([
    ['RioMarket', ['Rio', 'Market']],
    ['MercaCaribe', ['Merca', 'Caribe']],
    ['Mercado Sol', ['Mercado ', 'Sol']],
    ['Plaza', ['Pla', 'za']],
    ['Á', ['Á', '']],
  ])('%s se parte en dos colores', (nombre, esperado) => {
    expect(partirNombre(nombre)).toEqual(esperado);
  });
});
