import { Component, lazy, Suspense, type ReactNode } from 'react';
import { MapPinOff } from 'lucide-react';
import { Spinner } from '../ui/Estado';
import type { PropsMapa } from './MapaLeaflet';

// Leaflet (JS + CSS) vive en su propio chunk: solo se descarga cuando una página pide un mapa.
const MapaLeaflet = lazy(() => import('./MapaLeaflet'));

class LimiteMapa extends Component<
  { children: ReactNode; aviso: string; alFallar?: () => void },
  { fallo: boolean }
> {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch() {
    this.props.alFallar?.();
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <div
        role="status"
        className="flex h-full min-h-[120px] items-center justify-center gap-2 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300"
      >
        <MapPinOff className="h-5 w-5 shrink-0" aria-hidden="true" />
        <p>{this.props.aviso}</p>
      </div>
    );
  }
}

/** Mapa de carga diferida. Si Leaflet no carga, muestra un aviso y el resto de la página sigue. */
export function MapaDiferido({
  aviso = 'No pudimos cargar el mapa. Puedes usar la lista de puestos.',
  alFallar,
  ...props
}: PropsMapa & { aviso?: string; alFallar?: () => void }) {
  return (
    <LimiteMapa aviso={aviso} alFallar={alFallar}>
      <Suspense
        fallback={
          <div className="flex h-full min-h-[120px] items-center justify-center gap-2 bg-slate-50 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <Spinner /> Cargando mapa…
          </div>
        }
      >
        <MapaLeaflet {...props} />
      </Suspense>
    </LimiteMapa>
  );
}
