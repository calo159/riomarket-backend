import { useEffect, useState } from 'react';

const FORMATO = /^(\D*)(\d{1,3}(?:\.\d{3})*)(\D*)$/;
const DURACION_MS = 800;

function conPuntos(n: number) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function reducirMovimiento() {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Cifra que cuenta desde cero hasta su valor al aparecer (por ejemplo «$ 582.800» o «15»).
 * Si el texto no es un entero con puntos de miles, o la persona pidió menos movimiento, se muestra tal cual.
 * Los lectores de pantalla leen siempre el valor final.
 */
export function NumeroAnimado({ texto }: { texto: string | number }) {
  const final = String(texto);
  const partes = FORMATO.exec(final);
  const objetivo = partes ? Number(partes[2].replace(/\./g, '')) : null;
  const [actual, setActual] = useState<number | null>(null);

  useEffect(() => {
    if (objetivo === null || objetivo === 0 || reducirMovimiento()) return;
    let cuadro = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - inicio) / DURACION_MS);
      // Desaceleración exponencial: arranca rápido y se asienta en el valor real.
      const suave = avance === 1 ? 1 : 1 - 2 ** (-10 * avance);
      setActual(objetivo * suave);
      if (avance < 1) cuadro = requestAnimationFrame(paso);
      else setActual(null);
    };
    setActual(0);
    cuadro = requestAnimationFrame(paso);
    return () => {
      cancelAnimationFrame(cuadro);
      setActual(null);
    };
  }, [objetivo]);

  if (!partes || actual === null) return <>{final}</>;
  return (
    <>
      <span className="sr-only">{final}</span>
      <span aria-hidden="true">
        {partes[1]}
        {conPuntos(actual)}
        {partes[3]}
      </span>
    </>
  );
}
