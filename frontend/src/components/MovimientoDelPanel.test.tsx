import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BarraProgreso } from './layout/BarraProgreso';
import { MenuPanel } from './layout/MenuItems';
import { Modal } from './ui/Modal';
import { ToastProvider, useToast } from './ui/Toast';
import { CargandoBloque } from './ui/Estado';
import type { MenuItem } from '../navigation/tipos';

/** `matchMedia` de mentira: `reducido` dice si la persona pidió «reducir movimiento». */
function simularMovimiento(reducido: boolean) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: consulta.includes('reduce') ? reducido : false,
    media: consulta,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('barra de progreso', () => {
  beforeEach(() => vi.useFakeTimers());

  function montar() {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <BarraProgreso />
      </QueryClientProvider>,
    );
    return client;
  }

  it('no aparece si todo está quieto', () => {
    montar();

    expect(document.querySelector('.barra-avanza')).toBeNull();
  });

  it('una carga instantánea no la muestra', async () => {
    const client = montar();

    await act(async () => {
      await client.fetchQuery({ queryKey: ['rapida'], queryFn: () => Promise.resolve(1) });
    });
    act(() => vi.advanceTimersByTime(300));

    expect(document.querySelector('.barra-avanza')).toBeNull();
  });

  it('una carga que tarda la muestra, y al terminar llega al final y se va', async () => {
    const client = montar();
    let terminar: () => void = () => undefined;

    act(() => {
      void client.fetchQuery({ queryKey: ['lenta'], queryFn: () => new Promise<number>((r) => (terminar = () => r(1))) });
    });
    // Primero React Query avisa del cambio (un tic) y recién ahí empieza la espera de la barra.
    act(() => vi.advanceTimersByTime(10));
    act(() => vi.advanceTimersByTime(200));
    expect(document.querySelector('.barra-avanza')).not.toBeNull();

    await act(async () => terminar());
    act(() => vi.advanceTimersByTime(10));
    expect(document.querySelector('.barra-termina')).not.toBeNull();
    act(() => vi.advanceTimersByTime(500));
    expect(document.querySelector('.barra-avanza, .barra-termina')).toBeNull();
  });

  it('es decorativa: no la lee un lector de pantalla', async () => {
    const client = montar();
    act(() => {
      void client.fetchQuery({ queryKey: ['x'], queryFn: () => new Promise<number>(() => undefined) });
    });
    act(() => vi.advanceTimersByTime(10));
    act(() => vi.advanceTimersByTime(200));

    expect(document.querySelector('.barra-avanza')?.parentElement).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('menú del panel', () => {
  const items = [
    { codigo: 'a', nombre: 'Resumen', ruta: '/admin', icono: 'LayoutDashboard', grupo: null, orden: 1, ubicaciones: ['panel_admin'] },
    { codigo: 'b', nombre: 'Usuarios', ruta: '/admin/usuarios', icono: 'Users', grupo: 'Accesos', orden: 2, ubicaciones: ['panel_admin'] },
  ] as unknown as MenuItem[];

  it('la opción activa se marca y el indicador que se desliza existe', () => {
    render(
      <MemoryRouter initialEntries={['/admin/usuarios']}>
        <MenuPanel items={items} badges={{}} />
      </MemoryRouter>,
    );

    const activa = screen.getByRole('link', { name: 'Usuarios' });
    expect(activa).toHaveAttribute('aria-current', 'page');
    // Antes de arreglarlo, la clase del enlace se perdía y la opción activa no se distinguía de las demás.
    expect(activa.className).toMatch(/text-brand-700/);
    expect(screen.getByRole('link', { name: 'Resumen' }).className).toMatch(/text-slate-600/);
    expect(document.querySelector('.menu-indicador')).toHaveAttribute('aria-hidden', 'true');
  });

  it('cada opción lleva su lugar para entrar de a una', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <MenuPanel items={items} badges={{}} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Resumen' }).className).toMatch(/menu-opcion/);
    expect(screen.getByRole('link', { name: 'Resumen' })).toHaveStyle({ '--i': '0' });
  });

  it('la insignia de pendientes se vuelve a dibujar cuando cambia el número', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/admin']}>
        <MenuPanel items={items} badges={{ b: 3 }} />
      </MemoryRouter>,
    );
    const antes = screen.getByLabelText('3 pendientes');

    rerender(
      <MemoryRouter initialEntries={['/admin']}>
        <MenuPanel items={items} badges={{ b: 4 }} />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('4 pendientes')).not.toBe(antes);
    expect(screen.getByLabelText('4 pendientes').className).toMatch(/animate-pop/);
  });
});

describe('ventana (Modal)', () => {
  function Prueba({ abierto }: { abierto: boolean }) {
    return (
      <Modal abierto={abierto} onCerrar={() => undefined} titulo="Confirmar">
        <p>Contenido</p>
      </Modal>
    );
  }

  it('con movimiento, al cerrar se queda lo que dura su salida y después se quita', () => {
    vi.useFakeTimers();
    simularMovimiento(false);
    const { rerender } = render(<Prueba abierto />);

    rerender(<Prueba abierto={false} />);
    expect(screen.getByRole('dialog').className).toMatch(/animate-sheet-sale/);

    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('con «reducir movimiento» se quita de una vez', () => {
    simularMovimiento(true);
    const { rerender } = render(<Prueba abierto />);

    rerender(<Prueba abierto={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('volver a abrirla mientras sale la deja abierta', () => {
    vi.useFakeTimers();
    simularMovimiento(false);
    const { rerender } = render(<Prueba abierto />);

    rerender(<Prueba abierto={false} />);
    rerender(<Prueba abierto />);
    act(() => vi.advanceTimersByTime(300));

    expect(screen.getByRole('dialog').className).toMatch(/animate-sheet\b/);
  });
});

describe('avisos (Toast)', () => {
  function Boton() {
    const toast = useToast();
    return <button onClick={() => toast.exito('Guardado')}>avisar</button>;
  }

  it('traen su reloj y, con movimiento, salen con animación antes de quitarse', () => {
    vi.useFakeTimers();
    simularMovimiento(false);
    render(
      <ToastProvider>
        <Boton />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('avisar'));
    expect(document.querySelector('.toast-reloj')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.getByText('Guardado')).toBeInTheDocument();
    expect(document.querySelector('.toast-sale')).not.toBeNull();

    act(() => vi.advanceTimersByTime(250));
    expect(screen.queryByText('Guardado')).not.toBeInTheDocument();
  });

  it('con «reducir movimiento» se quitan de una vez', () => {
    simularMovimiento(true);
    render(
      <ToastProvider>
        <Boton />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('avisar'));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));

    expect(screen.queryByText('Guardado')).not.toBeInTheDocument();
  });
});

describe('carga de listas', () => {
  it('muestra renglones y deja el mensaje solo para el lector de pantalla', () => {
    const { container } = render(<CargandoBloque mensaje="Cargando usuarios…" />);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando usuarios…');
    expect(screen.getByText('Cargando usuarios…')).toHaveClass('sr-only');
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(3);
  });
});
