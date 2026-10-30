import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

const CELDAS = 6;
// Se llenan de abajo hacia arriba y de izquierda a derecha, como si se fueran apilando.
const POSICIONES = [
  { x: 6.5, y: 20 },
  { x: 13.25, y: 20 },
  { x: 20, y: 20 },
  { x: 6.5, y: 13.5 },
  { x: 13.25, y: 13.5 },
  { x: 20, y: 13.5 },
];

/**
 * Canasta de seis celdas: cada unidad llena una. Al agregar, la última celda entra con una
 * animación corta (sin ella cuando el sistema pide reducir el movimiento).
 */
export function CanastaIcono({ cantidad, className }: { cantidad: number; className?: string }) {
  const llenas = Math.min(Math.max(Math.trunc(cantidad), 0), CELDAS);
  const anterior = useRef(cantidad);
  const [pulso, setPulso] = useState(0);

  useEffect(() => {
    if (cantidad > anterior.current) setPulso((valor) => valor + 1);
    anterior.current = cantidad;
  }, [cantidad]);

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('h-7 w-7', className)} fill="none">
      <path
        d="M12 8V6.5A2.5 2.5 0 0 1 14.5 4h3A2.5 2.5 0 0 1 20 6.5V8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <rect x="3" y="8" width="26" height="20" rx="4" stroke="currentColor" strokeWidth="2.2" />
      {POSICIONES.map((posicion, indice) => {
        const llena = indice < llenas;
        const ultima = llena && indice === llenas - 1 && pulso > 0;
        return (
          <rect
            // Cambiar la clave reinicia la animación en cada unidad agregada.
            key={ultima ? `${indice}-${pulso}` : indice}
            x={posicion.x}
            y={posicion.y}
            width="5.5"
            height="4.5"
            rx="2.25"
            fill="currentColor"
            fillOpacity={llena ? 1 : 0.18}
            className={ultima ? 'celda-entra' : undefined}
          />
        );
      })}
    </svg>
  );
}
