import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareReply, Star } from 'lucide-react';
import { listarResenas, responderResena } from '../../api/reviews';
import { useSession } from '../../auth/SessionProvider';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError } from '../../components/ui/Estado';
import { Estrellas } from '../../components/ui/Estrellas';
import { useToast } from '../../components/ui/Toast';
import { formatearFechaHora } from '../../lib/format';
import { mensajeDeError } from '../../lib/errors';

export function ResenasVendedor() {
  const { usuario } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [abierto, setAbierto] = useState<number | null>(null);
  const [respuesta, setRespuesta] = useState('');

  const resenas = useQuery({
    queryKey: ['resenas', 'vendedor', usuario?.id],
    queryFn: () => listarResenas({ vendedor: usuario!.id, page_size: 100 }),
    enabled: Boolean(usuario),
  });

  const responder = useMutation({
    mutationFn: ({ id, texto }: { id: number; texto: string }) => responderResena(id, texto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resenas'] });
      setAbierto(null);
      setRespuesta('');
      toast.exito('Respuesta publicada.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const enviar = (id: number) => {
    if (respuesta.trim().length < 3) {
      toast.error('Escribe una respuesta de al menos 3 caracteres.');
      return;
    }
    responder.mutate({ id, texto: respuesta.trim() });
  };

  return (
    <div>
      <EncabezadoPagina titulo="Reseñas" descripcion="Calificaciones y comentarios de tus clientes." />
      {resenas.isLoading && <CargandoBloque mensaje="Cargando reseñas…" />}
      {resenas.isError && <EstadoError mensaje="No pudimos cargar reseñas." onReintentar={() => void resenas.refetch()} />}
      <div className="space-y-3">
        {(resenas.data?.results ?? []).map((resena) => (
          <article key={resena.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{resena.usuario_nombre}</p>
                <Estrellas valor={resena.calificacion} />
              </div>
              <p className="text-xs text-slate-500">{formatearFechaHora(resena.fecha_creacion)}</p>
            </div>
            {resena.comentario && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{resena.comentario}</p>}
            {resena.respuesta ? (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                <p className="font-medium">Respuesta del vendedor</p>
                <p className="mt-1 whitespace-pre-line">{resena.respuesta}</p>
                <p className="mt-1 text-xs text-slate-500">{formatearFechaHora(resena.fecha_respuesta)}</p>
              </div>
            ) : (
              <div className="mt-3">
                {abierto === resena.id ? (
                  <div className="space-y-2">
                    <textarea
                      className="input min-h-[90px]"
                      placeholder="Gracias por tu compra, te esperamos de nuevo..."
                      value={respuesta}
                      onChange={(e) => setRespuesta(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button type="button" className="btn-primary" disabled={responder.isPending} onClick={() => enviar(resena.id)}>
                        {responder.isPending ? 'Enviando...' : 'Publicar respuesta'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setAbierto(null);
                          setRespuesta('');
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="btn-ghost text-sm" onClick={() => setAbierto(resena.id)}>
                    <MessageSquareReply className="h-4 w-4" /> Responder
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
        {(resenas.data?.results.length ?? 0) === 0 && !resenas.isLoading && (
          <div className="flex flex-col items-center py-10 text-center text-slate-500">
            <Star className="h-9 w-9" />
            <p className="mt-2 font-medium">Aún no hay reseñas</p>
          </div>
        )}
      </div>
    </div>
  );
}
