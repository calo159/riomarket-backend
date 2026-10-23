import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bike, Search, Star, Store } from 'lucide-react';
import { listarPuestos } from '../../api/catalog';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { Paginacion } from '../../components/ui/Paginacion';

const TAMANO = 15;

export function PuestosAdmin() {
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('');

  useEffect(() => {
    document.title = 'Puestos · Administración · RioMarket';
  }, []);

  const puestos = useQuery({
    queryKey: ['puestos', 'admin', pagina, busqueda, estado],
    queryFn: () =>
      listarPuestos({
        page: pagina,
        page_size: TAMANO,
        q: busqueda.trim() || undefined,
        estado: estado || undefined,
      }),
    placeholderData: (anterior) => anterior,
  });

  return (
    <div>
      <EncabezadoPagina
        titulo="Puestos"
        descripcion="Directorio global de puestos. La API actual no permite moderar su estado desde el frontend."
        acciones={
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-64 pl-9"
                placeholder="Buscar puesto"
                value={busqueda}
                onChange={(evento) => {
                  setBusqueda(evento.target.value);
                  setPagina(1);
                }}
                aria-label="Buscar puesto"
              />
            </div>
            <select
              className="input w-auto"
              value={estado}
              onChange={(evento) => {
                setEstado(evento.target.value);
                setPagina(1);
              }}
              aria-label="Filtrar por estado"
            >
              <option value="">Todos</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
              <option value="suspendido">Suspendidos</option>
            </select>
          </div>
        }
      />

      {puestos.isLoading && <CargandoBloque mensaje="Cargando puestos…" />}
      {puestos.isError && <EstadoError mensaje="No pudimos cargar los puestos." onReintentar={() => void puestos.refetch()} />}
      {puestos.data && puestos.data.results.length === 0 && (
        <EstadoVacio
          titulo="Sin puestos"
          descripcion="No hay puestos que coincidan con los filtros."
          icono={<Store className="h-9 w-9" />}
        />
      )}
      {puestos.data && puestos.data.results.length > 0 && (
        <>
          <div className="overflow-x-auto card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="p-3">Puesto</th>
                  <th className="p-3">Vendedor</th>
                  <th className="p-3">Categorías</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Domicilio</th>
                  <th className="p-3">Calificación</th>
                </tr>
              </thead>
              <tbody>
                {puestos.data.results.map((puesto) => {
                  const categorias = puesto.categorias as { id: number; nombre: string }[];
                  return (
                    <tr key={puesto.id} className="border-b last:border-0">
                      <td className="p-3">
                        <Link to={`/puestos/${puesto.id}`} className="font-semibold hover:text-brand-700 dark:hover:text-brand-300">
                          {puesto.nombre}
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{puesto.direccion}</p>
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">#{puesto.id_vendedor}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {categorias.length === 0 && <span className="text-slate-400">Sin categorías</span>}
                          {categorias.map((categoria) => (
                            <span key={categoria.id} className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {categoria.nombre}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {puesto.estado}
                        </span>
                      </td>
                      <td className="p-3">
                        {puesto.ofrece_domicilio ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                            <Bike className="h-3.5 w-3.5" /> Sí
                          </span>
                        ) : (
                          'No'
                        )}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500" />
                          {puesto.calificacion_promedio != null ? Number(puesto.calificacion_promedio).toFixed(1) : '—'}
                          <span className="text-xs text-slate-400">({puesto.cantidad_resenas})</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Paginacion pagina={pagina} total={puestos.data.count} tamano={TAMANO} onCambiar={setPagina} cargando={puestos.isFetching} />
        </>
      )}
    </div>
  );
}
