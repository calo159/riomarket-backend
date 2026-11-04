import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useToast } from '../ui/Toast';

/**
 * Una contraseña temporal para entregar a la persona: se muestra una sola vez, con botón para
 * copiarla. Vale tanto al crear una cuenta como al restablecer la contraseña de una existente.
 */
export function ContrasenaTemporal({ valor, id = 'password-temporal' }: { valor: string; id?: string }) {
  const toast = useToast();
  const [copiada, setCopiada] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiada(true);
    } catch {
      // Sin permiso del navegador: la contraseña sigue visible para copiarla a mano.
      toast.info('No pudimos copiarla sola: selecciónala y cópiala.');
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor={id}>
          Contraseña temporal
        </label>
        <div className="flex gap-2">
          <input
            id={id}
            className="input font-mono"
            readOnly
            value={valor}
            onFocus={(evento) => evento.currentTarget.select()}
          />
          <button type="button" className="btn-secondary shrink-0" onClick={() => void copiar()}>
            {copiada ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copiada ? 'Copiada' : 'Copiar'}
          </button>
        </div>
      </div>
      <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" role="note">
        Cópiala ahora: <strong>no se vuelve a mostrar</strong>. Dísela a la persona; al entrar puede cambiarla en «Mi perfil».
      </p>
    </div>
  );
}
