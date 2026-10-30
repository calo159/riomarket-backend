import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, RotateCcw, Search, ShieldOff, Star } from 'lucide-react';
import { listarPuestos } from '../../api/catalog';
import { moderarPuesto } from '../../api/admin';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { Paginacion } from '../../components/ui/Paginacion';
import { Modal } from '../../components/ui/Modal';
import { Campo, ErrorCampo } from '../../components/ui/Campos';
import { useToast } from '../../components/ui/Toast';
import { mensajeDeError } from '../../lib/errors';
import type { Puesto } from '../../lib/types';
import { formatearCalificacion } from '../../lib/format';
import { claves } from '../../lib/queryKeys';

const TAMANO = 15;

export function PuestosAdmin() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [params] = useSearchParams();
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState(params.get('estado') ?? '');
  const [objetivo, setObjetivo] = useState<Puesto | null>(null);
  const [destino, setDestino] = useState<'activo' | 'suspendido'>('suspendido');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Puestos · Administración · RioMarket';
  }, []);

  const puestos = useQuery({
    queryKey: claves.puestos.admin(pagina, busqueda, estado),
    queryFn: () =>
      listarPuestos({
        page: pagina,
        page_size: TAMANO,
        q: busqueda.trim() || undefined,
        estado: estado || undefined,
      }),
    placeholderData: (anterior) => anterior,
  });

  const moderar = useMutation({
    mutationFn: ({ id, nuevo }: { id: number; nuevo: 'activo' | 'suspendido' }) =>
      moderarPuesto(id, { estado: nuevo, motivo: motivo.trim() }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: claves.puestos.todos });
      void queryClient.invalidateQueries({ queryKey: claves.adminResumen });
      setObjetivo(null);
      setMotivo('');
      setError('');
      toast.exito(variables.nuevo === 'suspendido' ? 'Puesto suspendido.' : 'Puesto reactivado.');
    },
    onError: (fallo) => setError(mensajeDeError(fallo)),
  });

  const abrir = (puesto: Puesto, nuevo: 'activo' | 'suspendido') => {
    setObjetivo(puesto);
    setDestino(nuevo);
    setMotivo('');
    setError('');
  };

  const enviar = () => {
    if (!objetivo) return;
    if (motivo.trim().length < 5) {
      setError('Indica un motivo de al menos 5 caracteres.');
      return;
    }
    moderar.mutate({ id: objetivo.id, nuevo: destino });
  };

  return (
    <div>
      <EncabezadoPagina
        titulo="Puestos"
        descripcion="Supervisa y modera los puestos del marketplace. Suspender un puesto no cancela sus pedidos en curso."
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
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {puestos.data.results.map((puesto) => {
                  const categorias = puesto.categorias as { id: number; nombre: string }[];
                  const suspendido = puesto.estado === 'suspendido';
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
                        <span className={`badge ${suspendido ? 'bg-rojo-100 text-rojo-800 dark:bg-rojo-950 dark:text-rojo-300' : puesto.estado === 'activo' ? 'bg-verde-100 text-verde-800 dark:bg-verde-950 dark:text-verde-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {puesto.estado}
                        </span>
                      </td>
                      <td className="p-3">
                        {puesto.ofrece_domicilio ? (
                          <span className="inline-flex items-center gap-1 text-verde-700 dark:text-verde-400">
                            <Bike className="h-3.5 w-3.5" /> Sí
                          </span>
                        ) : (
                          'No'
                        )}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-sol-500" />
                          {formatearCalificacion(puesto.calificacion_promedio, '—')}
                          <span className="text-xs text-slate-400">({puesto.cantidad_resenas})</span>
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {suspendido ? (
                          <button type="button" className="btn-primary py-1.5 text-xs" onClick={() => abrir(puesto, 'activo')}>
                            <RotateCcw className="h-3.5 w-3.5" /> Reactivar
                          </button>
                        ) : (
                          <button type="button" className="btn-ghost py-1.5 text-xs text-rojo-600 dark:text-rojo-400" onClick={() => abrir(puesto, 'suspendido')}>
                            <ShieldOff className="h-3.5 w-3.5" /> Suspender
                          </button>
                        )}
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

      <Modal
        abierto={Boolean(objetivo)}
        onCerrar={() => setObjetivo(null)}
        titulo={destino === 'suspendido' ? `Suspender ${objetivo?.nombre ?? ''}` : `Reactivar ${objetivo?.nombre ?? ''}`}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {destino === 'suspendido'
            ? 'El puesto saldrá del catálogo y no recibirá pedidos nuevos. Los pedidos en curso continúan su flujo normal.'
            : 'El puesto volverá a mostrarse en el catálogo y podrá recibir pedidos.'}
        </p>
        <Campo etiqueta="Motivo (obligatorio)" htmlFor="motivo-puesto" className="mt-3">
          <textarea id="motivo-puesto" rows={3} className="input" value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Explica la decisión (mínimo 5 caracteres)." />
        </Campo>
        <ErrorCampo mensaje={error} />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setObjetivo(null)} disabled={moderar.isPending}>Cancelar</button>
          <button type="button" className={destino === 'suspendido' ? 'btn-danger' : 'btn-primary'} onClick={enviar} disabled={moderar.isPending}>
            {moderar.isPending ? 'Guardando…' : destino === 'suspendido' ? 'Suspender' : 'Reactivar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
