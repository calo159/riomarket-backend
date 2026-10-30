import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

type TipoToast = 'exito' | 'error' | 'info';

interface Toast {
  id: number;
  tipo: TipoToast;
  mensaje: string;
}

interface ContextoToast {
  exito: (mensaje: string) => void;
  error: (mensaje: string) => void;
  info: (mensaje: string) => void;
}

const Contexto = createContext<ContextoToast | null>(null);
let contador = 0;

const ESTILOS: Record<TipoToast, string> = {
  exito: 'border-verde-700 bg-verde-600 text-white',
  error: 'border-rojo-700 bg-rojo-600 text-white',
  info: 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950',
};

const ICONOS: Record<TipoToast, ReactNode> = {
  exito: <CheckCircle2 className="h-5 w-5 shrink-0" />,
  error: <XCircle className="h-5 w-5 shrink-0" />,
  info: <Info className="h-5 w-5 shrink-0" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const quitar = useCallback((id: number) => {
    setToasts((actuales) => actuales.filter((toast) => toast.id !== id));
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
        className="pointer-events-none fixed inset-x-4 bottom-[4.5rem] z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-4 sm:right-6 sm:items-end"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm',
              ESTILOS[toast.tipo],
            )}
          >
            {ICONOS[toast.tipo]}
            <p className="flex-1 leading-snug">{toast.mensaje}</p>
            <button
              type="button"
              onClick={() => quitar(toast.id)}
              className="rounded p-0.5 opacity-70 hover:opacity-100"
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
