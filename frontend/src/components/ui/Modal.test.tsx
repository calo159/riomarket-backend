import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

function Prueba({ onCerrar = () => {} }: { onCerrar?: () => void }) {
  return (
    <>
      <button type="button">Fondo</button>
      <Modal abierto onCerrar={onCerrar} titulo="Título">
        <input aria-label="Campo uno" />
        <button type="button">Aceptar</button>
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('el Tab da la vuelta dentro del diálogo y no llega al fondo', async () => {
    render(<Prueba />);
    const dialogo = screen.getByRole('dialog');
    const usuario = userEvent.setup();

    const dentro = () => dialogo.contains(document.activeElement);
    for (let i = 0; i < 6; i += 1) {
      await usuario.tab();
      expect(dentro()).toBe(true);
    }
    for (let i = 0; i < 6; i += 1) {
      await usuario.tab({ shift: true });
      expect(dentro()).toBe(true);
    }
  });

  it('Escape lo cierra', async () => {
    const onCerrar = vi.fn();
    render(<Prueba onCerrar={onCerrar} />);
    await userEvent.keyboard('{Escape}');
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('el overlay no es un destino del teclado', () => {
    render(<Prueba />);
    const botones = screen.getAllByRole('button', { hidden: true });
    const overlay = botones.find((b) => b.getAttribute('aria-hidden') === 'true');
    expect(overlay).toHaveAttribute('tabindex', '-1');
  });
});
