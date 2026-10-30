import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut } from 'lucide-react';
import { useSession } from '../../auth/SessionProvider';
import { useMenu } from '../../navigation/useMenu';
import { MenuItems } from './MenuItems';
import { itemsDe } from '../../navigation/tipos';
import { iniciales } from '../../lib/utils';
import { ETIQUETAS_ROL } from '../../lib/format';

export function AccountMenu() {
  const { usuario, rol, cerrarSesion } = useSession();
  const { menu, badges } = useMenu();
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const idPanel = useId();
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
        aria-controls={idPanel}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-200">
          {iniciales(usuario.nombre)}
        </span>
        <span className="hidden max-w-[9rem] truncate text-sm font-semibold sm:block">{usuario.nombre.split(' ')[0]}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {abierto && (
        // Es un panel de enlaces (no un role="menu", que exigiría menuitems y navegación con flechas).
        <div
          id={idPanel}
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
            <MenuItems items={itemsDe(menu, 'cuenta')} badges={badges} variante="cuenta" />
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
