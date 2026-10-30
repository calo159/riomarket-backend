import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileSearch, ShieldCheck, XCircle } from 'lucide-react';
import { decidirSolicitud, listarSolicitudes, obtenerFotoCedula } from '../../api/verification';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio, Spinner } from '../../components/ui/Estado';
import { ConfirmarModal, Modal } from '../../components/ui/Modal';
import { Campo } from '../../components/ui/Campos';
import { useToast } from '../../components/ui/Toast';
import { formatearFechaHora, ETIQUETAS_VERIFICACION } from '../../lib/format';
import { mensajeDeError } from '../../lib/errors';
import { invalidarMenu } from '../../navigation/useMenu';
import { claves } from '../../lib/queryKeys';

export function Verificaciones() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filtro, setFiltro] = useState('pendiente');
  const [rechazar, setRechazar] = useState<number | null>(null);
  const [aprobar, setAprobar] = useState<{ id: number; nombre: string } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [cedula, setCedula] = useState<{ id: number; nombre: string } | null>(null);
  const [urlCedula, setUrlCedula] = useState<string | null>(null);
  const [errorCedula, setErrorCedula] = useState('');

  useEffect(() => {
    document.title = 'Verificaciones · Administración · RioMarket';
  }, []);

  // La foto de la cédula es privada: se pide con la sesión y se muestra desde un blob local.
  useEffect(() => {
    if (!cedula) return;
    let activo = true;
    let url: string | null = null;
    setUrlCedula(null);
    setErrorCedula('');
    obtenerFotoCedula(cedula.id)
      .then((blob) => {
        if (!activo) return;
        url = URL.createObjectURL(blob);
        setUrlCedula(url);
      })
      .catch((error) => activo && setErrorCedula(mensajeDeError(error, 'No pudimos cargar la foto.')));
    return () => {
      activo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [cedula]);

  const solicitudes = useQuery({ queryKey: claves.solicitudes.lista(filtro), queryFn: () => listarSolicitudes(filtro || undefined) });

  const decidir = useMutation({
    mutationFn: ({ id, estado, motivo_rechazo }: { id: number; estado: 'aprobado' | 'rechazado'; motivo_rechazo?: string }) =>
      decidirSolicitud(id, { estado, motivo_rechazo }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: claves.solicitudes.todos });
      void queryClient.invalidateQueries({ queryKey: claves.miVerificacion });
      void invalidarMenu(queryClient);
      setRechazar(null);
      setAprobar(null);
      setMotivo('');
      toast.exito(variables.estado === 'aprobado' ? 'Verificación aprobada.' : 'Verificación rechazada.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const filas = solicitudes.data?.results ?? [];

  return (
    <div>
      <EncabezadoPagina
        titulo="Verificaciones"
        descripcion="Revisa la cédula de cada solicitud y aprueba o rechaza al vendedor."
        acciones={
          <select
            className="input w-auto"
            value={filtro}
            onChange={(evento) => setFiltro(evento.target.value)}
            aria-label="Filtrar por estado de la solicitud"
          >
            <option value="">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobado">Aprobadas</option>
            <option value="rechazado">Rechazadas</option>
          </select>
        }
      />
      {solicitudes.isLoading && <CargandoBloque mensaje="Cargando solicitudes…" />}
      {solicitudes.isError && <EstadoError mensaje="No pudimos cargar solicitudes." onReintentar={() => void solicitudes.refetch()} />}
      {solicitudes.data && filas.length === 0 && (
        <EstadoVacio titulo="Sin solicitudes" descripcion="No hay solicitudes con ese estado." icono={<ShieldCheck className="h-9 w-9" />} />
      )}
      {filas.length > 0 && (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="p-3">Vendedor</th>
                <th className="p-3">Correo</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Solicitud</th>
                <th className="p-3">Revisión</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((sol) => (
                <tr key={sol.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{sol.nombre_usuario}</td>
                  <td className="p-3">{sol.correo_usuario}</td>
                  <td className="p-3">{ETIQUETAS_VERIFICACION[sol.estado_verificacion] ?? sol.estado_verificacion}</td>
                  <td className="p-3 text-xs text-slate-500">{formatearFechaHora(sol.fecha_solicitud)}</td>
                  <td className="p-3 text-xs text-slate-500">{sol.fecha_revision ? formatearFechaHora(sol.fecha_revision) : '—'}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="btn-ghost p-2"
                        onClick={() => setCedula({ id: sol.id, nombre: sol.nombre_usuario })}
                        title="Ver cédula"
                        aria-label={`Ver la cédula de ${sol.nombre_usuario}`}
                      >
                        <FileSearch className="h-4 w-4" />
                      </button>
                      {sol.estado_verificacion === 'pendiente' && (
                        <>
                          <button
                            type="button"
                            className="btn-ghost p-2 text-emerald-600"
                            onClick={() => setAprobar({ id: sol.id, nombre: sol.nombre_usuario })}
                            title="Aprobar"
                            aria-label={`Aprobar a ${sol.nombre_usuario}`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost p-2 text-rose-600"
                            onClick={() => setRechazar(sol.id)}
                            title="Rechazar"
                            aria-label={`Rechazar a ${sol.nombre_usuario}`}
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal abierto={cedula !== null} onCerrar={() => setCedula(null)} titulo={`Cédula de ${cedula?.nombre ?? ''}`} ancho="max-w-2xl">
        {errorCedula && <p className="field-error" role="alert">{errorCedula}</p>}
        {!errorCedula && !urlCedula && (
          <div className="flex justify-center py-10"><Spinner className="h-6 w-6" /></div>
        )}
        {urlCedula && <img src={urlCedula} alt={`Foto de la cédula de ${cedula?.nombre ?? ''}`} className="max-h-[70vh] w-full rounded-xl object-contain" />}
        <p className="mt-3 text-xs text-slate-500">Documento privado: no lo compartas ni lo descargues fuera de la revisión.</p>
      </Modal>

      <ConfirmarModal
        abierto={aprobar !== null}
        titulo={`¿Aprobar a ${aprobar?.nombre ?? ''}?`}
        descripcion="Podrá crear puestos, publicar productos y operar sus pedidos. Confirma que revisaste su cédula."
        textoConfirmar="Aprobar"
        peligro={false}
        cargando={decidir.isPending}
        onConfirmar={() => aprobar && decidir.mutate({ id: aprobar.id, estado: 'aprobado' })}
        onCerrar={() => setAprobar(null)}
      />

      <Modal abierto={Boolean(rechazar)} onCerrar={() => setRechazar(null)} titulo="Rechazar verificación">
        <Campo etiqueta="Motivo del rechazo" htmlFor="motivo">
          <textarea id="motivo" rows={3} className="input" value={motivo} onChange={(evento) => setMotivo(evento.target.value)} />
        </Campo>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setRechazar(null)}>Cancelar</button>
          <button type="button" className="btn-primary" disabled={!motivo.trim() || decidir.isPending} onClick={() => rechazar && decidir.mutate({ id: rechazar, estado: 'rechazado', motivo_rechazo: motivo.trim() })}>Rechazar</button>
        </div>
      </Modal>
    </div>
  );
}
