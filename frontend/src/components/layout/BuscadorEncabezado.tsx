import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, Store } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarProductos, listarPuestos } from '../../api/catalog';
import { formatearMoneda } from '../../lib/format';
import { urlAbsoluta } from '../../lib/utils';
import type { Categoria } from '../../lib/types';
import { Imagen } from '../Imagen';

const MINIMO = 2;
const ESPERA_MS = 250;

type Opcion = { id: string; tipo: 'producto' | 'puesto' | 'todo'; texto: string; apoyo?: string; imagen?: string | null; ir: string };

function useRetrasado(valor: string, ms: number) {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const temporizador = window.setTimeout(() => setRetrasado(valor), ms);
    return () => window.clearTimeout(temporizador);
  }, [valor, ms]);
  return retrasado;
}

/** Resalta la parte del texto que coincide con lo escrito. */
function Resaltado({ texto, buscado }: { texto: string; buscado: string }) {
  const posicion = texto.toLowerCase().indexOf(buscado.toLowerCase());
  if (posicion < 0 || !buscado) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, posicion)}
      <b className="font-extrabold text-brand-600">{texto.slice(posicion, posicion + buscado.length)}</b>
      {texto.slice(posicion + buscado.length)}
    </>
  );
}

/**
 * Buscador del encabezado con sugerencias de productos y puestos mientras se escribe.
 * Patrón «combobox»: flechas para moverse, Enter para abrir lo marcado (o buscar si no hay nada marcado)
 * y Escape para cerrar. Sin sugerencias disponibles, funciona como un buscador normal.
 */
export function BuscadorEncabezado({ categorias }: { categorias: Categoria[] | undefined }) {
  const navigate = useNavigate();
  const idLista = useId();
  const contenedor = useRef<HTMLDivElement>(null);
  const [texto, setTexto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(-1);

  const buscado = texto.trim();
  const consulta = useRetrasado(buscado, ESPERA_MS);
  const activo = abierto && consulta.length >= MINIMO && consulta === buscado;

  const productos = useQuery({
    queryKey: ['sugerencias', 'productos', consulta],
    queryFn: () => listarProductos({ q: consulta, page_size: 5 }),
    enabled: activo,
    staleTime: 60_000,
  });
  const puestos = useQuery({
    queryKey: ['sugerencias', 'puestos', consulta],
    queryFn: () => listarPuestos({ q: consulta, page_size: 3 }),
    enabled: activo,
    staleTime: 60_000,
  });

  const rutaDeBusqueda = () => {
    const params = new URLSearchParams();
    if (buscado) params.set('q', buscado);
    if (categoria) params.set('categoria', categoria);
    const resto = params.toString();
    return resto ? `/catalogo?${resto}` : '/catalogo';
  };

  const opciones = useMemo<Opcion[]>(() => {
    if (!activo) return [];
    const lista: Opcion[] = [];
    for (const p of productos.data?.results ?? []) {
      const foto = p.imagenes?.[0];
      lista.push({
        id: `p-${p.id}`,
        tipo: 'producto',
        texto: p.nombre,
        apoyo: formatearMoneda(p.precio),
        imagen: foto?.miniatura || foto?.url || null,
        ir: `/productos/${p.id}`,
      });
    }
    for (const p of puestos.data?.results ?? []) {
      lista.push({ id: `s-${p.id}`, tipo: 'puesto', texto: p.nombre, apoyo: p.direccion ?? 'Puesto', ir: `/puestos/${p.id}` });
    }
    lista.push({ id: 'todo', tipo: 'todo', texto: `Ver todos los resultados para «${buscado}»`, ir: rutaDeBusqueda() });
    return lista;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, productos.data, puestos.data, buscado, categoria]);

  const cargando = activo && (productos.isFetching || puestos.isFetching) && opciones.length <= 1;
  const mostrar = activo && (opciones.length > 0 || cargando);

  // Se cierra al hacer clic o dar foco fuera del buscador.
  useEffect(() => {
    const fuera = (evento: Event) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('focusin', fuera);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('focusin', fuera);
    };
  }, []);

  const abrir = (ruta: string) => {
    setAbierto(false);
    setActiva(-1);
    navigate(ruta);
  };

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const elegida = activa >= 0 ? opciones[activa] : undefined;
    abrir(elegida ? elegida.ir : rutaDeBusqueda());
  };

  const alTeclear = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'Escape') {
      setAbierto(false);
      setActiva(-1);
    } else if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      if (!mostrar || opciones.length === 0) return;
      evento.preventDefault();
      const paso = evento.key === 'ArrowDown' ? 1 : -1;
      setActiva((actual) => ((actual + 1 + paso + opciones.length + 1) % (opciones.length + 1)) - 1);
    }
  };

  const hayProductos = opciones.some((o) => o.tipo === 'producto');
  const hayPuestos = opciones.some((o) => o.tipo === 'puesto');

  return (
    <div ref={contenedor} className="relative order-3 col-span-2 md:order-none md:col-span-1">
      <form
        onSubmit={enviar}
        role="search"
        className="flex overflow-hidden rounded-lg bg-white shadow-[0_2px_6px_rgba(0,40,46,.28)] transition-shadow focus-within:shadow-[0_0_0_3px_#FFD166]"
      >
        <label className="flex-1">
          <span className="sr-only">Buscar productos</span>
          <input
            type="search"
            role="combobox"
            aria-expanded={mostrar}
            aria-controls={idLista}
            aria-autocomplete="list"
            aria-activedescendant={activa >= 0 && opciones[activa] ? `${idLista}-${opciones[activa].id}` : undefined}
            autoComplete="off"
            value={texto}
            onChange={(evento) => {
              setTexto(evento.target.value);
              setAbierto(true);
              setActiva(-1);
            }}
            onFocus={() => setAbierto(true)}
            onKeyDown={alTeclear}
            placeholder="Buscar productos y puestos"
            className="h-[46px] w-full min-w-0 border-0 bg-transparent px-4 text-base text-tinta outline-none placeholder:text-slate-500 md:h-[48px]"
          />
        </label>
        <label className="hidden md:block">
          <span className="sr-only">Categoría de búsqueda</span>
          <select
            value={categoria}
            onChange={(evento) => setCategoria(evento.target.value)}
            className="h-full max-w-[190px] cursor-pointer border-0 border-l border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none"
          >
            <option value="">Todo</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          aria-label="Buscar"
          className="grid w-14 place-items-center bg-gradient-to-b from-accion to-[#BB3515] text-white transition-colors hover:from-accion-hover hover:to-[#A02D10]"
        >
          <Search className="h-[22px] w-[22px]" strokeWidth={2.4} aria-hidden="true" />
        </button>
      </form>

      {mostrar && (
        <div className="absolute inset-x-0 top-full z-50 mt-1.5 animate-fadezoom overflow-hidden rounded-xl border border-slate-200 bg-white text-tinta shadow-menu dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          <ul id={idLista} role="listbox" aria-label="Sugerencias de búsqueda" className="max-h-[70vh] overflow-y-auto py-1.5">
            {cargando && (
              <li role="presentation" className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Buscando…
              </li>
            )}
            {opciones.map((opcion, indice) => (
              <li key={opcion.id} role="presentation">
                {opcion.tipo === 'producto' && indice === 0 && hayProductos && <Titulo>Productos</Titulo>}
                {opcion.tipo === 'puesto' && opciones[indice - 1]?.tipo !== 'puesto' && hayPuestos && <Titulo>Puestos</Titulo>}
                <div
                  id={`${idLista}-${opcion.id}`}
                  role="option"
                  aria-selected={indice === activa}
                  onMouseEnter={() => setActiva(indice)}
                  onClick={() => abrir(opcion.ir)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2 ${
                    indice === activa ? 'bg-brand-50 dark:bg-slate-800' : ''
                  } ${opcion.tipo === 'todo' ? 'mt-1 border-t border-slate-100 py-3 text-sm font-bold text-brand-600 dark:border-slate-800 dark:text-brand-300' : ''}`}
                >
                  {opcion.tipo === 'producto' && (
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                      <Imagen
                        src={urlAbsoluta(opcion.imagen)}
                        fallbackNombre={opcion.texto}
                        contenedorClassName="h-full w-full"
                        width={40}
                        height={40}
                        alt=""
                      />
                    </span>
                  )}
                  {opcion.tipo === 'puesto' && (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-600 dark:bg-slate-800 dark:text-brand-200">
                      <Store className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                  {opcion.tipo === 'todo' && <Search className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">
                      {opcion.tipo === 'todo' ? opcion.texto : <Resaltado texto={opcion.texto} buscado={buscado} />}
                    </span>
                    {opcion.apoyo && <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{opcion.apoyo}</span>}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Titulo({ children }: { children: string }) {
  return <p className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{children}</p>;
}
