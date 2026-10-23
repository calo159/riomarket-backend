import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, LogOut, MapPin, Package, User } from 'lucide-react';
import { useSession } from '../../auth/SessionProvider';
import { inicioPorRol } from '../../auth/permisos';
import { iniciales } from '../../lib/utils';
import { ETIQUETAS_ROL } from '../../lib/format';

export function AccountMenu() {
  const { usuario, rol, cerrarSesion } = useSession();
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!abierto) return;
    const alClic = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    const alTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', alClic);
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('mousedown', alClic);
      document.removeEventListener('keydown', alTecla);
    };
  }, [abierto]);

  if (!usuario) return null;

  const salir = async () => {
    setAbierto(false);
    await cerrarSesion();
    navigate('/');
  };

  return (
    <div className="relative" ref={contenedor}>
      <button
        type="button"
        className="btn-ghost gap-2 py-1.5 pl-1.5 pr-2.5"
        onClick={() => setAbierto((valor) => !valor)}
        aria-expanded={abierto}
        aria-haspopup="menu"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-200">
          {iniciales(usuario.nombre)}
        </span>
        <span className="hidden max-w-[9rem] truncate text-sm font-semibold sm:block">{usuario.nombre.split(' ')[0]}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border bg-white shadow-xl dark:bg-slate-900"
        >
          <div className="border-b px-4 py-3">
            <p className="truncate font-semibold">{usuario.nombre}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{usuario.correo}</p>
            <span className="badge mt-2 bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
              {ETIQUETAS_ROL[rol ?? ''] ?? rol}
            </span>
          </div>
          <div className="p-1.5" onClick={() => setAbierto(false)}>
            <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" to="/perfil">
              <User className="h-4 w-4" /> Mi perfil
            </Link>
            {rol === 'comprador' && (
              <>
                <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" to="/mis-pedidos">
                  <Package className="h-4 w-4" /> Mis pedidos
                </Link>
                <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" to="/direcciones">
                  <MapPin className="h-4 w-4" /> Direcciones
                </Link>
              </>
            )}
            {rol !== 'comprador' && (
              <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" to={inicioPorRol(rol)}>
                <LayoutDashboard className="h-4 w-4" /> Mi panel
              </Link>
            )}
          </div>
          <div className="border-t p-1.5">
            <button
              type="button"
              onClick={() => void salir()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
