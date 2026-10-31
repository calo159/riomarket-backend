import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import {
  actualizarDireccion,
  crearDireccion,
  eliminarDireccion,
  listarDirecciones,
  predeterminarDireccion,
  type DatosDireccion,
} from '../api/addresses';
import { EncabezadoPagina } from '../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../components/ui/Estado';
import { Campo, ErrorCampo } from '../components/ui/Campos';
import { ConfirmarModal, Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { erroresDeCampo, mensajeDeError } from '../lib/errors';
import type { Direccion } from '../lib/types';
import { claves } from '../lib/queryKeys';

const VACIO: DatosDireccion = {
  alias: '',
  direccion: '',
  referencia: '',
  es_predeterminada: false,
};

export function Direcciones() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Direccion | null>(null);
  const [formulario, setFormulario] = useState<DatosDireccion>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [eliminar, setEliminar] = useState<Direccion | null>(null);

  useEffect(() => {
    document.title = 'Mis direcciones · RioMarket';
  }, []);

  const direcciones = useQuery({ queryKey: claves.direcciones, queryFn: listarDirecciones });

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: claves.direcciones });
  };

  const guardar = useMutation({
    mutationFn: () =>
      editando ? actualizarDireccion(editando.id, formulario) : crearDireccion(formulario),
    onSuccess: () => {
      invalidar();
      setModalAbierto(false);
      setErrores({});
      toast.exito(editando ? 'Dirección actualizada.' : 'Dirección guardada.');
    },
    onError: (error) => {
      const campos = erroresDeCampo(error);
      const nuevos: Record<string, string> = {};
      for (const [campo, mensajes] of Object.entries(campos)) nuevos[campo] = mensajes[0];
      setErrores(nuevos);
      toast.error(mensajeDeError(error, 'No pudimos guardar la dirección.'));
    },
  });

  const borrar = useMutation({
    mutationFn: (id: number) => eliminarDireccion(id),
    onSuccess: () => {
      invalidar();
      setEliminar(null);
      toast.exito('Dirección eliminada.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const predeterminar = useMutation({
    mutationFn: (id: number) => predeterminarDireccion(id),
    onSuccess: () => {
      invalidar();
      toast.exito('Dirección predeterminada actualizada.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const abrirNueva = () => {
    setEditando(null);
    setFormulario(VACIO);
    setErrores({});
    setModalAbierto(true);
  };

  const abrirEditar = (direccion: Direccion) => {
    setEditando(direccion);
    setFormulario({
      alias: direccion.alias,
      direccion: direccion.direccion,
      referencia: direccion.referencia ?? '',
      latitud: direccion.latitud ?? null,
      longitud: direccion.longitud ?? null,
      es_predeterminada: direccion.es_predeterminada ?? false,
      activa: direccion.activa ?? true,
    });
    setErrores({});
    setModalAbierto(true);
  };

  const enviar = () => {
    const nuevos: Record<string, string> = {};
    if (!formulario.alias.trim()) nuevos.alias = 'Ponle un nombre a la dirección.';
    if (!formulario.direccion.trim()) nuevos.direccion = 'Escribe la dirección.';
    if (Object.keys(nuevos).length) {
      setErrores(nuevos);
      return;
    }
    guardar.mutate();
  };

  return (
    <div className="mx-auto max-w-4xl px-3 py-5 sm:px-5">
      <EncabezadoPagina
        titulo="Mis direcciones"
        descripcion="Guarda tus lugares frecuentes para agilizar tus pedidos."
        acciones={
          <button type="button" className="btn-primary" onClick={abrirNueva}>
            <Plus className="h-4 w-4" /> Nueva dirección
          </button>
        }
      />

      {direcciones.isLoading && <CargandoBloque mensaje="Cargando direcciones…" />}
      {direcciones.isError && <EstadoError mensaje="No pudimos cargar tus direcciones." onReintentar={() => void direcciones.refetch()} />}
      {direcciones.data && direcciones.data.length === 0 && (
        <EstadoVacio
          titulo="Aún no tienes direcciones"
          descripcion="Agrega tu casa o trabajo para pedir a domicilio más rápido."
          icono={<MapPin className="h-9 w-9" />}
          accion={<button type="button" className="btn-primary" onClick={abrirNueva}>Agregar dirección</button>}
        />
      )}
      {direcciones.data && direcciones.data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {direcciones.data.map((direccion) => (
            <article key={direccion.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 font-semibold">
                    {direccion.alias}
                    {direccion.es_predeterminada && (
                      <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200">Predeterminada</span>
                    )}
                  </h2>
                  <p className="mt-1 flex items-start gap-1 text-sm text-slate-600 dark:text-slate-300">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {direccion.direccion}
                  </p>
                  {direccion.referencia && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{direccion.referencia}</p>}
                </div>
                {direccion.es_predeterminada && <Star className="h-5 w-5 shrink-0 fill-amber-400 text-amber-400" />}
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {!direccion.es_predeterminada && (
                  <button
                    type="button"
                    className="btn-secondary py-1.5 text-xs"
                    onClick={() => predeterminar.mutate(direccion.id)}
                    disabled={predeterminar.isPending}
                  >
                    Hacer predeterminada
                  </button>
                )}
                <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => abrirEditar(direccion)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                <button type="button" className="btn-ghost py-1.5 text-xs text-rose-600 dark:text-rose-400" onClick={() => setEliminar(direccion)}>
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo={editando ? 'Editar dirección' : 'Nueva dirección'}
      >
        <div className="entra-lista space-y-3">
          <Campo etiqueta="Nombre corto" htmlFor="alias" error={errores.alias} ayuda="Ej. Casa, Trabajo, Casa de mamá.">
            <input
              id="alias"
              className="input"
              value={formulario.alias}
              onChange={(evento) => setFormulario((valor) => ({ ...valor, alias: evento.target.value }))}
              placeholder="Casa"
            />
          </Campo>
          <Campo etiqueta="Dirección" htmlFor="direccion" error={errores.direccion}>
            <input
              id="direccion"
              className="input"
              value={formulario.direccion}
              onChange={(evento) => setFormulario((valor) => ({ ...valor, direccion: evento.target.value }))}
              placeholder="Calle 15 #8-32, barrio Centro"
            />
          </Campo>
          <Campo etiqueta="Referencia" htmlFor="referencia" error={errores.referencia}>
            <input
              id="referencia"
              className="input"
              value={formulario.referencia ?? ''}
              onChange={(evento) => setFormulario((valor) => ({ ...valor, referencia: evento.target.value }))}
              placeholder="Color de la casa, portón, punto de referencia"
            />
          </Campo>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded text-brand-600"
              checked={Boolean(formulario.es_predeterminada)}
              onChange={(evento) => setFormulario((valor) => ({ ...valor, es_predeterminada: evento.target.checked }))}
            />
            Usar como dirección predeterminada
          </label>
          <ErrorCampo mensaje={errores.__general} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setModalAbierto(false)}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={enviar} disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : 'Guardar dirección'}
          </button>
        </div>
      </Modal>

      <ConfirmarModal
        abierto={Boolean(eliminar)}
        titulo="¿Eliminar esta dirección?"
        descripcion={eliminar ? `Se eliminará "${eliminar.alias}". Los pedidos anteriores conservan su dirección.` : undefined}
        textoConfirmar="Eliminar"
        cargando={borrar.isPending}
        onConfirmar={() => eliminar && borrar.mutate(eliminar.id)}
        onCerrar={() => setEliminar(null)}
      />
    </div>
  );
}
