import { useEffect, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

type Fase = 'quieta' | 'avanza' | 'termina';

/** Cuánto hay que esperar antes de mostrarla: lo que carga en menos de esto no necesita barra. */
const ESPERA_MS = 140;
/** Lo que dura el cierre (llega al 100 % y se desvanece). */
const CIERRE_MS = 420;

/**
 * Barra fina bajo el borde de la página que avisa que algo se está cargando o guardando. Se alimenta de las consultas y
 * los guardados en curso (React Query): avanza rápido al principio y se frena hacia el 85 %, y cuando todo termina
 * llega al final y se desvanece. Si la carga es instantánea no aparece. Con «reducir movimiento» queda como una raya
 * quieta mientras dura la carga.
 */
export function BarraProgreso() {
  const ocupado = useIsFetching() + useIsMutating() > 0;
  const [fase, setFase] = useState<Fase>('quieta');

  useEffect(() => {
    if (ocupado) {
      const espera = window.setTimeout(() => setFase('avanza'), ESPERA_MS);
      return () => window.clearTimeout(espera);
    }
    if (fase !== 'avanza') return undefined;
    setFase('termina');
    const cierre = window.setTimeout(() => setFase('quieta'), CIERRE_MS);
    return () => window.clearTimeout(cierre);
    // `fase` no entra: solo importa si hay trabajo en curso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocupado]);

  if (fase === 'quieta') return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[110] h-[3px]">
      <div className={fase === 'avanza' ? 'barra-avanza' : 'barra-termina'} />
    </div>
  );
}
