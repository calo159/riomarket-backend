import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function ErrorCampo({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p className="field-error" role="alert">
      {mensaje}
    </p>
  );
}

export function Campo({
  etiqueta,
  htmlFor,
  error,
  ayuda,
  children,
  className,
}: {
  etiqueta: string;
  htmlFor: string;
  error?: string;
  ayuda?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {etiqueta}
      </label>
      {children}
      {ayuda && !error && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ayuda}</p>}
      <ErrorCampo mensaje={error} />
    </div>
  );
}

export function Selector({
  id,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { id: string }) {
  return (
    <select id={id} className={cn('input', className)} {...props}>
      {children}
    </select>
  );
}
