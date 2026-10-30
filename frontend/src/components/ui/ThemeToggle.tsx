import { useEffect, useState } from 'react';
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

  return (
    <button
      type="button"
      className={variante === 'encabezado' ? 'acto-encabezado' : 'btn-ghost p-2.5'}
      onClick={() => setOscuro((valor) => !valor)}
      aria-label={oscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={oscuro ? 'Modo claro' : 'Modo oscuro'}
    >
      {oscuro ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
