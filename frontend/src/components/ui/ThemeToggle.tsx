import { useEffect, useState, type MouseEvent } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle({ variante = 'normal' }: { variante?: 'normal' | 'encabezado' }) {
  const [oscuro, setOscuro] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', oscuro);
    try {
      localStorage.setItem('riomarket.tema', oscuro ? 'oscuro' : 'claro');
    } catch {
      /* almacenamiento no disponible */
    }
  }, [oscuro]);

  const alternar = (evento: MouseEvent<HTMLButtonElement>) => {
    const siguiente = !oscuro;
    const aplicar = () => {
      document.documentElement.classList.toggle('dark', siguiente);
      setOscuro(siguiente);
    };
    const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reducir) return aplicar();

    // El tema nuevo se revela en círculo desde el botón. Sin soporte del navegador, cambia sin animar.
    const { clientX: x, clientY: y } = evento;
    const radio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    document.documentElement.classList.add('cambiando-tema');
    const transicion = document.startViewTransition(aplicar);
    void transicion.finished.finally(() => document.documentElement.classList.remove('cambiando-tema'));
    void transicion.ready.then(() =>
      document.documentElement.animate(
        { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
        { duration: 550, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' },
      ),
    );
  };

  return (
    <button
      type="button"
      className={variante === 'encabezado' ? 'acto-encabezado' : 'btn-ghost p-2.5'}
      onClick={alternar}
      aria-label={oscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={oscuro ? 'Modo claro' : 'Modo oscuro'}
    >
      {oscuro ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
