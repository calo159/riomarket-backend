import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, PackageSearch, Search, SlidersHorizontal, X } from 'lucide-react';
import { listarCategorias, listarProductos, type FiltrosProducto } from '../api/catalog';
import { ProductoCard } from '../components/ProductoCard';
import { EsqueletoGrid, EstadoError, EstadoVacio } from '../components/ui/Estado';
import { Paginacion } from '../components/ui/Paginacion';
import { EncabezadoPagina } from '../components/ui/Encabezado';
import { claves } from '../lib/queryKeys';

const TAMANO = 12;

export function Catalogo() {
  const [params, setParams] = useSearchParams();
  const [texto, setTexto] = useState(params.get('q') ?? '');
  const [precioMin, setPrecioMin] = useState(params.get('precio_min') ?? '');
  const [precioMax, setPrecioMax] = useState(params.get('precio_max') ?? '');
  const [filtrosMoviles, setFiltrosMoviles] = useState(false);

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
    setFiltrosMoviles(false);
  };

  const aplicarPrecios = (evento: FormEvent) => {
    evento.preventDefault();
    actualizar({ precio_min: precioMin || null, precio_max: precioMax || null });
    setFiltrosMoviles(false);
  };

  const limpiar = () => {
    setTexto('');
    setPrecioMin('');
    setPrecioMax('');
    setParams(new URLSearchParams(), { replace: true });
  };

  const hayFiltros = Boolean(params.get('q') || categoria || ordering || params.get('precio_min') || params.get('precio_max'));
  const categoriaActual = categorias.data?.find((item) => String(item.id) === categoria)?.nombre;

  const panelFiltros = (
    <div className="space-y-6">
      <form onSubmit={buscar}>
        <label className="label" htmlFor="buscar-catalogo">Buscar</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="buscar-catalogo"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            className="input pl-9"
            placeholder="Nombre o descripción"
          />
        </div>
      </form>

      <div>
        <p className="label">Categorías</p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => actualizar({ categoria: null })}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
              !categoria
                ? 'bg-brand-50 font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Todas
          </button>
          {categorias.data?.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => actualizar({ categoria: String(item.id) })}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                categoria === String(item.id)
                  ? 'bg-brand-50 font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-200'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item.nombre}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={aplicarPrecios}>
        <p className="label">Rango de precio</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            value={precioMin}
            onChange={(evento) => setPrecioMin(evento.target.value)}
            className="input"
            placeholder="Mín."
            aria-label="Precio mínimo"
          />
          <input
            type="number"
            min={0}
            value={precioMax}
            onChange={(evento) => setPrecioMax(evento.target.value)}
            className="input"
            placeholder="Máx."
            aria-label="Precio máximo"
          />
        </div>
        <button type="submit" className="btn-secondary mt-2 w-full">Aplicar</button>
      </form>

      <div>
        <label className="label" htmlFor="orden">Ordenar por</label>
        <select
          id="orden"
          value={ordering}
          onChange={(evento) => actualizar({ ordering: evento.target.value || null })}
          className="input"
        >
          <option value="">Relevancia</option>
          <option value="-id">Más recientes</option>
          <option value="precio">Menor precio</option>
          <option value="-precio">Mayor precio</option>
          <option value="nombre">Nombre A–Z</option>
          <option value="-nombre">Nombre Z–A</option>
        </select>
      </div>

      {hayFiltros && (
        <button type="button" onClick={limpiar} className="btn-ghost w-full text-rojo-600 dark:text-rojo-400">
          <X className="h-4 w-4" /> Limpiar filtros
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <EncabezadoPagina
        titulo={categoriaActual ? categoriaActual : 'Catálogo'}
        descripcion="Productos frescos y locales de vendedores de Riohacha."
        acciones={
          <button type="button" className="btn-secondary lg:hidden" onClick={() => setFiltrosMoviles(true)}>
            <SlidersHorizontal className="h-4 w-4" /> Filtros
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
        <aside className="card hidden h-fit p-5 lg:block">
          <p className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            <Filter className="h-4 w-4" /> Filtros
          </p>
          {panelFiltros}
        </aside>

        {filtrosMoviles && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" className="absolute inset-0 bg-slate-950/50" onClick={() => setFiltrosMoviles(false)} aria-label="Cerrar filtros" />
            <div className="absolute inset-y-0 right-0 w-80 max-w-[90vw] overflow-y-auto bg-white p-5 shadow-2xl dark:bg-slate-900">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-lg font-bold">Filtros</p>
                <button type="button" className="btn-ghost p-2" onClick={() => setFiltrosMoviles(false)} aria-label="Cerrar">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {panelFiltros}
            </div>
          </div>
        )}

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500 dark:text-slate-400">
            <p>
              {productos.data ? `${productos.data.count} ${productos.data.count === 1 ? 'producto' : 'productos'}` : 'Buscando…'}
            </p>
            {params.get('q') && (
              <p className="inline-flex items-center gap-1">
                Búsqueda: <strong className="text-slate-800 dark:text-slate-200">{params.get('q')}</strong>
                <button type="button" onClick={() => actualizar({ q: null })} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Quitar búsqueda">
                  <X className="h-3.5 w-3.5" />
                </button>
              </p>
            )}
          </div>

          {productos.isLoading && <EsqueletoGrid cantidad={TAMANO} />}
          {productos.isError && <EstadoError mensaje="No pudimos cargar el catálogo." onReintentar={() => void productos.refetch()} />}
          {productos.data && productos.data.results.length === 0 && (
            <EstadoVacio
              titulo="No encontramos productos"
              descripcion="Prueba con otra búsqueda o quita algunos filtros."
              icono={<PackageSearch className="h-8 w-8" />}
              accion={hayFiltros ? <button type="button" className="btn-secondary" onClick={limpiar}>Limpiar filtros</button> : <Link to="/" className="btn-primary">Volver al inicio</Link>}
            />
          )}
          {productos.data && productos.data.results.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
      </div>
    </div>
  );
}
