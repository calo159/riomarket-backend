import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Puesto } from '../lib/types';
import { cn, urlAbsoluta } from '../lib/utils';
import { LogoPuesto } from './PuestoCard';

interface Diapositiva {
  clave: string;
  titulo: string;
  texto: string;
  cta: string;
  to: string;
  fondo: string;
  colorTexto: string;
  foto: string | null;
  puesto: Puesto | null;
}

/** Colores de fondo de las diapositivas (del diseño); el texto cumple AA sobre cada uno. */
const FONDOS = [
  { fondo: '#0D5C8A', color: '#FFFFFF' },
  { fondo: '#FFD166', color: '#1B2A33' },
  { fondo: '#00626D', color: '#FFFFFF' },
  { fondo: '#CF3F1B', color: '#FFFFFF' },
];

function recortar(texto: string, max: number) {
  const limpio = texto.trim();
  return limpio.length > max ? `${limpio.slice(0, max - 1).trimEnd()}…` : limpio;
}

/** Con datos reales: cada puesto (los que tienen portada primero) es una diapositiva. */
function diapositivasDe(puestos: Puesto[]): Diapositiva[] {
  const ordenados = [...puestos].sort((a, b) => Number(Boolean(b.portada)) - Number(Boolean(a.portada)));
  const reales = ordenados.slice(0, 4).map<Diapositiva>((p, i) => ({
    clave: `p${p.id}`,
    titulo: p.nombre,
    texto: p.descripcion ? recortar(p.descripcion, 110) : 'Mira lo que tiene este puesto de Riohacha.',
    cta: 'Ver el puesto',
    to: `/puestos/${p.id}`,
    fondo: FONDOS[i % FONDOS.length].fondo,
    colorTexto: FONDOS[i % FONDOS.length].color,
    foto: urlAbsoluta(p.portada),
    puesto: p,
  }));
  if (reales.length > 0) return reales;
  return [
    {
      clave: 'catalogo',
      titulo: 'El mercado de Riohacha, en línea',
      texto: 'Productos de los puestos de tu ciudad, a domicilio o para recoger.',
      cta: 'Ver el catálogo',
      to: '/catalogo',
      fondo: FONDOS[2].fondo,
      colorTexto: FONDOS[2].color,
      foto: null,
      puesto: null,
    },
  ];
}

const DURACION = 5500;
const ENTRADA =
  'translate-y-3.5 opacity-0 transition duration-500 [transition-timing-function:cubic-bezier(.2,.8,.2,1)]';

export function Destacados({ puestos }: { puestos: Puesto[] }) {
  const slides = diapositivasDe(puestos);
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = slides.length;
  const indice = actual % total;

  useEffect(() => {
    if (actual >= total) setActual(0);
  }, [actual, total]);

  const ir = (i: number) => setActual((i + total) % total);

  return (
    <section
      className="relative h-[176px] overflow-hidden md:h-[348px]"
      style={{ background: slides[indice].fondo }}
      aria-roledescription="carrusel"
      aria-label="Destacados"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      {slides.map((s, i) => {
        const activa = i === indice;
        return (
          <div
            key={s.clave}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${total}`}
            aria-hidden={!activa}
            className={cn(
              'absolute inset-0 transition-opacity duration-[700ms] ease-out',
              activa ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
            style={{ background: s.fondo, color: s.colorTexto }}
          >
            {s.foto ? (
              <div className="absolute inset-y-0 right-0 w-[42%] overflow-hidden md:w-[58%]">
                <img
                  src={s.foto}
                  alt=""
                  className={cn(
                    'h-full w-full object-cover transition-transform duration-[6000ms] ease-out',
                    activa ? 'scale-100' : 'scale-[1.06]',
                  )}
                />
              </div>
            ) : (
              s.puesto && (
                <div className="absolute right-[8%] top-1/2 hidden -translate-y-1/2 md:block">
                  <LogoPuesto nombre={s.puesto.nombre} logo={s.puesto.logo} className="h-48 w-48 text-6xl" />
                </div>
              )
            )}
            <div className="mx-auto h-full max-w-[1240px] px-4 md:px-5">
              <div className="relative flex h-full max-w-[58%] flex-col items-start justify-center gap-1.5 pb-6 md:max-w-[520px] md:gap-2.5 md:pb-10">
                <h2
                  className={cn(
                    'line-clamp-3 text-2xl font-extrabold leading-[1.08] tracking-[-0.02em] md:text-[43px] md:leading-[1.05] md:tracking-[-0.025em]',
                    ENTRADA,
                    activa && '!translate-y-0 !opacity-100',
                  )}
                >
                  {s.titulo}
                </h2>
                <p
                  className={cn(
                    'line-clamp-2 max-w-[440px] text-sm md:line-clamp-3 md:text-lg',
                    ENTRADA,
                    activa && '!translate-y-0 !opacity-100 [transition-delay:.08s]',
                  )}
                >
                  {s.texto}
                </p>
                <Link
                  to={s.to}
                  tabIndex={activa ? 0 : -1}
                  className={cn(
                    'mt-1 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-[3px] md:mt-1.5 md:rounded-lg md:bg-accion md:px-5 md:py-3 md:text-base md:text-white md:no-underline md:hover:bg-accion-hover md:hover:text-white',
                    ENTRADA,
                    activa && '!translate-y-0 !opacity-100 [transition-delay:.16s]',
                  )}
                  style={{ color: 'inherit' }}
                >
                  {s.cta}
                  <ArrowRight className="hidden h-[17px] w-[17px] md:block" strokeWidth={2.4} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {total > 1 && (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => ir(indice - 1)}
            className="absolute left-0 top-1/2 z-[3] -mt-8 hidden h-16 w-11 place-items-center rounded-r-lg bg-white/90 text-brand-600 transition-[width] hover:w-[52px] md:grid"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={() => ir(indice + 1)}
            className="absolute right-0 top-1/2 z-[3] -mt-8 hidden h-16 w-11 place-items-center rounded-l-lg bg-white/90 text-brand-600 transition-[width] hover:w-[52px] md:grid"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <div className="absolute bottom-[3px] left-4 z-[3] flex gap-[2px] md:bottom-[44px] md:left-1/2 md:-translate-x-1/2 md:gap-[1px]">
            {slides.map((s, i) => (
              <button
                key={s.clave}
                type="button"
                aria-label={`Ir al destacado ${i + 1}`}
                aria-current={i === indice}
                onClick={() => ir(i)}
                className="grid h-9 place-items-center px-[3px]"
              >
                <span
                  className="relative block h-[6px] w-[22px] overflow-hidden rounded-[3px] md:w-[26px]"
                  style={{ color: slides[indice].colorTexto }}
                >
                  <span className="absolute inset-0 bg-current opacity-40" />
                  {i === indice && (
                    <i
                      key={actual}
                      className="absolute inset-0 block origin-left bg-current"
                      style={{
                        animation: `llenar ${DURACION}ms linear forwards`,
                        animationPlayState: pausado ? 'paused' : 'running',
                      }}
                      onAnimationEnd={() => ir(indice + 1)}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
