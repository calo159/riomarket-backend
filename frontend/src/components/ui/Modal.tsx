import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
  ancho = 'max-w-lg',
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  ancho?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tituloId = useId();
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;

  useEffect(() => {
    if (!abierto) return;
    const anterior = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        cerrarRef.current();
        return;
      }
      if (evento.key !== 'Tab' || !ref.current) return;
      // Trampa de foco: el Tab da la vuelta dentro del diálogo y no llega al fondo.
      const enfocables = Array.from(
        ref.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (enfocables.length === 0) {
        evento.preventDefault();
        return;
      }
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const activo = document.activeElement;
      if (evento.shiftKey && (activo === primero || activo === ref.current)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && activo === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', alPresionar);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = '';
      anterior?.focus();
    };
  }, [abierto]);

  if (!abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        tabIndex={-1}
        aria-hidden="true"
        aria-label="Cerrar"
        onClick={onCerrar}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={cn(
          'relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border bg-white p-5 shadow-2xl outline-none dark:bg-slate-900 sm:rounded-2xl',
          ancho,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={tituloId} className="text-lg font-semibold">
            {titulo}
          </h2>
          <button type="button" onClick={onCerrar} className="btn-ghost -mr-2 -mt-1 p-2" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmarModal({
  abierto,
  titulo = '¿Confirmas esta acción?',
  descripcion,
  textoConfirmar = 'Confirmar',
  peligro = true,
  cargando = false,
  onConfirmar,
  onCerrar,
}: {
  abierto: boolean;
  titulo?: string;
  descripcion?: string;
  textoConfirmar?: string;
  peligro?: boolean;
  cargando?: boolean;
  onConfirmar: () => void;
  onCerrar: () => void;
}) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={titulo}>
      {descripcion && <p className="text-sm text-slate-600 dark:text-slate-300">{descripcion}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCerrar} disabled={cargando}>
          Cancelar
        </button>
        <button
          type="button"
          className={peligro ? 'btn-danger' : 'btn-primary'}
          onClick={onConfirmar}
          disabled={cargando}
        >
          {cargando ? 'Procesando…' : textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}
