import { useEffect, useState } from 'react';

/** Cuántas horas antes de vencer se considera «por vencer» (igual que PEDIDOS_AVISO_ANTES_HORAS). */
export const HORAS_AVISO = 2;

const MS_MINUTO = 60_000;
const MS_HORA = 60 * MS_MINUTO;

/** Milisegundos que faltan para ``venceEn`` (negativo si ya pasó); ``null`` si no hay plazo. */
export function msRestantes(venceEn: string | null | undefined, ahora: number = Date.now()): number | null {
  if (!venceEn) return null;
  const marca = new Date(venceEn).getTime();
  return Number.isNaN(marca) ? null : marca - ahora;
}

/** Faltan HORAS_AVISO o menos y todavía no venció. */
export function estaPorVencer(venceEn: string | null | undefined, ahora: number = Date.now()): boolean {
  const restante = msRestantes(venceEn, ahora);
  return restante !== null && restante > 0 && restante <= HORAS_AVISO * MS_HORA;
}

export function yaVencio(venceEn: string | null | undefined, ahora: number = Date.now()): boolean {
  const restante = msRestantes(venceEn, ahora);
  return restante !== null && restante <= 0;
}

/** Cuenta regresiva legible: «Quedan 5 h 20 min», «Quedan 45 min», «Queda menos de 1 minuto». */
export function textoCuentaRegresiva(venceEn: string | null | undefined, ahora: number = Date.now()): string {
  const restante = msRestantes(venceEn, ahora);
  if (restante === null) return '';
  if (restante <= 0) return 'El plazo ya venció';
  if (restante < MS_MINUTO) return 'Queda menos de 1 minuto';
  const minutosTotales = Math.floor(restante / MS_MINUTO);
  const dias = Math.floor(minutosTotales / (24 * 60));
  const horas = Math.floor((minutosTotales % (24 * 60)) / 60);
  const minutos = minutosTotales % 60;
  if (dias > 0) return `Quedan ${dias} ${dias === 1 ? 'día' : 'días'}${horas ? ` ${horas} h` : ''}`;
  if (horas > 0) return `Quedan ${horas} h${minutos ? ` ${minutos} min` : ''}`;
  return `Quedan ${minutos} min`;
}

/** Reloj que se actualiza cada ``intervaloMs`` para refrescar las cuentas regresivas. */
export function useAhora(intervaloMs: number = MS_MINUTO): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => window.clearInterval(id);
  }, [intervaloMs]);
  return ahora;
}
