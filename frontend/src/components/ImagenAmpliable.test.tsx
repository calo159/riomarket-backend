import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImagenAmpliable } from './ImagenAmpliable';

function montar() {
  render(
    <ImagenAmpliable nombre="Aguacate">
      <img alt="Aguacate" src="/a.webp" />
    </ImagenAmpliable>,
  );
  return screen.getByRole('button', { name: /Aguacate/ });
}

/** jsdom no trae PointerEvent: el tipo de puntero se pone a mano. */
function salir(marco: HTMLElement, pointerType: string) {
  const evento = createEvent.pointerOut(marco); // React deduce onPointerLeave de pointerout
  Object.defineProperty(evento, 'pointerType', { value: pointerType });
  fireEvent(marco, evento);
}

describe('ImagenAmpliable', () => {
  it('se amplía con un clic y se aleja con otro', () => {
    const marco = montar();
    expect(marco).toHaveAttribute('aria-pressed', 'false');
    expect(marco).toHaveAccessibleName('Ampliar la foto de Aguacate');

    fireEvent.click(marco, { clientX: 10, clientY: 10 });
    expect(marco).toHaveAttribute('aria-pressed', 'true');
    expect(marco).toHaveAccessibleName('Alejar la foto de Aguacate');

    fireEvent.click(marco);
    expect(marco).toHaveAttribute('aria-pressed', 'false');
  });

  it('se aleja con Escape y se alterna con Enter y con espacio', () => {
    const marco = montar();
    fireEvent.keyDown(marco, { key: 'Enter' });
    expect(marco).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(marco, { key: 'Escape' });
    expect(marco).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(marco, { key: ' ' });
    expect(marco).toHaveAttribute('aria-pressed', 'true');
  });

  it('con mouse se aleja sola al salir del marco, para que no se quede atascada', () => {
    const marco = montar();
    fireEvent.click(marco);
    expect(marco).toHaveAttribute('aria-pressed', 'true');
    salir(marco, 'mouse');
    expect(marco).toHaveAttribute('aria-pressed', 'false');
  });

  it('con el dedo no se aleja al soltar: hay que tocarla otra vez', () => {
    const marco = montar();
    fireEvent.click(marco);
    salir(marco, 'touch');
    expect(marco).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(marco);
    expect(marco).toHaveAttribute('aria-pressed', 'false');
  });
});
