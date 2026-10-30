import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bike, Clock, MapPin, MapPinned } from 'lucide-react';
import { listarPuestos } from '../api/catalog';
import { MapaDiferido } from '../components/mapa/MapaDiferido';
import { EncabezadoPagina } from '../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../components/ui/Estado';
import { claves } from '../lib/queryKeys';
import { puestosConCoordenadas } from '../lib/mapa';

export function MapaPuestos() {
  const navigate = useNavigate();
  const zonaMapa = useRef<HTMLDivElement>(null);
  const [seleccion, setSeleccion] = useState<{ id: number; vez: number } | null>(null);
  const [mapaFallo, setMapaFallo] = useState(false);

  useEffect(() => {
    document.title = 'Mapa de puestos · RioMarket';
  }, []);

  const puestos = useQuery({
    queryKey: claves.puestos.mapa,
    queryFn: () => listarPuestos({ page_size: 100, ordering: 'nombre' }),
    staleTime: 60_000,
  });

  const ubicados = useMemo(() => puestosConCoordenadas(puestos.data?.results ?? []), [puestos.data]);

  const verEnElMapa = (id: number) => {
    setSeleccion((anterior) => ({ id, vez: (anterior?.vez ?? 0) + 1 }));
    zonaMapa.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-[1240px] px-3 py-5 sm:px-5">
      <EncabezadoPagina
        titulo="Mapa de puestos"
        descripcion="Mira dónde queda cada puesto de Riohacha y cómo llegar. También puedes elegir uno de la lista."
      />

      {puestos.isLoading && <CargandoBloque mensaje="Cargando puestos…" />}
      {puestos.isError && (
        <EstadoError mensaje="No pudimos cargar los puestos." onReintentar={() => void puestos.refetch()} />
      )}

      {puestos.data && ubicados.length === 0 && (
        <EstadoVacio
          titulo="Aún no hay puestos en el mapa"
          descripcion="Cuando un puesto registre su ubicación, aparecerá aquí."
          icono={<MapPinned className="h-8 w-8" />}
          accion={<Link to="/catalogo" className="btn-secondary">Explorar el catálogo</Link>}
        />
      )}

      {puestos.data && ubicados.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <div className="lg:col-start-2 lg:row-start-1">
            <a
              href="#lista-puestos"
              className="sr-only focus:not-sr-only focus:mb-2 focus:inline-flex focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-brand-700"
            >
              Ir a la lista de puestos
            </a>
            <div
              ref={zonaMapa}
              className="card h-[56vh] min-h-[320px] overflow-hidden lg:h-[640px]"
              data-testid="zona-mapa"
            >
              <MapaDiferido
                puestos={ubicados}
                seleccion={seleccion}
                onAbrirPuesto={(id) => navigate(`/puestos/${id}`)}
                alFallar={() => setMapaFallo(true)}
                etiqueta="Mapa de puestos de Riohacha"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Mapa © <a className="link" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors
            </p>
          </div>

          <section
            id="lista-puestos"
            aria-labelledby="titulo-lista-puestos"
            className="lg:col-start-1 lg:row-start-1 lg:max-h-[640px] lg:overflow-y-auto"
          >
            <h2 id="titulo-lista-puestos" className="mb-2 text-lg font-bold">
              {ubicados.length === 1 ? '1 puesto' : `${ubicados.length} puestos`}
            </h2>
            <ul className="space-y-2.5">
              {ubicados.map((puesto) => (
                <li key={puesto.id} className="card p-3.5">
                  <h3 className="font-bold">
                    <Link to={`/puestos/${puesto.id}`} className="hover:underline">
                      {puesto.nombre}
                    </Link>
                  </h3>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {puesto.direccion}
                  </p>
                  {puesto.horario && (
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {puesto.horario}
                    </p>
                  )}
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                    <Bike className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {puesto.ofreceDomicilio ? 'Ofrece domicilio' : 'Solo retiro en el puesto'}
                  </p>
                  {!mapaFallo && (
                    <button
                      type="button"
                      className="btn-marca mt-2.5 w-full sm:w-auto"
                      onClick={() => verEnElMapa(puesto.id)}
                      aria-label={`Ver ${puesto.nombre} en el mapa`}
                    >
                      Ver en el mapa
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
