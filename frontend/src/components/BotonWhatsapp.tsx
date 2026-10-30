import { MessageCircle } from 'lucide-react';
import { enlaceWhatsapp } from '../lib/whatsapp';
import { cn } from '../lib/utils';

/**
 * Enlace «Escribir por WhatsApp». Sin número publicado (el vendedor no lo activó, el puesto no
 * está activo o no está verificado) no se dibuja nada: la API ya decidió que no se muestra.
 */
export function BotonWhatsapp({
  numero,
  mensaje,
  className,
}: {
  numero: string | null | undefined;
  mensaje: string;
  className?: string;
}) {
  const href = enlaceWhatsapp(numero, mensaje);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('btn-secondary', className)}
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      Escribir por WhatsApp
      <span className="sr-only"> (se abre en una pestaña nueva)</span>
    </a>
  );
}
