import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { crearResena } from '../../api/reviews';
import { useToast } from '../../components/ui/Toast';
import { Estrellas } from '../../components/ui/Estrellas';
import { Campo, ErrorCampo } from '../../components/ui/Campos';
import { erroresDeCampo, mensajeDeError } from '../../lib/errors';
import { claves } from '../../lib/queryKeys';
import type { Pedido, Resena } from '../../lib/types';

interface Props {
  datos: Pedido;
  /** Reseña que el comprador ya dejó para este pedido, si existe. */
  resenaPropia?: Resena;
}

/** Reseña del puesto tras la entrega: muestra la ya publicada o el formulario para dejarla. */
export function ResenaPedido({ datos, resenaPropia }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [errorResena, setErrorResena] = useState('');

  const resenar = useMutation({
    mutationFn: () =>
      crearResena({
        id_puesto: datos.id_puesto,
        id_pedido: datos.id,
        calificacion,
        comentario: comentario.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: claves.resenas.todos });
      setComentario('');
      setErrorResena('');
      toast.exito('¡Gracias por tu reseña!');
    },
    onError: (error) => {
      const campos = erroresDeCampo(error);
      setErrorResena(campos.__general?.[0] ?? campos.calificacion?.[0] ?? mensajeDeError(error));
    },
  });

  return (
    <section className="card p-5">
      <h2 className="text-lg font-bold">Reseña del puesto</h2>
      {resenaPropia ? (
        <div className="mt-2 text-sm">
          <Estrellas valor={resenaPropia.calificacion} />
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            {resenaPropia.comentario || 'Sin comentario.'}
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">¿Cómo fue tu experiencia?</p>
          <div className="mt-2">
            <Estrellas valor={calificacion} interactivo onCambiar={setCalificacion} tamano="h-7 w-7" />
          </div>
          <Campo etiqueta="Comentario (opcional)" htmlFor="comentario" className="mt-3">
            <textarea
              id="comentario"
              rows={3}
              className="input resize-y"
              value={comentario}
              onChange={(evento) => setComentario(evento.target.value)}
              placeholder="Cuéntanos qué tal estuvo el producto y la atención."
            />
          </Campo>
          <ErrorCampo mensaje={errorResena} />
          <button
            type="button"
            className="btn-primary mt-3"
            onClick={() => resenar.mutate()}
            disabled={resenar.isPending}
          >
            {resenar.isPending ? 'Enviando…' : 'Publicar reseña'}
          </button>
        </div>
      )}
    </section>
  );
}
