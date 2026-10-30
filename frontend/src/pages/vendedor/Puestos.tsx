import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Bike, MapPin, Pencil, Plus, Store, Tags, Trash2 } from 'lucide-react';
import {
  actualizarPuesto,
  asignarCategoriaPuesto,
  crearPuesto,
  eliminarPuesto,
  listarCategorias,
  listarPuestos,
  quitarCategoriaPuesto,
  type DatosPuesto,
} from '../../api/catalog';
import { miVerificacion } from '../../api/verification';
import { useSession } from '../../auth/SessionProvider';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { Campo, ErrorCampo } from '../../components/ui/Campos';
import { ConfirmarModal, Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { erroresDeCampo, mensajeDeError } from '../../lib/errors';
import type { Categoria, Puesto } from '../../lib/types';
import { cn } from '../../lib/utils';
import { claves } from '../../lib/queryKeys';
import { InterruptorWhatsapp } from './InterruptorWhatsapp';

const VACIO: DatosPuesto = {
  nombre: '',
  descripcion: '',
  direccion: '',
  latitud: '',
  longitud: '',
  horario: '',
  ofrece_domicilio: false,
};

export function Puestos() {
  const { usuario } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Puesto | null>(null);
  const [formulario, setFormulario] = useState<DatosPuesto>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [eliminar, setEliminar] = useState<Puesto | null>(null);
  const [categoriasDe, setCategoriasDe] = useState<Puesto | null>(null);

  useEffect(() => {
    document.title = 'Mis puestos · RioMarket';
  }, []);

  const verificacion = useQuery({ queryKey: claves.miVerificacion, queryFn: miVerificacion });
  const puestos = useQuery({
    queryKey: claves.puestos.vendedor(usuario?.id),
    queryFn: () => listarPuestos({ vendedor: usuario!.id, page_size: 100 }),
    enabled: Boolean(usuario),
  });
  const categorias = useQuery({ queryKey: claves.categorias, queryFn: listarCategorias });

  const verificado = verificacion.data?.estado_verificacion === 'aprobado';

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: claves.puestos.todos });
    void queryClient.invalidateQueries({ queryKey: claves.productos.todos });
  };

  const guardar = useMutation({
    mutationFn: () => (editando ? actualizarPuesto(editando.id, formulario) : crearPuesto(formulario)),
    onSuccess: () => {
      invalidar();
      setModal(false);
      setErrores({});
      toast.exito(editando ? 'Puesto actualizado.' : 'Puesto creado.');
    },
    onError: (error) => {
      const campos = erroresDeCampo(error);
      const nuevos: Record<string, string> = {};
      for (const [campo, mensajes] of Object.entries(campos)) nuevos[campo] = mensajes[0];
      setErrores(nuevos);
      toast.error(mensajeDeError(error, 'No pudimos guardar el puesto.'));
    },
  });

  const borrar = useMutation({
    mutationFn: (id: number) => eliminarPuesto(id),
    onSuccess: () => {
      invalidar();
      setEliminar(null);
      toast.exito('Puesto eliminado.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const cambiarCategoria = useMutation({
    mutationFn: ({ puestoId, categoriaId, asignar }: { puestoId: number; categoriaId: number; asignar: boolean }) =>
      asignar
        ? asignarCategoriaPuesto(puestoId, categoriaId)
        : quitarCategoriaPuesto(puestoId, categoriaId),
    onSuccess: (puesto) => {
      invalidar();
      setCategoriasDe(puesto);
      toast.exito('Categorías actualizadas.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const abrirNuevo = () => {
    setEditando(null);
    setFormulario(VACIO);
    setErrores({});
    setModal(true);
  };

  const abrirEditar = (puesto: Puesto) => {
    setEditando(puesto);
    setFormulario({
      nombre: puesto.nombre,
      descripcion: puesto.descripcion ?? '',
      direccion: puesto.direccion,
      latitud: puesto.latitud ?? '',
      longitud: puesto.longitud ?? '',
      horario: puesto.horario ?? '',
      ofrece_domicilio: puesto.ofrece_domicilio ?? false,
    });
    setErrores({});
    setModal(true);
  };

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const nuevos: Record<string, string> = {};
    if (formulario.nombre.trim().length < 3) nuevos.nombre = 'Escribe un nombre de al menos 3 caracteres.';
    if (formulario.direccion.trim().length < 5) nuevos.direccion = 'Escribe la dirección del puesto.';
    if (formulario.ofrece_domicilio) {
      if (!formulario.latitud) nuevos.latitud = 'La latitud es obligatoria si ofreces domicilio.';
      if (!formulario.longitud) nuevos.longitud = 'La longitud es obligatoria si ofreces domicilio.';
    }
    if (Object.keys(nuevos).length) {
      setErrores(nuevos);
      return;
    }
    guardar.mutate();
  };

  const categoriasAsignadas = (puesto: Puesto): Categoria[] => (puesto.categorias ?? []) as Categoria[];

  return (
    <div>
      <EncabezadoPagina
        titulo="Mis puestos"
        descripcion="Administra los lugares desde donde vendes y las categorías que ofreces."
        acciones={
          <button type="button" className="btn-primary" onClick={abrirNuevo} disabled={!verificado}>
            <Plus className="h-4 w-4" /> Nuevo puesto
          </button>
        }
      />

      {!verificacion.isLoading && !verificado && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 sm:flex-row sm:items-center">
          <BadgeCheck className="h-5 w-5 shrink-0" />
          <p className="flex-1">Necesitas la verificación aprobada para crear puestos. Mientras tanto puedes revisar los existentes.</p>
          <Link to="/vendedor/verificacion" className="btn-secondary shrink-0">Verificarme</Link>
        </div>
      )}

      {puestos.isLoading && <CargandoBloque mensaje="Cargando puestos…" />}
      {puestos.isError && <EstadoError mensaje="No pudimos cargar tus puestos." onReintentar={() => void puestos.refetch()} />}
      {puestos.data && puestos.data.results.length === 0 && (
        <EstadoVacio
          titulo="Aún no tienes puestos"
          descripcion="Crea tu primer puesto para empezar a publicar productos."
          icono={<Store className="h-9 w-9" />}
          accion={verificado ? <button type="button" className="btn-primary" onClick={abrirNuevo}>Crear puesto</button> : undefined}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {puestos.data?.results.map((puesto) => (
          <article key={puesto.id} className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-bold">{puesto.nombre}</h2>
                  <span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{puesto.estado}</span>
                </div>
                <p className="mt-1 flex items-start gap-1 text-sm text-slate-600 dark:text-slate-300">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {puesto.direccion}
                </p>
                {puesto.horario && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{puesto.horario}</p>}
                {puesto.ofrece_domicilio && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                    <Bike className="h-3.5 w-3.5" /> Ofrece domicilio
                  </p>
                )}
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                <Store className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {categoriasAsignadas(puesto).length === 0 ? (
                <span className="text-xs text-amber-700 dark:text-amber-400">Sin categorías asignadas</span>
              ) : (
                categoriasAsignadas(puesto).map((categoria) => (
                  <span key={categoria.id} className="badge bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200">{categoria.nombre}</span>
                ))
              )}
            </div>

            <InterruptorWhatsapp puesto={puesto} />

            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              <Link to={`/puestos/${puesto.id}`} className="btn-secondary py-1.5 text-xs">Ver público</Link>
              <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => abrirEditar(puesto)}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
              <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => setCategoriasDe(puesto)}>
                <Tags className="h-3.5 w-3.5" /> Categorías
              </button>
              <button type="button" className="btn-ghost py-1.5 text-xs text-rose-600 dark:text-rose-400" onClick={() => setEliminar(puesto)}>
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>

      <Modal abierto={modal} onCerrar={() => setModal(false)} titulo={editando ? 'Editar puesto' : 'Nuevo puesto'}>
        <form className="space-y-3" onSubmit={enviar} noValidate>
          <Campo etiqueta="Nombre del puesto" htmlFor="nombre-puesto" error={errores.nombre}>
            <input id="nombre-puesto" className="input" value={formulario.nombre} onChange={(evento) => setFormulario((valor) => ({ ...valor, nombre: evento.target.value }))} />
          </Campo>
          <Campo etiqueta="Descripción" htmlFor="descripcion-puesto" error={errores.descripcion}>
            <textarea id="descripcion-puesto" rows={3} className="input resize-y" value={formulario.descripcion ?? ''} onChange={(evento) => setFormulario((valor) => ({ ...valor, descripcion: evento.target.value }))} />
          </Campo>
          <Campo etiqueta="Dirección" htmlFor="direccion-puesto" error={errores.direccion}>
            <input id="direccion-puesto" className="input" value={formulario.direccion} onChange={(evento) => setFormulario((valor) => ({ ...valor, direccion: evento.target.value }))} />
          </Campo>
          <Campo etiqueta="Horario" htmlFor="horario-puesto" error={errores.horario} ayuda="Ej. Lunes a sábado, 7:00 a 18:00.">
            <input id="horario-puesto" className="input" value={formulario.horario ?? ''} onChange={(evento) => setFormulario((valor) => ({ ...valor, horario: evento.target.value }))} />
          </Campo>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded text-brand-600"
              checked={Boolean(formulario.ofrece_domicilio)}
              onChange={(evento) => setFormulario((valor) => ({ ...valor, ofrece_domicilio: evento.target.checked }))}
            />
            Ofrezco domicilio
          </label>
          {formulario.ofrece_domicilio && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Latitud" htmlFor="latitud" error={errores.latitud}>
                <input id="latitud" inputMode="decimal" className="input" value={formulario.latitud ?? ''} onChange={(evento) => setFormulario((valor) => ({ ...valor, latitud: evento.target.value }))} placeholder="10.4631" />
              </Campo>
              <Campo etiqueta="Longitud" htmlFor="longitud" error={errores.longitud}>
                <input id="longitud" inputMode="decimal" className="input" value={formulario.longitud ?? ''} onChange={(evento) => setFormulario((valor) => ({ ...valor, longitud: evento.target.value }))} placeholder="-73.2532" />
              </Campo>
            </div>
          )}
          <ErrorCampo mensaje={errores.__general} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear puesto'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal abierto={Boolean(categoriasDe)} onCerrar={() => setCategoriasDe(null)} titulo={`Categorías de ${categoriasDe?.nombre ?? ''}`}>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Un producto solo puede usar categorías asignadas a su puesto.
        </p>
        {categorias.isLoading && <CargandoBloque mensaje="Cargando categorías…" />}
        <div className="mt-4 max-h-80 space-y-1 overflow-y-auto">
          {categorias.data?.map((categoria) => {
            const asignada = categoriasDe ? categoriasAsignadas(categoriasDe).some((actual) => actual.id === categoria.id) : false;
            return (
              <label
                key={categoria.id}
                className={cn('flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm', asignada && 'bg-brand-50 dark:bg-brand-950/40')}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded text-brand-600"
                  checked={asignada}
                  disabled={cambiarCategoria.isPending}
                  onChange={(evento) => {
                    if (!categoriasDe) return;
                    cambiarCategoria.mutate({ puestoId: categoriasDe.id, categoriaId: categoria.id, asignar: evento.target.checked });
                  }}
                />
                {categoria.nombre}
              </label>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" className="btn-secondary" onClick={() => setCategoriasDe(null)}>Cerrar</button>
        </div>
      </Modal>

      <ConfirmarModal
        abierto={Boolean(eliminar)}
        titulo="¿Eliminar este puesto?"
        descripcion={eliminar ? `Se intentará eliminar "${eliminar.nombre}". Si tiene pedidos asociados, el servidor puede impedirlo.` : undefined}
        textoConfirmar="Eliminar puesto"
        cargando={borrar.isPending}
        onConfirmar={() => eliminar && borrar.mutate(eliminar.id)}
        onCerrar={() => setEliminar(null)}
      />
    </div>
  );
}
