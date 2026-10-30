import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listarPuestos } from '../api/catalog';
import { useSession } from '../auth/SessionProvider';
import { inicioPorRol } from '../auth/permisos';
import { Imagen } from '../components/Imagen';
import { CargandoPantalla } from '../components/ui/Estado';
import { claves } from '../lib/queryKeys';
import { cn, urlAbsoluta } from '../lib/utils';
import s from './Landing.module.css';

const TITULO = 'RioMarket · Haz el mercado desde el celular';
const DESCRIPCION =
  'Los puestos de Riohacha venden aquí frutas, pescado, comida y dulces. Pide a un puesto, escoge domicilio o retiro y sigue tu pedido hasta que lo recibes. Proyecto académico.';

type Modo = 'comprar' | 'vender';

function Flecha() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <Link className={cn(s.logo, className)} to="/" aria-label="RioMarket, inicio">
      Rio<span>Market</span>
    </Link>
  );
}

function ListaTicket() {
  return (
    <ul className={s.tkLs}>
      <li>
        <b>2</b>Mangos
      </li>
      <li>
        <b>1</b>Coco
      </li>
      <li>
        <b>6</b>Limones
      </li>
    </ul>
  );
}

/** Pedido de ejemplo: se «imprime», recorre los cinco estados y cae el sello. */
function TicketPedido() {
  return (
    <div
      className={s.ticket}
      role="img"
      aria-label="Pedido de ejemplo a Frutas del Caribe con domicilio: dos mangos, un coco y seis limones. Pasa de pendiente a entregado y se confirma la entrega."
    >
      <div className={s.tkPrint}>
        <div className={s.tkPaper}>
          <div className={s.tkHd}>
            <span className={s.tkP}>Frutas del Caribe</span>
            <span className={s.tkM}>Domicilio</span>
          </div>
          <ListaTicket />
          <div className={s.tkSt}>
            <span className={s.tkK}>Estado del pedido</span>
            <div className={s.tkLb}>
              <span className={s.s1}>Pendiente</span>
              <span className={s.s2}>Confirmado</span>
              <span className={s.s3}>En preparación</span>
              <span className={s.s4}>En camino</span>
              <span className={s.s5}>Entregado</span>
            </div>
            <div className={s.tkBar}>
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      </div>
      <span className={s.sello}>
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m5 12 5 5 9-10" />
        </svg>
        Lo recibí
      </span>
    </div>
  );
}

const NODOS: { estado: string; quien: string; tu?: boolean; texto: string }[] = [
  { estado: 'Pendiente', quien: 'Tú', tu: true, texto: 'Haces el pedido y escoges domicilio o retiro en el puesto.' },
  { estado: 'Confirmado', quien: 'El puesto', texto: 'El vendedor acepta tu pedido.' },
  { estado: 'En preparación', quien: 'El puesto', texto: 'Lo están alistando en el puesto.' },
  { estado: 'En camino', quien: 'El puesto', texto: 'El vendedor lo envía hacia ti.' },
  { estado: 'Entregado', quien: 'Tú', tu: true, texto: 'Confirmas que lo recibiste. Ahí ya puedes reseñar el puesto.' },
];

const PASOS: Record<Modo, { titulo: string; texto: string }[]> = {
  comprar: [
    {
      titulo: 'Busca lo que te hace falta',
      texto: 'Recorre los puestos o busca un producto. Cada puesto muestra lo que vende, su horario y sus reseñas.',
    },
    {
      titulo: 'Arma el pedido con un puesto',
      texto: 'Todo lo del carrito es de un mismo vendedor. Si quieres algo de otro puesto, haces otro pedido.',
    },
    {
      titulo: 'Escoge cómo te llega',
      texto: 'A domicilio o retiro en el puesto. Si el puesto tiene cupón, lo aplicas al pagar.',
    },
  ],
  vender: [
    { titulo: 'Crea tu cuenta de vendedor', texto: 'Registras tu puesto con su dirección y su horario.' },
    {
      titulo: 'Verifica tu identidad',
      texto: 'Subes los datos de tu cédula y un administrador los revisa. Cuando te aprueba, ya puedes publicar.',
    },
    {
      titulo: 'Publica y atiende tus pedidos',
      texto:
        'Subes productos con foto, precio y existencias. Confirmas, preparas y envías desde tu panel, y creas cupones para tu puesto.',
    },
  ],
};

const MODOS: { id: Modo; etiqueta: string }[] = [
  { id: 'comprar', etiqueta: 'Vengo a comprar' },
  { id: 'vender', etiqueta: 'Tengo un puesto' },
];

function ComoFunciona({ modo, setModo }: { modo: Modo; setModo: (modo: Modo) => void }) {
  const botones = useRef<Record<Modo, HTMLButtonElement | null>>({ comprar: null, vender: null });

  const alTeclear = (evento: KeyboardEvent<HTMLButtonElement>) => {
    let destino: Modo | null = null;
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowLeft') destino = modo === 'comprar' ? 'vender' : 'comprar';
    if (evento.key === 'Home') destino = 'comprar';
    if (evento.key === 'End') destino = 'vender';
    if (!destino) return;
    evento.preventDefault();
    setModo(destino);
    botones.current[destino]?.focus();
  };

  const pasos = PASOS[modo];
  return (
    <>
      <div className={s.sw} role="tablist" aria-label="Escoge tu caso">
        <span className={cn(s.thumb, modo === 'vender' && s.der)} aria-hidden="true" />
        {MODOS.map(({ id, etiqueta }) => (
          <button
            key={id}
            ref={(el) => {
              botones.current[id] = el;
            }}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={modo === id}
            aria-controls="panel-modo"
            tabIndex={modo === id ? 0 : -1}
            className={cn(s.swB, modo === id && s.on)}
            onClick={() => setModo(id)}
            onKeyDown={alTeclear}
          >
            {etiqueta}
          </button>
        ))}
      </div>
      <div id="panel-modo" role="tabpanel" aria-labelledby={`tab-${modo}`} key={modo} className={s.modo}>
        <div>
          <ol className={s.pasos}>
            {pasos.map((paso, i) => (
              <li key={paso.titulo} className={s.paso}>
                <span className={s.num}>{i + 1}</span>
                <div>
                  <h3>{paso.titulo}</h3>
                  <p>{paso.texto}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className={s.acts}>
            {modo === 'comprar' ? (
              <Link className={cn(s.btn, s.coral)} to="/tienda">
                Ir a la tienda
                <Flecha />
              </Link>
            ) : (
              <Link className={cn(s.btn, s.coral)} to="/registro?rol=vendedor">
                Crear mi cuenta de vendedor
                <Flecha />
              </Link>
            )}
          </div>
        </div>
        <div className={s.vista}>
          {modo === 'comprar' ? (
            <figure className={s.ph}>
              <img
                src="/landing/arepa-de-huevo.webp"
                width={640}
                height={640}
                loading="lazy"
                decoding="async"
                alt="Arepa de huevo partida a la mitad, con el huevo a la vista"
              />
            </figure>
          ) : (
            <>
              <figure className={s.ph}>
                <img
                  src="/landing/coco.webp"
                  width={640}
                  height={640}
                  loading="lazy"
                  decoding="async"
                  alt="Un coco entero junto a otro abierto por la mitad"
                />
              </figure>
              <div
                className={s.tkV}
                role="img"
                aria-label="Ejemplo de un pedido nuevo visto por el vendedor, con el botón para confirmarlo."
              >
                <div className={s.tkPaper}>
                  <div className={s.tkHd}>
                    <span className={s.tkP}>Pedido nuevo</span>
                    <span className={s.tkM}>Domicilio</span>
                  </div>
                  <ListaTicket />
                  <p className={s.tkCobro}>Pago en efectivo: tú confirmas el cobro cuando te paguen.</p>
                  <span className={s.tkBtn}>Confirmar pedido</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** Puestos reales: hasta 4, con los que tienen portada primero. */
function Pasillo() {
  const consulta = useQuery({
    queryKey: claves.puestos.landing,
    queryFn: () => listarPuestos({ page_size: 8, ordering: 'nombre' }),
    staleTime: 5 * 60_000,
  });

  if (consulta.isLoading) {
    return (
      <div className={s.pasillo} aria-busy="true" aria-label="Cargando puestos">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn(s.pu, s.esqueleto)} aria-hidden="true">
            <figure className={s.ph} />
            <i />
            <i />
          </div>
        ))}
      </div>
    );
  }

  if (consulta.isError) {
    return <p className={s.aviso2}>No pudimos cargar los puestos en este momento. Puedes verlos en la tienda.</p>;
  }

  const puestos = [...(consulta.data?.results ?? [])]
    .sort((a, b) => Number(Boolean(b.portada)) - Number(Boolean(a.portada)))
    .slice(0, 4);

  if (puestos.length === 0) {
    return <p className={s.aviso2}>Todavía no hay puestos publicados. Cuando se abran, los verás aquí.</p>;
  }

  return (
    <div className={cn(s.pasillo, puestos.length < 4 && s[`n${puestos.length}`])}>
      {puestos.map((puesto) => {
        const categorias = ((puesto.categorias ?? []) as unknown as { nombre: string }[]).map((c) => c.nombre);
        return (
          <Link key={puesto.id} className={s.pu} to={`/puestos/${puesto.id}`}>
            <figure className={s.ph}>
              <Imagen
                src={urlAbsoluta(puesto.portada)}
                fallbackNombre={puesto.nombre}
                contenedorClassName="h-full w-full"
                width={600}
                height={800}
              />
            </figure>
            <b>{puesto.nombre}</b>
            {categorias.length > 0 && <span>{categorias.slice(0, 2).join(' · ')}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export function Landing() {
  const { estado, rol } = useSession();
  const [modo, setModo] = useState<Modo>('comprar');

  useEffect(() => {
    const anterior = document.title;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const descripcionAnterior = meta?.content ?? null;
    document.title = TITULO;
    if (meta) meta.content = DESCRIPCION;
    return () => {
      document.title = anterior;
      if (meta && descripcionAnterior !== null) meta.content = descripcionAnterior;
    };
  }, []);

  if (estado === 'cargando') return <CargandoPantalla />;
  if (estado === 'autenticado') return <Navigate to={inicioPorRol(rol)} replace />;

  return (
    <div className={s.lp}>
      <header className={cn(s.w, s.nav)}>
        <Logo />
        <nav className={s.links} aria-label="Principal">
          <a className={s.tx} href="#pedido">
            Tu pedido
          </a>
          <a className={s.tx} href="#como">
            Cómo funciona
          </a>
          <a className={s.tx} href="#puestos">
            Puestos
          </a>
          <div className={s.acc}>
            <Link className={cn(s.btn, s.borde, s.sm)} to="/login">
              Ingresar
            </Link>
            <Link className={cn(s.btn, s.coral, s.sm)} to="/tienda">
              Ir a la tienda
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className={cn(s.w, s.hero)} aria-labelledby="titulo">
          <h1 id="titulo">
            <span className={s.ln}>
              <span>Haz el mercado</span>
            </span>{' '}
            <span className={s.ln}>
              <span className={s.tq}>desde el celular.</span>
            </span>
          </h1>
          <div className={s.hRow}>
            <div>
              <p className={cn(s.lead, s.in, s.d1)}>
                Los puestos de Riohacha venden aquí frutas, pescado, comida y dulces. Le pides a un puesto, escoges
                domicilio o retiro, y ves tu pedido avanzar hasta que lo tienes en la mano.
              </p>
              <div className={cn(s.acts, s.in, s.d2)}>
                <Link className={cn(s.btn, s.coral)} to="/tienda">
                  Ir a la tienda
                  <Flecha />
                </Link>
                <a className={cn(s.btn, s.borde)} href="#como" onClick={() => setModo('vender')}>
                  Tengo un puesto
                </a>
              </div>
              <p className={cn(s.nota, s.in, s.d3)}>Proyecto académico. Los pagos en línea funcionan en modo de prueba.</p>
            </div>
            <div className={s.stage}>
              <figure className={cn(s.ph, s.phBig)}>
                <img
                  src="/landing/aguacate.webp"
                  width={640}
                  height={640}
                  {...{ fetchpriority: 'high' }}
                  decoding="async"
                  alt="Aguacates partidos sobre una hoja de plátano"
                />
              </figure>
              <figure className={cn(s.ph, s.phSm)}>
                <img
                  src="/landing/mango.webp"
                  width={640}
                  height={640}
                  loading="lazy"
                  decoding="async"
                  alt="Mango cortado en cubos sobre un plato"
                />
              </figure>
              <TicketPedido />
              <span className={s.tkCap}>Pedido de ejemplo</span>
            </div>
          </div>
        </section>

        <section className={s.franja} aria-label="Un pedido, un puesto">
          <div className={s.w}>
            <p className={s.big}>
              Cada pedido es de un solo puesto. <span>Sabes quién te lo prepara y a quién preguntarle.</span>
            </p>
            <p className={s.nf}>Por eso el carrito no mezcla puestos: lo que pides, lo alista ese vendedor.</p>
          </div>
        </section>

        <section className={cn(s.w, s.sec)} id="pedido" aria-labelledby="t-pedido">
          <h2 id="t-pedido">De pendiente a entregado, sin adivinar.</h2>
          <p className={s.sub}>El puesto avanza tu pedido y tú lo ves en cada paso. La entrega la confirmas tú.</p>
          <div className={s.ruta}>
            <span className={s.linea} aria-hidden="true">
              <i />
            </span>
            <ol className={s.nodos}>
              {NODOS.map((nodo) => (
                <li key={nodo.estado} className={s.nodo}>
                  <span className={s.pt} aria-hidden="true" />
                  <h3>{nodo.estado}</h3>
                  <span className={cn(s.quien, nodo.tu && s.tu)}>{nodo.quien}</span>
                  <p>{nodo.texto}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className={s.aviso}>
            <b>¿No te llegó?</b>
            <p>
              Lo reportas desde el mismo pedido con <q>No me ha llegado</q>. El pedido solo queda entregado cuando se
              confirma la entrega.
            </p>
          </div>
        </section>

        <section className={cn(s.w, s.sec)} id="como" aria-labelledby="t-como">
          <h2 id="t-como">¿Vienes a comprar o tienes un puesto?</h2>
          <ComoFunciona modo={modo} setModo={setModo} />
        </section>

        <section className={cn(s.w, s.sec)} id="puestos" aria-labelledby="t-puestos">
          <h2 id="t-puestos">Date una vuelta por los puestos.</h2>
          <p className={s.sub}>Cada puesto tiene su página con productos, horario y reseñas de pedidos entregados.</p>
          <Pasillo />
          <Link className={s.todos} to="/tienda">
            Ver todos los puestos
            <Flecha />
          </Link>
        </section>

        <section className={s.reglas} aria-labelledby="t-reglas">
          <div className={s.w}>
            <div>
              <h2 id="t-reglas">Reglas claras para los dos lados del mostrador.</h2>
              <p className={s.sub}>Lo que la app hace hoy, sin letra menuda.</p>
            </div>
            <dl>
              <div className={s.regla}>
                <dt>Vendedores verificados</dt>
                <dd>Antes de publicar, un administrador revisa la identidad de cada vendedor.</dd>
              </div>
              <div className={s.regla}>
                <dt>Reseñas de quien recibió</dt>
                <dd>Solo puede reseñar un puesto quien recibió su pedido.</dd>
              </div>
              <div className={s.regla}>
                <dt>Cupones de cada puesto</dt>
                <dd>Cada vendedor crea sus propios descuentos y tú los aplicas al pagar.</dd>
              </div>
              <div className={s.regla}>
                <dt>Efectivo, confirmado por el puesto</dt>
                <dd>
                  Si pagas en efectivo, el vendedor confirma que recibió el cobro. Los pagos en línea están en modo de
                  prueba.
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </main>

      <footer className={s.osc}>
        <div className={s.w}>
          <h2>
            ¿Qué te hace falta <span>del mercado?</span>
          </h2>
          <div className={s.acts}>
            <Link className={cn(s.btn, s.coral)} to="/tienda">
              Ir a la tienda
              <Flecha />
            </Link>
            <Link className={cn(s.btn, s.borde)} to="/registro?rol=vendedor">
              Abrir mi puesto
            </Link>
          </div>
          <div className={s.pie}>
            <Logo />
            <span>Riohacha, La Guajira · Proyecto académico · © 2026</span>
            <nav aria-label="Pie de página">
              <Link to="/login">Ingresar</Link>
              <Link to="/creditos-fotos">Créditos de fotos</Link>
            </nav>
          </div>
        </div>
      </footer>
      <div className={s.barra}>
        <Link className={cn(s.btn, s.borde, s.sm)} to="/login">
          Ingresar
        </Link>
        <Link className={cn(s.btn, s.coral, s.sm)} to="/tienda">
          Ir a la tienda
        </Link>
      </div>
    </div>
  );
}
