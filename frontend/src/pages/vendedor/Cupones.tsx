import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Ticket, Trash2 } from 'lucide-react';
import { actualizarCupon, crearCupon, eliminarCupon, listarCupones, type DatosCupon } from '../../api/coupons';
import { listarPuestos } from '../../api/catalog';
import { miVerificacion } from '../../api/verification';
import { useSession } from '../../auth/SessionProvider';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { Campo, ErrorCampo } from '../../components/ui/Campos';
import { ConfirmarModal, Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { formatearFecha, formatearMoneda, hoyBogota } from '../../lib/format';
import { erroresDeCampo, mensajeDeError } from '../../lib/errors';
import type { Cupon } from '../../lib/types';
import { claves } from '../../lib/queryKeys';

const HOY = hoyBogota();

const VACIO: DatosCupon = {
  codigo: '',
  id_puesto: null,
  tipo_descuento: 'porcentaje',
  valor: '',
  monto_minimo_pedido: '',
  tope_descuento: '',
  usos_totales: null,
  usos_por_usuario: null,
  fecha_inicio: HOY,
  fecha_fin: HOY,
  activo: true,
};

export function Cupones() {
  const { usuario } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Cupon | null>(null);
  const [formulario, setFormulario] = useState<DatosCupon>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [eliminar, setEliminar] = useState<Cupon | null>(null);

  useEffect(() => {
    document.title = 'Cupones · RioMarket';
  }, []);

  const verificacion = useQuery({ queryKey: claves.miVerificacion, queryFn: miVerificacion });
  const puestos = useQuery({
    queryKey: claves.puestos.vendedor(usuario?.id),
    queryFn: () => listarPuestos({ vendedor: usuario!.id, page_size: 100 }),
    enabled: Boolean(usuario),
  });
  const cupones = useQuery({ queryKey: claves.cupones.vendedor, queryFn: () => listarCupones({ page_size: 100 }) });

  const verificado = verificacion.data?.estado_verificacion === 'aprobado';
  const puestosMios = puestos.data?.results ?? [];
  const mios = (cupones.data?.results ?? []).filter((cupon) => cupon.id_puesto && puestosMios.some((p) => p.id === cupon.id_puesto));

  const invalidar = () => void queryClient.invalidateQueries({ queryKey: claves.cupones.todos });

  const guardar = useMutation({
    mutationFn: () => (editando ? actualizarCupon(editando.id, formulario) : crearCupon(formulario)),
    onSuccess: () => {
      invalidar();
      setModal(false);
      setErrores({});
      toast.exito(editando ? 'Cupón actualizado.' : 'Cupón creado.');
    },
    onError: (error) => {
      const campos = erroresDeCampo(error);
      const nuevos: Record<string, string> = {};
      for (const [campo, mensajes] of Object.entries(campos)) nuevos[campo] = mensajes[0];
      setErrores(nuevos);
      toast.error(mensajeDeError(error, 'No pudimos guardar el cupón.'));
    },
  });

  const borrar = useMutation({
    mutationFn: (id: number) => eliminarCupon(id),
    onSuccess: () => {
      invalidar();
      setEliminar(null);
      toast.exito('Cupón eliminado.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const abrirNuevo = () => {
    setEditando(null);
    setFormulario({ ...VACIO, id_puesto: puestosMios[0]?.id ?? null });
    setErrores({});
    setModal(true);
  };

  const abrirEditar = (cupon: Cupon) => {
    setEditando(cupon);
    setFormulario({
      codigo: cupon.codigo,
      id_puesto: cupon.id_puesto ?? null,
      tipo_descuento: cupon.tipo_descuento,
      valor: cupon.valor,
      monto_minimo_pedido: cupon.monto_minimo_pedido ?? '',
      tope_descuento: cupon.tope_descuento ?? '',
      usos_totales: cupon.usos_totales ?? null,
      usos_por_usuario: cupon.usos_por_usuario ?? null,
      fecha_inicio: cupon.fecha_inicio?.slice(0, 10) ?? HOY,
      fecha_fin: cupon.fecha_fin?.slice(0, 10) ?? HOY,
      activo: cupon.activo ?? true,
    });
    setErrores({});
    setModal(true);
  };

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const nuevos: Record<string, string> = {};
    if (!formulario.codigo.trim()) nuevos.codigo = 'Escribe el código del cupón.';
    if (!formulario.id_puesto) nuevos.id_puesto = 'Selecciona un puesto.';
    if (!formulario.valor) nuevos.valor = 'Escribe el valor del descuento.';
    if (formulario.tipo_descuento === 'porcentaje') {
      const v = Number(formulario.valor);
      if (v < 1 || v > 100) nuevos.valor = 'El porcentaje debe estar entre 1 y 100.';
    }
    if (Object.keys(nuevos).length) {
      setErrores(nuevos);
      return;
    }
    guardar.mutate();
  };

  return (
    <div>
      <EncabezadoPagina
        titulo="Cupones"
        descripcion="Crea descuentos para tus puestos."
        acciones={
          <button type="button" className="btn-primary" onClick={abrirNuevo} disabled={!verificado || puestosMios.length === 0}>
            <Plus className="h-4 w-4" /> Nuevo cupón
          </button>
        }
      />

      {!verificado && <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">Necesitas verificación aprobada para crear cupones.</p>}
      {verificado && puestosMios.length === 0 && <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">Primero crea un puesto.</p>}

      {cupones.isLoading && <CargandoBloque mensaje="Cargando cupones…" />}
      {cupones.isError && <EstadoError mensaje="No pudimos cargar cupones." onReintentar={() => void cupones.refetch()} />}
      {mios.length === 0 && !cupones.isLoading && (
        <EstadoVacio titulo="Sin cupones" descripcion="Agrega descuentos para atraer más pedidos." icono={<Ticket className="h-9 w-9" />} accion={verificado && puestosMios.length ? <button type="button" className="btn-primary" onClick={abrirNuevo}>Crear cupón</button> : undefined} />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {mios.map((cupon) => (
          <article key={cupon.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-brand-600" />
                <p className="font-bold tracking-wider">{cupon.codigo}</p>
              </div>
              <span className={cupon.activo ? 'badge bg-emerald-100 text-emerald-800' : 'badge bg-slate-100 text-slate-600'}>{cupon.activo ? 'Activo' : 'Inactivo'}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {cupon.tipo_descuento === 'porcentaje' ? `${cupon.valor}%` : formatearMoneda(cupon.valor)}
              {cupon.monto_minimo_pedido && ` · Mín. ${formatearMoneda(cupon.monto_minimo_pedido)}`}
              {cupon.tope_descuento && ` · Tope ${formatearMoneda(cupon.tope_descuento)}`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {cupon.usos_totales ? `Usos totales: ${cupon.usos_totales}` : 'Usos ilimitados'} · {cupon.usos_por_usuario ? `Por usuario: ${cupon.usos_por_usuario}` : 'Por usuario ilimitado'}
            </p>
            {(cupon.fecha_inicio || cupon.fecha_fin) && <p className="mt-1 text-xs text-slate-500">Vigencia: {formatearFecha(cupon.fecha_inicio)} - {formatearFecha(cupon.fecha_fin)}</p>}
            <div className="mt-3 flex gap-1">
              <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => abrirEditar(cupon)}><Pencil className="h-3.5 w-3.5" /> Editar</button>
              <button type="button" className="btn-ghost py-1.5 text-xs text-rose-600" onClick={() => setEliminar(cupon)}><Trash2 className="h-3.5 w-3.5" /> Eliminar</button>
            </div>
          </article>
        ))}
      </div>

      <Modal abierto={modal} onCerrar={() => setModal(false)} titulo={editando ? 'Editar cupón' : 'Nuevo cupón'}>
        <form className="space-y-3" onSubmit={enviar} noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Código" htmlFor="codigo" error={errores.codigo}>
              <input id="codigo" className="input uppercase" value={formulario.codigo} onChange={(e) => setFormulario((v) => ({ ...v, codigo: e.target.value.toUpperCase() }))} placeholder="RIO10" />
            </Campo>
            <Campo etiqueta="Puesto" htmlFor="id_puesto" error={errores.id_puesto}>
              <select id="id_puesto" className="input" value={formulario.id_puesto ?? ''} onChange={(e) => setFormulario((v) => ({ ...v, id_puesto: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">Selecciona</option>
                {puestosMios.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </Campo>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Tipo de descuento" htmlFor="tipo">
              <select id="tipo" className="input" value={formulario.tipo_descuento} onChange={(e) => setFormulario((v) => ({ ...v, tipo_descuento: e.target.value as 'porcentaje' | 'monto' }))}>
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="monto">Monto fijo (COP)</option>
              </select>
            </Campo>
            <Campo etiqueta={formulario.tipo_descuento === 'porcentaje' ? 'Porcentaje' : 'Valor (COP)'} htmlFor="valor" error={errores.valor}>
              <input id="valor" inputMode="decimal" className="input" value={formulario.valor} onChange={(e) => setFormulario((v) => ({ ...v, valor: e.target.value }))} />
            </Campo>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Monto mínimo pedido" htmlFor="min"><input id="min" inputMode="decimal" className="input" value={formulario.monto_minimo_pedido ?? ''} onChange={(e) => setFormulario((v) => ({ ...v, monto_minimo_pedido: e.target.value }))} /></Campo>
            <Campo etiqueta="Tope descuento (porcentaje)" htmlFor="tope"><input id="tope" inputMode="decimal" className="input" value={formulario.tope_descuento ?? ''} onChange={(e) => setFormulario((v) => ({ ...v, tope_descuento: e.target.value || null }))} /></Campo>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Fecha inicio" htmlFor="inicio"><input id="inicio" type="date" className="input" value={formulario.fecha_inicio ?? ''} onChange={(e) => setFormulario((v) => ({ ...v, fecha_inicio: e.target.value }))} /></Campo>
            <Campo etiqueta="Fecha fin" htmlFor="fin"><input id="fin" type="date" className="input" value={formulario.fecha_fin ?? ''} onChange={(e) => setFormulario((v) => ({ ...v, fecha_fin: e.target.value }))} /></Campo>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Usos totales (vacío = ilimitado)" htmlFor="ut"><input id="ut" type="number" min={0} className="input" value={formulario.usos_totales ?? ''} onChange={(e) => setFormulario((v) => ({ ...v, usos_totales: e.target.value === '' ? null : Number(e.target.value) }))} /></Campo>
            <Campo etiqueta="Usos por usuario (vacío = ilimitado)" htmlFor="upu"><input id="upu" type="number" min={0} className="input" value={formulario.usos_por_usuario ?? ''} onChange={(e) => setFormulario((v) => ({ ...v, usos_por_usuario: e.target.value === '' ? null : Number(e.target.value) }))} /></Campo>
          </div>
          {editando && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded text-brand-600" checked={Boolean(formulario.activo)} onChange={(e) => setFormulario((v) => ({ ...v, activo: e.target.checked }))} />
              Cupón activo
            </label>
          )}
          <ErrorCampo mensaje={errores.__general} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardar.isPending}>{guardar.isPending ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmarModal abierto={Boolean(eliminar)} titulo="¿Eliminar cupón?" descripcion={eliminar ? `Se eliminará ${eliminar.codigo}.` : undefined} textoConfirmar="Eliminar" cargando={borrar.isPending} onConfirmar={() => eliminar && borrar.mutate(eliminar.id)} onCerrar={() => setEliminar(null)} />
    </div>
  );
}
