import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Un aviso visual de «acaba de pasar» que se apaga solo: `[activo, disparar]`. Sirve para un destello que debe verse una
 * vez después de guardar (y no cada vez que se vuelve a dibujar la pantalla). Volver a disparar reinicia la cuenta.
 */
export function useUnaVez(duracionMs = 1600): [boolean, () => void] {
  const [activo, setActivo] = useState(false);
  const temporizador = useRef<number>();

  const disparar = useCallback(() => {
    window.clearTimeout(temporizador.current);
    // Se apaga y se vuelve a encender en el cuadro siguiente: así la animación CSS reinicia aunque ya estuviera activa.
    setActivo(false);
    requestAnimationFrame(() => {
      setActivo(true);
      temporizador.current = window.setTimeout(() => setActivo(false), duracionMs);
    });
  }, [duracionMs]);

  useEffect(() => () => window.clearTimeout(temporizador.current), []);
  return [activo, disparar];
}
