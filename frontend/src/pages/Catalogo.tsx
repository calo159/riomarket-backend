import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { listarCategorias, listarProductos, type FiltrosProducto } from '../api/catalog';
import { ProductoCard } from '../components/ProductoCard';
import { EsqueletoGrid, EstadoError, EstadoVacio } from '../components/ui/Estado';
import { Paginacion } from '../components/ui/Paginacion';
import { clasesDeCategoria } from '../lib/categoria';
import { cn } from '../lib/utils';
import { claves } from '../lib/queryKeys';

const TAMANO = 20;

export function Catalogo() {
  const [params, setParams] = useSearchParams();
  const [texto, setTexto] = useState(params.get('q') ?? '');
  const [precioMin, setPrecioMin] = useState(params.get('precio_min') ?? '');
  const [precioMax, setPrecioMax] = useState(params.get('precio_max') ?? '');
  const [preciosAbiertos, setPreciosAbiertos] = useState(Boolean(params.get('precio_min') || params.get('precio_max')));

  const pagina = Number(params.get('page') ?? 1) || 1;
  const categoria = params.get('categoria') ?? '';
  const ordering = params.get('ordering') ?? '';

  useEffect(() => {
    document.title = 'Catálogo · RioMarket';
  }, []);

  useEffect(() => {
    setTexto(params.get('q') ?? '');
    setPrecioMin(params.get('precio_min') ?? '');
    setPrecioMax(params.get('precio_max') ?? '');
  }, [params]);

  const filtros = useMemo<FiltrosProducto>(
    () => ({
      page: pagina,
      page_size: TAMANO,
      q: params.get('q') || undefined,
      categoria: params.get('categoria') || undefined,
      ordering: params.get('ordering') || undefined,
      precio_min: params.get('precio_min') || undefined,
      precio_max: params.get('precio_max') || undefined,
    }),
    [params, pagina],
  );

  const categorias = useQuery({ queryKey: claves.categorias, queryFn: listarCategorias, staleTime: 5 * 60_000 });
  const productos = useQuery({
    queryKey: claves.productos.catalogo(filtros),
    queryFn: () => listarProductos(filtros),
    placeholderData: (anterior) => anterior,
  });

  const actualizar = (cambios: Record<string, string | null>, reiniciarPagina = true) => {
    const siguientes = new URLSearchParams(params);
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === null || valor === '') siguientes.delete(clave);
      else siguientes.set(clave, valor);
    }
    if (reiniciarPagina) siguientes.delete('page');
    setParams(siguientes, { replace: true });
  };

  const buscar = (evento: FormEvent) => {
    evento.preventDefault();
    actualizar({ q: texto.trim() || null });
  };

  const aplicarPrecios = (evento: FormEvent) => {
    evento.preventDefault();
    actualizar({ precio_min: precioMin || null, precio_max: precioMax || null });
  };

  const limpiar = () => {
    setTexto('');
    setPrecioMin('');
    setPrecioMax('');
    setParams(new URLSearchParams(), { replace: true });
  };

  const hayFiltros = Boolean(params.get('q') || categoria || ordering || params.get('precio_min') || params.get('precio_max'));
  const categoriaActual = categorias.data?.find((item) => String(item.id) === categoria)?.nombre;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <h1 className="text-3xl sm:text-4xl">{categoriaActual ? categoriaActual : 'Catálogo'}</h1>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
        <form onSubmit={buscar} className="relative flex-1" role="search">
          <label className="sr-only" htmlFor="buscar-catalogo">Buscar</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
          <input
            id="buscar-catalogo"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            className="input pl-9"
            placeholder="Nombre o descripción"
          />
        </form>
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="orden">Ordenar por</label>
          <select
            id="orden"
            value={ordering}
            onChange={(evento) => actualizar({ ordering: evento.target.value || null })}
            className="input md:w-44"
          >
            <option value="">Relevancia</option>
            <option value="-id">Más recientes</option>
            <option value="precio">Menor precio</option>
            <option value="-precio">Mayor precio</option>
            <option value="nombre">Nombre A–Z</option>
            <option value="-nombre">Nombre Z–A</option>
          </select>
          <button
            type="button"
            className="btn-secondary shrink-0"
            onClick={() => setPreciosAbiertos((valor) => !valor)}
            aria-expanded={preciosAbiertos}
            aria-controls="filtro-precio"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Precio
          </button>
        </div>
      </div>

      {preciosAbiertos && (
        <form id="filtro-precio" onSubmit={aplicarPrecios} className="mt-3 flex flex-wrap items-end gap-2">
          <div className="w-28">
            <label className="label" htmlFor="precio-min">Mínimo</label>
            <input id="precio-min" type="number" min={0} value={precioMin} onChange={(evento) => setPrecioMin(evento.target.value)} className="input" />
          </div>
          <div className="w-28">
            <label className="label" htmlFor="precio-max">Máximo</label>
            <input id="precio-max" type="number" min={0} value={precioMax} onChange={(evento) => setPrecioMax(evento.target.value)} className="input" />
          </div>
          <button type="submit" className="btn-secondary">Aplicar</button>
        </form>
      )}

      <div className="-mx-4 mt-3 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Categorías">
        <div className="flex gap-2 pb-1 sm:flex-wrap">
          <button
            type="button"
            onClick={() => actualizar({ categoria: null })}
            aria-pressed={!categoria}
            className={cn(
              'btn min-h-9 shrink-0 border-2 px-3 py-1',
              !categoria
                ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950'
                : 'border-slate-950 text-slate-950 hover:bg-slate-100 dark:border-slate-300 dark:text-slate-100 dark:hover:bg-slate-800',
            )}
          >
            Todas
          </button>
          {categorias.data?.map((item) => {
            const clases = clasesDeCategoria(item.id);
            const activa = categoria === String(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => actualizar({ categoria: String(item.id) })}
                aria-pressed={activa}
                className={cn('btn min-h-9 shrink-0 border-2 px-3 py-1', activa ? clases.chipActivo : clases.chip)}
              >
                {item.nombre}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4 mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700 dark:text-slate-300">
        <p className="tnum">
          {productos.data ? `${productos.data.count} ${productos.data.count === 1 ? 'producto' : 'productos'}` : 'Buscando…'}
          {params.get('q') && (
            <>
              {' '}para <strong>{params.get('q')}</strong>
              <button type="button" onClick={() => actualizar({ q: null })} className="ml-1 rounded p-1.5 align-middle hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Quitar búsqueda">
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </p>
        {hayFiltros && (
          <button type="button" onClick={limpiar} className="link">
            Limpiar filtros
          </button>
        )}
      </div>

      {productos.isLoading && <EsqueletoGrid cantidad={TAMANO} />}
      {productos.isError && <EstadoError mensaje="No pudimos cargar el catálogo." onReintentar={() => void productos.refetch()} />}
      {productos.data && productos.data.results.length === 0 && (
        <EstadoVacio
          titulo="No encontramos productos"
          descripcion="Prueba con otra palabra o quita algún filtro."
          accion={hayFiltros ? <button type="button" className="btn-secondary" onClick={limpiar}>Limpiar filtros</button> : <Link to="/" className="btn-primary">Volver al inicio</Link>}
        />
      )}
      {productos.data && productos.data.results.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {productos.data.results.map((producto) => (
              <ProductoCard key={producto.id} producto={producto} />
            ))}
          </div>
          <Paginacion
            pagina={pagina}
            total={productos.data.count}
            tamano={TAMANO}
            cargando={productos.isFetching}
            onCambiar={(nueva) => actualizar({ page: String(nueva) }, false)}
          />
        </>
      )}
    </div>
  );
}
