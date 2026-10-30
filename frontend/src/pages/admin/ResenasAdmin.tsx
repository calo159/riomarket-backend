import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, Trash2 } from 'lucide-react';
import { eliminarResena, listarResenas } from '../../api/reviews';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { Paginacion } from '../../components/ui/Paginacion';
import { Estrellas } from '../../components/ui/Estrellas';
import { ConfirmarModal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { formatearFechaHora } from '../../lib/format';
import { mensajeDeError } from '../../lib/errors';
import type { Resena } from '../../lib/types';
import { claves } from '../../lib/queryKeys';

const TAMANO = 15;

export function ResenasAdmin() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pagina, setPagina] = useState(1);
  const [calificacion, setCalificacion] = useState('');
  const [eliminar, setEliminar] = useState<Resena | null>(null);

  useEffect(() => {
    document.title = 'Reseñas · Administración · RioMarket';
  }, []);

  const resenas = useQuery({
    queryKey: claves.resenas.admin(pagina, calificacion),
    queryFn: () =>
      listarResenas({
        page: pagina,
        page_size: TAMANO,
        calificacion_max: calificacion ? Number(calificacion) : undefined,
        calificacion_min: calificacion ? Number(calificacion) : undefined,
      }),
    placeholderData: (anterior) => anterior,
  });

  const borrar = useMutation({
    mutationFn: (id: number) => eliminarResena(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: claves.resenas.todos });
      void queryClient.invalidateQueries({ queryKey: claves.adminResumen });
      setEliminar(null);
      toast.exito('Reseña eliminada.');
    },
    onError: (fallo) => {
      setEliminar(null);
      toast.error(mensajeDeError(fallo));
    },
  });

  return (
    <div>
      <EncabezadoPagina
        titulo="Reseñas"
        descripcion="Modera las opiniones de los compradores. Elimina solo las que incumplan las normas."
        acciones={
          <select
            className="input w-auto"
            value={calificacion}
            onChange={(evento) => {
              setCalificacion(evento.target.value);
              setPagina(1);
            }}
            aria-label="Filtrar por calificación"
          >
            <option value="">Todas las calificaciones</option>
            {[1, 2, 3, 4, 5].map((valor) => (
              <option key={valor} value={valor}>{valor} estrella{valor === 1 ? '' : 's'}</option>
            ))}
          </select>
        }
      />

      {resenas.isLoading && <CargandoBloque mensaje="Cargando reseñas…" />}
      {resenas.isError && <EstadoError mensaje="No pudimos cargar las reseñas." onReintentar={() => void resenas.refetch()} />}
      {resenas.data && resenas.data.results.length === 0 && (
        <EstadoVacio titulo="Sin reseñas" descripcion="No hay reseñas que coincidan con el filtro." icono={<Star className="h-9 w-9" />} />
      )}
      {resenas.data && resenas.data.results.length > 0 && (
        <>
          <div className="space-y-3">
            {resenas.data.results.map((resena) => (
              <article key={resena.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Estrellas valor={resena.calificacion} />
                    {!resena.visible && <span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Oculta</span>}
                  </div>
                  <p className="mt-1 text-sm">{resena.comentario || <span className="text-slate-400">Sin comentario.</span>}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {resena.usuario_nombre} · Puesto #{resena.id_puesto} · {formatearFechaHora(resena.fecha_creacion)}
                  </p>
                  {resena.respuesta && (
                    <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800">
                      <strong>Respuesta del vendedor:</strong> {resena.respuesta}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-ghost shrink-0 py-1.5 text-xs text-rojo-600 dark:text-rojo-400"
                  onClick={() => setEliminar(resena)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </button>
              </article>
            ))}
          </div>
          <Paginacion pagina={pagina} total={resenas.data.count} tamano={TAMANO} onCambiar={setPagina} cargando={resenas.isFetching} />
        </>
      )}

      <ConfirmarModal
        abierto={Boolean(eliminar)}
        titulo="¿Eliminar esta reseña?"
        descripcion="La reseña desaparecerá del puesto y no se puede recuperar."
        textoConfirmar="Eliminar reseña"
        cargando={borrar.isPending}
        onConfirmar={() => eliminar && borrar.mutate(eliminar.id)}
        onCerrar={() => setEliminar(null)}
      />
    </div>
  );
}
