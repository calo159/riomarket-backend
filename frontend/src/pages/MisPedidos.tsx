import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Package } from 'lucide-react';
import { listarPedidos } from '../api/orders';
import { EncabezadoPagina } from '../components/ui/Encabezado';
import { EtiquetaEstado } from '../components/ui/EtiquetaEstado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../components/ui/Estado';
import { Paginacion } from '../components/ui/Paginacion';
import { formatearFechaHora, formatearMoneda, OPCIONES_FILTRO_PEDIDO } from '../lib/format';
import { claves } from '../lib/queryKeys';

const TAMANO = 10;

export function MisPedidos() {
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState('');

  useEffect(() => {
    document.title = 'Mis pedidos · RioMarket';
  }, []);

  const pedidos = useQuery({
    queryKey: claves.pedidos.comprador(pagina, estado),
    queryFn: () => listarPedidos({ page: pagina, page_size: TAMANO, estado: estado || undefined }),
    placeholderData: (anterior) => anterior,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <EncabezadoPagina
        titulo="Mis pedidos"
        descripcion="Sigue el estado de tus compras y vuelve a pedir tus favoritos."
        acciones={
          <select
            className="input w-auto"
            value={estado}
            onChange={(evento) => {
              setEstado(evento.target.value);
              setPagina(1);
            }}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {OPCIONES_FILTRO_PEDIDO.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </select>
        }
      />

      {pedidos.isLoading && <CargandoBloque mensaje="Cargando pedidos…" />}
      {pedidos.isError && <EstadoError mensaje="No pudimos cargar tus pedidos." onReintentar={() => void pedidos.refetch()} />}
      {pedidos.data && pedidos.data.results.length === 0 && (
        <EstadoVacio
          titulo="Aún no tienes pedidos"
          descripcion="Cuando compres algo, aquí podrás seguir su estado."
          accion={<Link to="/catalogo" className="btn-primary">Explorar el catálogo</Link>}
        />
      )}
      {pedidos.data && pedidos.data.results.length > 0 && (
        <>
          <div className="space-y-3">
            {pedidos.data.results.map((pedido) => (
              <Link
                key={pedido.id}
                to={`/pedidos/${pedido.id}`}
                className="card flex flex-col gap-3 p-4 transition hover:border-brand-300 sm:flex-row sm:items-center"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  <Package className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">Pedido #{pedido.id}</p>
                    <EtiquetaEstado estado={pedido.estado} />
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    {formatearFechaHora(pedido.fecha_creacion)} · {pedido.items.length}{' '}
                    {pedido.items.length === 1 ? 'producto' : 'productos'} · {pedido.tipo_entrega === 'domicilio' ? 'Domicilio' : 'Retiro'}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <p className="text-lg font-bold">{formatearMoneda(pedido.total)}</p>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
          <Paginacion pagina={pagina} total={pedidos.data.count} tamano={TAMANO} onCambiar={setPagina} cargando={pedidos.isFetching} />
        </>
      )}
    </div>
  );
}
