import { Fragment, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Store, Truck } from 'lucide-react';
import type { Pedido, Puesto } from '../lib/types';
import { formatearMoneda } from '../lib/format';
import { urlAbsoluta } from '../lib/utils';
import { Imagen } from './Imagen';
import { EtiquetaEstado } from './ui/EtiquetaEstado';

/** El titular sube palabra por palabra desde una máscara (`.palabra`, index.css); `desde` es el lugar de la primera. */
function Palabras({ texto, desde = 0 }: { texto: string; desde?: number }) {
  return (
    <>
      {texto.split(' ').map((palabra, i) => (
        <Fragment key={i}>
          <span className="palabra">
            <span style={{ '--i': desde + i } as CSSProperties}>{palabra}</span>
          </span>{' '}
        </Fragment>
      ))}
    </>
  );
}

/** Franjas del toldo: coral y crema, los colores del símbolo de la marca. */
const FRANJAS = 13;
const ANCHO_FRANJA = 40;
const ALTO_TOLDO = 40;

/**
 * Toldo de puesto de mercado dibujado con la marca (franjas coral y crema, borde festoneado). Es el motivo del
 * logo llevado a gran tamaño: el primer pliegue de la tienda deja de ser un carrusel de marketplace y pasa a ser
 * un puesto con su toldo.
 */
function Toldo({ className }: { className?: string }) {
  const ancho = FRANJAS * ANCHO_FRANJA;
  return (
    <svg
      viewBox={`0 0 ${ancho} ${ALTO_TOLDO}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <clipPath id="recorte-toldo">
          <rect x="0" y="0" width={ancho} height={ALTO_TOLDO - ANCHO_FRANJA / 2} />
          {Array.from({ length: FRANJAS }).map((_, i) => (
            <circle key={i} cx={ANCHO_FRANJA * i + ANCHO_FRANJA / 2} cy={ALTO_TOLDO - ANCHO_FRANJA / 2} r={ANCHO_FRANJA / 2} />
          ))}
        </clipPath>
      </defs>
      <g clipPath="url(#recorte-toldo)">
        {Array.from({ length: FRANJAS }).map((_, i) => (
          <rect
            key={i}
            x={ANCHO_FRANJA * i}
            y="0"
            width={ANCHO_FRANJA}
            height={ALTO_TOLDO}
            fill={i % 2 === 0 ? '#E4502A' : '#FFF4DC'}
          />
        ))}
        {/* Una sombra suave bajo el borde: el toldo cuelga sobre la foto. */}
        <rect x="0" y="0" width={ancho} height="6" fill="#000" opacity="0.12" />
      </g>
    </svg>
  );
}

/** Ticket de papel: lo que el visitante tiene entre manos (su pedido, o un puesto para empezar). Limpio, sin adornos. */
function Ticket({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-white p-4 text-tinta shadow-menu dark:bg-slate-800 dark:text-slate-100">{children}</div>;
}

/**
 * Primer pliegue de la tienda. Reemplaza al carrusel de destacados (la plantilla de marketplace más repetida):
 * un titular fijo, dos acciones y un puesto con toldo. El «ticket» sobre la foto es el pedido en curso del comprador
 * (si tiene uno) o, si no, un puesto real para empezar: la misma idea del ticket de la landing, ahora con datos.
 */
export function Escaparate({
  puestos,
  pedido,
}: {
  puestos: Puesto[];
  /** Pedido sin terminar del comprador con sesión, si lo hay. */
  pedido?: Pedido | null;
}) {
  // El puesto de la foto: con portada primero y, entre los que la tienen, el mejor calificado.
  const primero =
    [...puestos].sort(
      (a, b) =>
        Number(Boolean(b.portada)) - Number(Boolean(a.portada)) ||
        (b.calificacion_promedio ?? 0) - (a.calificacion_promedio ?? 0),
    )[0] ?? null;
  const delPedido = pedido ? (puestos.find((p) => p.id === pedido.id_puesto) ?? null) : null;
  // La foto es la del puesto del pedido en curso (si lo hay y está en la lista); si no, la del primer puesto con portada.
  const puesto = delPedido ?? primero;
  const portada = urlAbsoluta(puesto?.portada);

  return (
    <section className="relative overflow-hidden bg-brand-600 text-white dark:bg-[#0B3A3F]" aria-labelledby="titular-tienda">
      <div className="relative mx-auto grid max-w-[1240px] items-center gap-8 px-4 pb-24 pt-10 md:px-5 md:pb-28 md:pt-[72px] lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <h1
            id="titular-tienda"
            className="text-balance text-[clamp(34px,5vw,56px)] font-bold leading-[1.06] tracking-[-0.03em]"
          >
            <Palabras texto="Compra directo en los puestos de" />
            <span className="text-amarillo">
              <Palabras texto="Riohacha" desde={6} />
            </span>
          </h1>
          <p
            className="hero-aparece mt-4 max-w-[34rem] text-[17px] leading-snug text-white/90 md:text-lg"
            style={{ '--retraso': '650ms' } as CSSProperties}
          >
            Cada pedido es de un solo puesto: sabes quién lo prepara y a quién preguntarle. A domicilio o para recoger.
          </p>
          <div className="hero-aparece mt-6 flex flex-wrap gap-3" style={{ '--retraso': '800ms' } as CSSProperties}>
            <Link to="/catalogo" className="btn-primary !min-h-[52px] px-6 text-base">
              Ver el catálogo
            </Link>
            <a
              href="#puestos"
              className="btn !min-h-[52px] border border-white/45 px-6 text-base text-white hover:bg-white/10 hover:text-white"
            >
              Conocer los puestos
            </a>
          </div>
        </div>

        <div className="foto-flota relative mx-auto w-full max-w-[520px] lg:mx-0 lg:ml-auto">
          <Toldo className="toldo-desplega relative z-[2] block h-[28px] w-full md:h-[38px]" />
          <div className="foto-entra relative -mt-1 overflow-hidden rounded-b-[16px] bg-brand-700 dark:bg-slate-800">
            {portada ? (
              <Imagen
                src={portada}
                fallbackNombre={puesto?.nombre ?? 'RioMarket'}
                alt={`Puesto ${puesto?.nombre ?? ''}`}
                contenedorClassName="aspect-[16/10] w-full md:aspect-[5/4]"
                prioridad
              />
            ) : (
              <div className="grid aspect-[16/10] w-full place-items-center md:aspect-[5/4]">
                <Store className="h-16 w-16 text-white/60" aria-hidden="true" />
              </div>
            )}
          </div>

          {(pedido || puesto) && (
            <div className="absolute -bottom-12 left-3 right-3 z-[3] ticket-entra md:-bottom-14 md:left-6 md:right-auto md:w-[78%]">
              <Ticket>
                {pedido ? (
                  <>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">Tu pedido en curso</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <b className="text-base">{delPedido?.nombre ?? `Pedido #${pedido.id}`}</b>
                      <EtiquetaEstado estado={pedido.estado} />
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">Total {formatearMoneda(pedido.total)}</p>
                    <Link to={`/pedidos/${pedido.id}`} className="link mt-1.5 inline-block text-sm">
                      Seguir mi pedido
                    </Link>
                  </>
                ) : (
                  puesto && (
                    <>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">Un puesto para empezar</p>
                      <b className="mt-1 block text-base">{puesto.nombre}</b>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-600 dark:text-slate-300">
                        {puesto.calificacion_promedio ? (
                          <span className="font-bold text-estrella dark:text-amber-400">★ {puesto.calificacion_promedio.toFixed(1)}</span>
                        ) : null}
                        {puesto.ofrece_domicilio && (
                          <span className="inline-flex items-center gap-1 font-semibold text-exito dark:text-[#6FD596]">
                            <Truck className="h-3.5 w-3.5" aria-hidden="true" /> Domicilio
                          </span>
                        )}
                      </p>
                      <Link to={`/puestos/${puesto.id}`} className="link mt-1.5 inline-block text-sm">
                        Ver el puesto
                      </Link>
                    </>
                  )
                )}
              </Ticket>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
