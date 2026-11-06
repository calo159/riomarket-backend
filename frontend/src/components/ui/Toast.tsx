import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { hayMovimiento, SALIDA_MS } from '../../lib/movimiento';

type TipoToast = 'exito' | 'error' | 'info';

interface Toast {
  id: number;
  tipo: TipoToast;
  mensaje: string;
  /** Se está yendo: ya no cuenta, pero sigue en pantalla lo que dura su animación de salida. */
  saliendo?: boolean;
}

interface ContextoToast {
  exito: (mensaje: string) => void;
  error: (mensaje: string) => void;
  info: (mensaje: string) => void;
}

const Contexto = createContext<ContextoToast | null>(null);
let contador = 0;

const ESTILOS: Record<TipoToast, string> = {
  exito: 'border-pie bg-pie text-white',
  error: 'border-rose-900 bg-pie text-white',
  info: 'border-pie bg-pie text-white',
};

const ICONOS: Record<TipoToast, ReactNode> = {
  exito: <CheckCircle2 className="h-5 w-5 shrink-0 text-[#7CE0A6]" />,
  error: <XCircle className="h-5 w-5 shrink-0 text-[#FF9B86]" />,
  info: <Info className="h-5 w-5 shrink-0 text-[#8FD3F4]" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const quitar = useCallback((id: number) => {
    if (!hayMovimiento()) {
      setToasts((actuales) => actuales.filter((toast) => toast.id !== id));
      return;
    }
    setToasts((actuales) => actuales.map((toast) => (toast.id === id ? { ...toast, saliendo: true } : toast)));
    window.setTimeout(() => setToasts((actuales) => actuales.filter((toast) => toast.id !== id)), SALIDA_MS);
  }, []);

  const agregar = useCallback(
    (tipo: TipoToast, mensaje: string) => {
      contador += 1;
      const id = contador;
      setToasts((actuales) => [...actuales.slice(-3), { id, tipo, mensaje }]);
      window.setTimeout(() => quitar(id), 4500);
    },
    [quitar],
  );

  const valor = useMemo<ContextoToast>(
    () => ({
      exito: (mensaje) => agregar('exito', mensaje),
      error: (mensaje) => agregar('error', mensaje),
      info: (mensaje) => agregar('info', mensaje),
    }),
    [agregar],
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-20 z-[100] md:bottom-6 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end"
        role="status"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-lg border px-4 py-3 text-sm shadow-menu',
              toast.saliendo ? 'toast-sale' : 'animate-rise',
              ESTILOS[toast.tipo],
            )}
          >
            <span aria-hidden="true" className="toast-reloj absolute inset-x-0 bottom-0 h-[2px] bg-white/35" />
            {ICONOS[toast.tipo]}
            <p className="flex-1 leading-snug">{toast.mensaje}</p>
            <button
              type="button"
              onClick={() => quitar(toast.id)}
              className="-mr-1 grid h-8 w-8 place-items-center rounded opacity-80 hover:opacity-100"
              aria-label="Cerrar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useToast(): ContextoToast {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useToast debe usarse dentro de ToastProvider.');
  return contexto;
}
