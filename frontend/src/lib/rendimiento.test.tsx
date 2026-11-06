import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Banderines } from '../components/ui/Banderines';
import { useCerca } from './useCerca';

type Aviso = (entradas: { isIntersecting: boolean }[]) => void;
let observadores: { aviso: Aviso; observados: Element[]; desconectado: boolean }[] = [];

/** `IntersectionObserver` de mentira: la prueba decide cuándo algo entra o sale de la pantalla. */
function simularObservador() {
  observadores = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      registro: (typeof observadores)[number];
      constructor(aviso: Aviso) {
        this.registro = { aviso, observados: [], desconectado: false };
        observadores.push(this.registro);
      }
      observe(el: Element) {
        this.registro.observados.push(el);
      }
      disconnect() {
        this.registro.desconectado = true;
      }
      unobserve() {}
    },
  );
}
const mover = (aLaVista: boolean) =>
  act(() => observadores.filter((o) => !o.desconectado).forEach((o) => o.aviso([{ isIntersecting: aLaVista }])));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('useCerca', () => {
  function Sonda({ unaVez = false }: { unaVez?: boolean }) {
    const [ref, cerca] = useCerca<HTMLDivElement>(300, unaVez);
    return (
      <div ref={ref} data-testid="x">
        {cerca ? 'cerca' : 'lejos'}
      </div>
    );
  }

  it('sin IntersectionObserver se considera siempre cerca (nada se queda sin cargar)', () => {
    render(<Sonda />);

    expect(screen.getByTestId('x')).toHaveTextContent('cerca');
  });

  it('empieza lejos, pasa a cerca al acercarse y vuelve a lejos al alejarse', () => {
    simularObservador();
    render(<Sonda />);
    expect(screen.getByTestId('x')).toHaveTextContent('lejos');

    mover(true);
    expect(screen.getByTestId('x')).toHaveTextContent('cerca');
    mover(false);
    expect(screen.getByTestId('x')).toHaveTextContent('lejos');
  });

  it('con «una vez», lo que ya se acercó no vuelve a lejos y deja de observar', () => {
    simularObservador();
    render(<Sonda unaVez />);

    mover(true);
    expect(screen.getByTestId('x')).toHaveTextContent('cerca');
    expect(observadores[0].desconectado).toBe(true);
  });
});

describe('banderines', () => {
  it('se pausan cuando la portada sale de la pantalla y se reanudan al volver', () => {
    simularObservador();
    const { container } = render(<Banderines />);
    const caja = container.querySelector('.banderines') as HTMLElement;

    mover(false);
    expect(caja).toHaveAttribute('data-pausa', '1');
    mover(true);
    expect(caja).not.toHaveAttribute('data-pausa');
  });

  it('solo hay cinco fases de balanceo (lo que cuesta es cuántas fases hay, no cuántos banderines)', () => {
    const { container } = render(<Banderines />);

    const fases = new Set(Array.from(container.querySelectorAll<HTMLElement>('.banderin')).map((e) => e.style.getPropertyValue('--f')));
    expect(fases.size).toBe(5);
  });
});

describe('reseñas de la portada', () => {
  const resena = (id: number) => ({ id, id_puesto: id, calificacion: 5, comentario: 'Las arepas de huevo son las mejores de Riohacha.', usuario_nombre: 'Luis Fernando' });

  beforeEach(() => {
    vi.doMock('../api/reviews', () => ({ listarResenas: vi.fn().mockResolvedValue({ results: [resena(1), resena(2)] }) }));
  });

  async function montar() {
    const { VocesDelMercado: Voces } = await import('../components/VocesDelMercado');
    const api = await import('../api/reviews');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <Voces puestos={[]} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    return api.listarResenas as ReturnType<typeof vi.fn>;
  }

  it('no se piden hasta que la sección se acerca a la pantalla', async () => {
    simularObservador();
    const listar = await montar();
    await act(async () => undefined);
    expect(listar).not.toHaveBeenCalled();

    mover(true);
    await act(async () => undefined);
    expect(listar).toHaveBeenCalledTimes(1);
  });

  it('donde no hay observador se piden de una vez, como antes', async () => {
    const listar = await montar();
    await act(async () => undefined);

    expect(listar).toHaveBeenCalledTimes(1);
  });
});

describe('identidad del sitio', () => {
  function inyectar(json: string | null) {
    document.getElementById('sitio-config')?.remove();
    if (json === null) return;
    const el = document.createElement('script');
    el.id = 'sitio-config';
    el.type = 'application/json';
    el.textContent = json;
    document.head.appendChild(el);
  }
  afterEach(() => inyectar(null));

  async function montarSincronizador() {
    vi.doMock('../api/sitio', () => ({ obtenerSitio: vi.fn().mockResolvedValue({ nombre_marca: 'Desde la API' }) }));
    const { SitioSync } = await import('../components/SitioSync');
    const api = await import('../api/sitio');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <SitioSync />
      </QueryClientProvider>,
    );
    await act(async () => undefined);
    return api.obtenerSitio as ReturnType<typeof vi.fn>;
  }

  it('si Django dejó la identidad en el HTML, no se pide al cargar', async () => {
    inyectar(JSON.stringify({ nombre_marca: 'MercaCaribe', color_marca: 'verde' }));

    const pedir = await montarSincronizador();

    expect(pedir).not.toHaveBeenCalled();
  });

  it('sin eso (npm run dev) se pide como antes', async () => {
    inyectar('__SITIO_JSON__');

    const pedir = await montarSincronizador();

    expect(pedir).toHaveBeenCalledTimes(1);
  });
});
