import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

const FORMATO = /^(\D*)(\d{1,3}(?:\.\d{3})*)(\D*)$/;
const DURACION_MS = 800;
/** Cuando el valor ya estaba en pantalla y solo cambia, el conteo es más corto: es un ajuste, no una llegada. */
const DURACION_CAMBIO_MS = 550;

function conPuntos(n: number) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function reducirMovimiento() {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Cifra que cuenta hasta su valor al aparecer (por ejemplo «$ 582.800» o «15»). Si después el valor cambia (llegó un
 * pedido, se aprobó una cuenta), no vuelve a empezar de cero: cuenta desde el que tenía y destella un momento para que
 * se note que cambió. Si el texto no es un entero con puntos de miles, o la persona pidió menos movimiento, se muestra
 * tal cual. Los lectores de pantalla leen siempre el valor final.
 */
export function NumeroAnimado({ texto }: { texto: string | number }) {
  const final = String(texto);
  const partes = FORMATO.exec(final);
  const objetivo = partes ? Number(partes[2].replace(/\./g, '')) : null;
  const [actual, setActual] = useState<number | null>(null);
  const [cambio, setCambio] = useState(0);
  // El último valor que se mostró (o `null` si todavía no se mostró ninguno).
  const previo = useRef<number | null>(null);

  useEffect(() => {
    const desde = previo.current;
    previo.current = objetivo;
    if (objetivo === null || reducirMovimiento()) return undefined;
    // Primera vez con cero: nada que contar. Mismo valor: nada que mostrar.
    if (desde === null && objetivo === 0) return undefined;
    if (desde === objetivo) return undefined;
    const origen = desde ?? 0;
    const duracion = desde === null ? DURACION_MS : DURACION_CAMBIO_MS;
    if (desde !== null) setCambio((n) => n + 1);

    let cuadro = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - inicio) / duracion);
      // Desaceleración exponencial: arranca rápido y se asienta en el valor real.
      const suave = avance === 1 ? 1 : 1 - 2 ** (-10 * avance);
      setActual(origen + (objetivo - origen) * suave);
      if (avance < 1) cuadro = requestAnimationFrame(paso);
      else setActual(null);
    };
    setActual(origen);
    cuadro = requestAnimationFrame(paso);
    return () => {
      cancelAnimationFrame(cuadro);
      setActual(null);
    };
  }, [objetivo]);

  if (!partes) return <>{final}</>;
  // `key` reinicia el destello cada vez que el valor cambia.
  return (
    <span key={cambio} className={cn(cambio > 0 && 'numero-cambia')}>
      {actual === null ? (
        final
      ) : (
        <>
          <span className="sr-only">{final}</span>
          <span aria-hidden="true">
            {partes[1]}
            {conPuntos(actual)}
            {partes[3]}
          </span>
        </>
      )}
    </span>
  );
}
