import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpenCheck, CreditCard, Percent, ShieldCheck } from 'lucide-react';
import { listarSolicitudes } from '../../api/verification';
import { listarPagos } from '../../api/payments';
import { listarCupones } from '../../api/coupons';
import { EncabezadoPagina } from '../../components/ui/Encabezado';

export function PanelAdmin() {
  useEffect(() => {
    document.title = 'Administración · RioMarket';
  }, []);

  const verif = useQuery({ queryKey: ['verif', 'pendiente'], queryFn: () => listarSolicitudes('pendiente') });
  const pagos = useQuery({ queryKey: ['pagos', 'admin'], queryFn: () => listarPagos({ page_size: 100 }) });
  const cupones = useQuery({ queryKey: ['cupones', 'admin'], queryFn: () => listarCupones({ page_size: 100 }) });

  const tarjetas = [
    { etiqueta: 'Verificaciones pendientes', valor: verif.data?.count ?? 0, icono: ShieldCheck, to: '/admin/verificaciones' },
    { etiqueta: 'Pagos registrados', valor: pagos.data?.count ?? 0, icono: CreditCard, to: '/admin/pagos' },
    { etiqueta: 'Cupones', valor: cupones.data?.count ?? 0, icono: Percent, to: '/admin/cupones' },
    { etiqueta: 'Auditoría', valor: '—', icono: BookOpenCheck, to: '/admin/auditoria' },
  ];

  return (
    <div>
      <EncabezadoPagina titulo="Panel de administración" descripcion="Supervisión y moderación del marketplace." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map(({ etiqueta, valor, icono: Icono, to }) => (
          <Link key={etiqueta} to={to} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{etiqueta}</p>
                <p className="mt-1 text-2xl font-extrabold">{valor}</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><Icono className="h-5 w-5" /></span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
