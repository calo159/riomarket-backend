import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Package, Search, Unlock } from 'lucide-react';
import { listarProductos, type FiltrosProducto } from '../../api/catalog';
import { moderarProducto } from '../../api/admin';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { Paginacion } from '../../components/ui/Paginacion';
import { Modal } from '../../components/ui/Modal';
import { Campo, ErrorCampo } from '../../components/ui/Campos';
import { useToast } from '../../components/ui/Toast';
import { formatearMoneda } from '../../lib/format';
import { mensajeDeError } from '../../lib/errors';
import type { Producto } from '../../lib/types';
import { claves } from '../../lib/queryKeys';

const TAMANO = 15;

export function ProductosAdmin() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('');
  const [objetivo, setObjetivo] = useState<Producto | null>(null);
  const [destino, setDestino] = useState<'activo' | 'bloqueado'>('bloqueado');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Productos · Administración · RioMarket';
  }, []);

  const filtros: FiltrosProducto = {
    page: pagina,
    page_size: TAMANO,
    q: busqueda.trim() || undefined,
    estado: estado || undefined,
  };

  const productos = useQuery({
    queryKey: claves.productos.admin(pagina, busqueda, estado),
    queryFn: () => listarProductos(filtros),
    placeholderData: (anterior) => anterior,
  });

  const moderar = useMutation({
    mutationFn: ({ id, nuevo }: { id: number; nuevo: 'activo' | 'bloqueado' }) =>
      moderarProducto(id, { estado: nuevo, motivo: motivo.trim() }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: claves.productos.todos });
      void queryClient.invalidateQueries({ queryKey: claves.adminResumen });
      setObjetivo(null);
      setMotivo('');
      setError('');
      toast.exito(variables.nuevo === 'bloqueado' ? 'Producto bloqueado.' : 'Producto desbloqueado.');
    },
    onError: (fallo) => setError(mensajeDeError(fallo)),
  });

  const abrir = (producto: Producto, nuevo: 'activo' | 'bloqueado') => {
    setObjetivo(producto);
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
        titulo="Productos"
        descripcion="Revisa el catálogo global y bloquea publicaciones que incumplan las normas."
        acciones={
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                className="input w-64 pl-9"
                placeholder="Buscar producto"
                value={busqueda}
                onChange={(evento) => {
                  setBusqueda(evento.target.value);
                  setPagina(1);
                }}
                aria-label="Buscar producto"
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
              <option value="bloqueado">Bloqueados</option>
            </select>
          </div>
        }
      />

      {productos.isLoading && <CargandoBloque mensaje="Cargando productos…" />}
      {productos.isError && <EstadoError mensaje="No pudimos cargar los productos." onReintentar={() => void productos.refetch()} />}
      {productos.data && productos.data.results.length === 0 && (
        <EstadoVacio titulo="Sin productos" descripcion="No hay productos que coincidan con los filtros." icono={<Package className="h-9 w-9" />} />
      )}
      {productos.data && productos.data.results.length > 0 && (
        <>
          <div className="overflow-x-auto card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="p-3">Producto</th>
                  <th className="p-3">Puesto / categoría</th>
                  <th className="p-3">Precio</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.data.results.map((producto) => (
                  <tr key={producto.id} className="border-b last:border-0">
                    <td className="p-3">
                      <p className="font-medium">{producto.nombre}</p>
                      <p className="text-xs text-slate-500">#{producto.id}</p>
                    </td>
                    <td className="p-3 text-xs text-slate-500">Puesto #{producto.id_puesto} · Categoría #{producto.id_categoria}</td>
                    <td className="p-3">{formatearMoneda(producto.precio)}</td>
                    <td className="p-3">{producto.stock}</td>
                    <td className="p-3">
                      <span className={`badge ${producto.estado === 'bloqueado' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : producto.estado === 'activo' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {producto.estado}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {producto.estado === 'bloqueado' ? (
                        <button type="button" className="btn-primary py-1.5 text-xs" onClick={() => abrir(producto, 'activo')}>
                          <Unlock className="h-3.5 w-3.5" /> Desbloquear
                        </button>
                      ) : (
                        <button type="button" className="btn-ghost py-1.5 text-xs text-rose-600 dark:text-rose-400" onClick={() => abrir(producto, 'bloqueado')}>
                          <Lock className="h-3.5 w-3.5" /> Bloquear
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion pagina={pagina} total={productos.data.count} tamano={TAMANO} onCambiar={setPagina} cargando={productos.isFetching} />
        </>
      )}

      <Modal
        abierto={Boolean(objetivo)}
        onCerrar={() => setObjetivo(null)}
        titulo={destino === 'bloqueado' ? `Bloquear ${objetivo?.nombre ?? ''}` : `Desbloquear ${objetivo?.nombre ?? ''}`}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {destino === 'bloqueado'
            ? 'El producto dejará de mostrarse en el catálogo. Los pedidos en curso no se cancelan.'
            : 'El producto volverá a estar disponible si su puesto también está activo.'}
        </p>
        <Campo etiqueta="Motivo (obligatorio)" htmlFor="motivo-producto" className="mt-3">
          <textarea id="motivo-producto" rows={3} className="input" value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Explica la decisión (mínimo 5 caracteres)." />
        </Campo>
        <ErrorCampo mensaje={error} />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setObjetivo(null)} disabled={moderar.isPending}>Cancelar</button>
          <button type="button" className={destino === 'bloqueado' ? 'btn-danger' : 'btn-primary'} onClick={enviar} disabled={moderar.isPending}>
            {moderar.isPending ? 'Guardando…' : destino === 'bloqueado' ? 'Bloquear' : 'Desbloquear'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
