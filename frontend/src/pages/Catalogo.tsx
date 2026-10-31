import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, PackageSearch, Search, SlidersHorizontal, X } from 'lucide-react';
import type { FiltrosProducto } from '../api/catalog';
import { ProductoCard } from '../components/ProductoCard';
import { EsqueletoGrid, EstadoError, EstadoVacio } from '../components/ui/Estado';
import { Paginacion } from '../components/ui/Paginacion';
import { Modal } from '../components/ui/Modal';
import { GRID_PRODUCTOS } from '../lib/estilos';
import { consultaCatalogo, consultaCategorias, filtrosCatalogoDe, TAMANO_CATALOGO as TAMANO } from './inicio/consultas';

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

  const filtros = useMemo<FiltrosProducto>(() => filtrosCatalogoDe(params), [params]);

  // Las definiciones viven en ./inicio/consultas para que lib/precarga use las mismas claves.
  const categorias = useQuery(consultaCategorias);
  const productos = useQuery({ ...consultaCatalogo(filtros), placeholderData: (anterior) => anterior });

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

  const nombreDe = (id: number) => categorias.data?.find((c) => c.id === id)?.nombre ?? null;
  const hayFiltros = Boolean(params.get('q') || categoria || ordering || params.get('precio_min') || params.get('precio_max'));
  const categoriaActual = categorias.data?.find((item) => String(item.id) === categoria)?.nombre;

  const panelFiltros = (
    <div className="space-y-6">
      <form onSubmit={buscar}>
        <label className="label" htmlFor="buscar-catalogo">Buscar</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
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
            className={`flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm md:min-h-[38px] ${
              !categoria
                ? 'bg-brand-50 font-bold text-brand-700 dark:bg-slate-800 dark:text-brand-200'
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
              className={`flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm md:min-h-[38px] ${
                categoria === String(item.id)
                  ? 'bg-brand-50 font-bold text-brand-700 dark:bg-slate-800 dark:text-brand-200'
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
        <button type="button" onClick={limpiar} className="btn-ghost w-full text-rose-600 dark:text-rose-400">
          <X className="h-4 w-4" /> Limpiar filtros
        </button>
      )}
    </div>
  );

  const chips: { clave: string; texto: string; quitar: () => void }[] = [];
  if (params.get('q')) chips.push({ clave: 'q', texto: `Búsqueda: ${params.get('q')}`, quitar: () => actualizar({ q: null }) });
  if (categoria && categoriaActual) chips.push({ clave: 'categoria', texto: categoriaActual, quitar: () => actualizar({ categoria: null }) });
  if (params.get('precio_min')) chips.push({ clave: 'min', texto: `Desde $ ${params.get('precio_min')}`, quitar: () => actualizar({ precio_min: null }) });
  if (params.get('precio_max')) chips.push({ clave: 'max', texto: `Hasta $ ${params.get('precio_max')}`, quitar: () => actualizar({ precio_max: null }) });

  return (
    <div className="mx-auto max-w-[1240px] px-3 py-4 sm:px-5 md:py-5">
      <nav aria-label="Ruta" className="mb-3 text-[13px] text-slate-500 dark:text-slate-400">
        <Link to="/tienda" className="link">Inicio</Link> › {categoriaActual ?? 'Catálogo'}
      </nav>
      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="card hidden h-fit p-4 lg:block" aria-label="Filtros">
          <p className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            <Filter className="h-4 w-4" aria-hidden="true" /> Filtros
          </p>
          {panelFiltros}
        </aside>

        <Modal abierto={filtrosMoviles} onCerrar={() => setFiltrosMoviles(false)} titulo="Filtros">
          {panelFiltros}
        </Modal>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-[22px] font-extrabold tracking-tight">{categoriaActual ?? 'Catálogo'}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
                {productos.data ? `${productos.data.count} ${productos.data.count === 1 ? 'resultado' : 'resultados'}` : 'Buscando…'}
              </p>
            </div>
            <button type="button" className="btn-secondary lg:hidden" onClick={() => setFiltrosMoviles(true)}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filtros{chips.length > 0 && ` (${chips.length})`}
            </button>
          </div>

          {chips.length > 0 && (
            <ul className="mb-3 flex flex-wrap gap-2" aria-label="Filtros activos">
              {chips.map((chip) => (
                <li key={chip.clave}>
                  <button
                    type="button"
                    onClick={chip.quitar}
                    aria-label={`Quitar filtro: ${chip.texto}`}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-brand-600 bg-brand-50 px-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-300 dark:bg-slate-800 dark:text-brand-200"
                  >
                    {chip.texto} <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={limpiar} className="min-h-[36px] px-2 text-sm font-semibold text-slate-600 underline-offset-4 hover:underline dark:text-slate-300">
                  Limpiar todo
                </button>
              </li>
            </ul>
          )}

          {productos.isLoading && <EsqueletoGrid cantidad={TAMANO} />}
          {productos.isError && <EstadoError mensaje="No pudimos cargar el catálogo." onReintentar={() => void productos.refetch()} />}
          {productos.data && productos.data.results.length === 0 && (
            <EstadoVacio
              titulo="No encontramos productos"
              descripcion="Prueba con otra búsqueda o quita algunos filtros."
              icono={<PackageSearch className="h-7 w-7" />}
              accion={hayFiltros ? <button type="button" className="btn-secondary" onClick={limpiar}>Limpiar filtros</button> : <Link to="/tienda" className="btn-primary">Volver al inicio</Link>}
            />
          )}
          {productos.data && productos.data.results.length > 0 && (
            <>
              <div className={GRID_PRODUCTOS}>
                {productos.data.results.map((producto, posicion) => (
                  <ProductoCard
                    key={producto.id}
                    producto={producto}
                    categoria={nombreDe(producto.id_categoria)}
                    prioridad={posicion < 2}
                    // 2 columnas en celular: unas 3 filas se ven sin desplazarse.
                    cargaInmediata={posicion < 6}
                  />
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
