import { useId } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { actualizarPuesto } from '../../api/catalog';
import { useSession } from '../../auth/SessionProvider';
import { useToast } from '../../components/ui/Toast';
import { mensajeDeError } from '../../lib/errors';
import { claves } from '../../lib/queryKeys';
import type { Puesto } from '../../lib/types';
import { cn } from '../../lib/utils';

/** Interruptor para decidir si el celular del vendedor se muestra a los compradores. */
export function InterruptorWhatsapp({ puesto }: { puesto: Puesto }) {
  const { usuario } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const idTexto = useId();
  const activo = Boolean(puesto.acepta_whatsapp);

  const cambiar = useMutation({
    mutationFn: (valor: boolean) => actualizarPuesto(puesto.id, { acepta_whatsapp: valor }),
    onSuccess: (_, valor) => {
      void queryClient.invalidateQueries({ queryKey: claves.puestos.todos });
      toast.exito(
        valor
          ? `Los compradores verán el botón de WhatsApp en ${puesto.nombre}.`
          : `Ocultamos tu WhatsApp en ${puesto.nombre}.`,
      );
    },
    onError: (error) => toast.error(mensajeDeError(error, 'No pudimos guardar el cambio.')),
  });

  const ultimos = usuario?.celular ? usuario.celular.slice(-4) : null;

  return (
    <div className="mt-3 flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        aria-labelledby={`${idTexto}-titulo`}
        aria-describedby={`${idTexto}-ayuda`}
        disabled={cambiar.isPending}
        onClick={() => cambiar.mutate(!activo)}
        className="relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-0 rounded-full transition-colors',
            activo ? 'bg-brand-600 dark:bg-brand-400' : 'bg-slate-400 dark:bg-slate-600',
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            'relative ml-0.5 h-6 w-6 rounded-full bg-white transition-transform',
            activo ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
      <div className="min-w-0 text-sm">
        <p id={`${idTexto}-titulo`} className="font-semibold">Recibir mensajes por WhatsApp</p>
        <p id={`${idTexto}-ayuda`} className="mt-0.5 text-slate-600 dark:text-slate-300">
          Tu número de celular será visible para los compradores
          {ultimos ? ` (termina en ${ultimos})` : ''}. Solo se muestra mientras el puesto esté activo y tu cuenta verificada.
        </p>
      </div>
    </div>
  );
}
