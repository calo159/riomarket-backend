import type { ComponentPropsWithoutRef, CSSProperties, ElementType } from 'react';
import { useRevelar } from '../lib/revelar';

type Props = ComponentPropsWithoutRef<'section'> & {
  as?: 'section' | 'div';
  /** Aparece entera, de una vez; sin esto, solo entran sus hijos con la clase `rv`. */
  bloque?: boolean;
};

/** Sección que aparece al llegar a ella; sus hijos con la clase `rv` entran con un pequeño retraso. */
export function Revela({ as = 'section', bloque = false, className, ...props }: Props) {
  const Etiqueta = as as ElementType;
  const ref = useRevelar<HTMLElement>();
  return <Etiqueta ref={ref} className={bloque ? `${className ?? ''} rv-self`.trim() : className} {...props} />;
}

/** Lugar de un elemento dentro de su grupo para el retraso de entrada (`--i` en index.css). */
export function lugar(n: number): CSSProperties {
  return { '--i': n } as CSSProperties;
}
