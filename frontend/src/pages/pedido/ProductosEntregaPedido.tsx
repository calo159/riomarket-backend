import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { Pedido } from '../../lib/types';
import { formatearMoneda } from '../../lib/format';

export function ProductosPedido({ datos }: { datos: Pedido }) {
  return (
    <section className="card p-5">
      <h2 className="text-lg font-extrabold">Productos</h2>
      <div className="mt-3 divide-y">
        {datos.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-medium">{item.nombre_producto}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatearMoneda(item.precio_unitario)} / {item.unidad_medida} × {item.cantidad}
              </p>
            </div>
            <p className="font-semibold">{formatearMoneda(item.subtotal)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function EntregaPedido({ datos }: { datos: Pedido }) {
  return (
    <section className="card p-5">
      <h2 className="text-lg font-extrabold">Entrega</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-slate-500 dark:text-slate-400">Modalidad</dt>
          <dd className="font-medium">{datos.tipo_entrega === 'domicilio' ? 'Domicilio' : 'Retiro en el puesto'}</dd>
        </div>
        {datos.tipo_entrega === 'domicilio' && (
          <>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-500 dark:text-slate-400">Dirección</dt>
              <dd className="font-medium">{datos.direccion_entrega || '—'}</dd>
            </div>
            {datos.referencia_entrega && (
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-slate-500 dark:text-slate-400">Referencia</dt>
                <dd>{datos.referencia_entrega}</dd>
              </div>
            )}
          </>
        )}
        {datos.notas && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-slate-500 dark:text-slate-400">Notas</dt>
            <dd className="whitespace-pre-line">{datos.notas}</dd>
          </div>
        )}
      </dl>
      <Link to={`/puestos/${datos.id_puesto}`} className="link mt-3 inline-flex items-center gap-1 text-sm">
        <MapPin className="h-4 w-4" /> Ver puesto
      </Link>
    </section>
  );
}
