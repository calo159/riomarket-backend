import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Campo } from './Campos';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
}

/** Campo de contraseña con botón para mostrarla u ocultarla. Compatible con `register` de react-hook-form. */
export const CampoContrasena = forwardRef<HTMLInputElement, Props>(function CampoContrasena(
  { id, etiqueta, error, ayuda, className, ...resto },
  ref,
) {
  const [visible, setVisible] = useState(false);
  return (
    <Campo etiqueta={etiqueta} htmlFor={id} error={error} ayuda={ayuda}>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          className={`input pr-11 ${className ?? ''}`}
          aria-invalid={error ? true : undefined}
          {...resto}
        />
        <button
          type="button"
          onClick={() => setVisible((valor) => !valor)}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label={visible ? `Ocultar ${etiqueta.toLowerCase()}` : `Mostrar ${etiqueta.toLowerCase()}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Campo>
  );
});
