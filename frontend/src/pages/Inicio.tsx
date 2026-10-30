import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  MapPin,
  PackageCheck,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import { listarCategorias, listarProductos, listarPuestos } from '../api/catalog';
import { ProductoCard } from '../components/ProductoCard';
import { PuestoCard } from '../components/PuestoCard';
import { EsqueletoGrid, EstadoError } from '../components/ui/Estado';
import { useSession } from '../auth/SessionProvider';
import { inicioPorRol } from '../auth/permisos';
import { claves } from '../lib/queryKeys';

export function Inicio() {
  const [busqueda, setBusqueda] = useState('');
  const navigate = useNavigate();
  const { autenticado, rol } = useSession();

  const categorias = useQuery({ queryKey: claves.categorias, queryFn: listarCategorias, staleTime: 5 * 60_000 });
  const productos = useQuery({
    queryKey: claves.productos.inicio,
    queryFn: () => listarProductos({ page_size: 8, ordering: '-id' }),
  });
  const puestos = useQuery({
    queryKey: claves.puestos.inicio,
    queryFn: () => listarPuestos({ page_size: 6, ordering: 'nombre' }),
  });

  const buscar = (evento: FormEvent) => {
    evento.preventDefault();
    navigate(busqueda.trim() ? `/catalogo?q=${encodeURIComponent(busqueda.trim())}` : '/catalogo');
  };

  return (
    <div>
      <section className="relative overflow-hidden border-b bg-brand-800 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_45%)]" />
        <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-sand-400/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div>
            <span className="badge bg-white/15 text-white backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Mercado local de Riohacha
            </span>
            <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
              Lo que necesitas, <span className="text-sand-300">de tus vecinos</span>.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-brand-100">
              Frutas frescas, comidas caseras y artesanías de vendedores verificados. Pide a domicilio o recoge
              en el puesto.
            </p>
            <form onSubmit={buscar} className="mt-8 flex max-w-xl gap-2" role="search">
              <label className="relative flex-1">
                <span className="sr-only">Buscar en el catálogo</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                  placeholder="¿Qué estás buscando hoy?"
                  className="input h-12 border-transparent pl-10 text-slate-900"
                />
              </label>
              <button type="submit" className="btn bg-sand-300 px-5 text-sand-950 hover:bg-sand-200">
                Buscar
              </button>
            </form>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-100">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4" /> Vendedores verificados</span>
              <span className="inline-flex items-center gap-1.5"><Bike className="h-4 w-4" /> Domicilio local</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Pago seguro</span>
            </div>
          </div>

          <div className="hidden items-center justify-center lg:flex">
            <div className="grid w-full max-w-sm gap-3">
              <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                <Store className="h-6 w-6 text-sand-300" />
                <p className="mt-3 text-2xl font-bold">Puestos de barrio</p>
                <p className="text-sm text-brand-100">Compra directo, sin intermediarios.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                  <MapPin className="h-6 w-6 text-sand-300" />
                  <p className="mt-3 text-lg font-bold">Local</p>
                  <p className="text-xs text-brand-100">Riohacha</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                  <PackageCheck className="h-6 w-6 text-sand-300" />
                  <p className="mt-3 text-lg font-bold">Fresco</p>
                  <p className="text-xs text-brand-100">Del día</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Explora por categoría</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Encuentra rápido lo que buscas.</p>
          </div>
          <Link to="/catalogo" className="link hidden text-sm sm:block">
            Ver todo
          </Link>
        </div>
        {categorias.isLoading && <EsqueletoGrid cantidad={6} />}
        {categorias.isError && <EstadoError mensaje="No pudimos cargar las categorías." onReintentar={() => void categorias.refetch()} />}
        {categorias.data && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categorias.data.slice(0, 12).map((categoria) => (
              <Link
                key={categoria.id}
                to={`/catalogo?categoria=${categoria.id}`}
                className="card flex flex-col items-center gap-2 px-3 py-5 text-center transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  <Store className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold leading-tight">{categoria.nombre}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Recién llegados</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Productos publicados por vendedores locales.</p>
          </div>
          <Link to="/catalogo?ordering=-id" className="link hidden text-sm sm:block">
            Ver más
          </Link>
        </div>
        {productos.isLoading && <EsqueletoGrid />}
        {productos.isError && <EstadoError mensaje="No pudimos cargar los productos." onReintentar={() => void productos.refetch()} />}
        {productos.data && productos.data.results.length === 0 && (
          <div className="card px-6 py-10 text-center text-slate-500 dark:text-slate-400">
            Todavía no hay productos publicados.
          </div>
        )}
        {productos.data && productos.data.results.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {productos.data.results.map((producto) => (
              <ProductoCard key={producto.id} producto={producto} />
            ))}
          </div>
        )}
      </section>

      <section className="border-y bg-white/60 dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Puestos cerca de ti</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Conoce a quienes hacen mercado en tu ciudad.</p>
            </div>
            <Link to="/catalogo" className="link hidden text-sm sm:block">
              Ver más
            </Link>
          </div>
          {puestos.isLoading && <EsqueletoGrid cantidad={3} />}
          {puestos.isError && <EstadoError mensaje="No pudimos cargar los puestos." onReintentar={() => void puestos.refetch()} />}
          {puestos.data && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {puestos.data.results.map((puesto) => (
                <PuestoCard key={puesto.id} puesto={puesto} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="card flex flex-col items-start justify-between gap-6 overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-white sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold">¿Tienes un negocio en Riohacha?</h2>
            <p className="mt-2 max-w-xl text-brand-100">
              Publica tus productos gratis. Verifica tu identidad y empieza a recibir pedidos hoy mismo.
            </p>
          </div>
          <Link
            to={autenticado ? inicioPorRol(rol) : '/registro?rol=vendedor'}
            className="btn shrink-0 bg-white text-brand-800 hover:bg-brand-50"
          >
            {autenticado ? 'Ir a mi panel' : 'Quiero vender'} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
