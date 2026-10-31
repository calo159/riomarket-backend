import { EtiquetaEstado } from '../../components/ui/EtiquetaEstado';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { listarPedidos } from '../../api/orders';
import {
  actualizarProducto,
  crearProducto,
  eliminarImagenProducto,
  eliminarProducto,
  listarProductos,
  listarPuestos,
  subirImagenProducto,
  type DatosProducto,
} from '../../api/catalog';
import { miVerificacion } from '../../api/verification';
import { useSession } from '../../auth/SessionProvider';
import { Imagen } from '../../components/Imagen';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { Campo, ErrorCampo } from '../../components/ui/Campos';
import { ConfirmarModal, Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { formatearMoneda } from '../../lib/format';
import { erroresDeCampo, mensajeDeError } from '../../lib/errors';
import { validarImagen } from '../../lib/utils';
import type { Categoria, Producto, Puesto } from '../../lib/types';
import { claves } from '../../lib/queryKeys';
import { MAX_DETALLES, etiquetaDeDetalles, formatearPreparacion } from '../../lib/encargos';

const MAX_ETIQUETA = 80;
const MAX_HORAS_PREPARACION = 336;

const VACIO: DatosProducto = {
  id_puesto: 0,
  id_categoria: 0,
  nombre: '',
  descripcion: '',
  precio: '',
  stock: 0,
  unidad_medida: 'unidad',
  estado: 'activo',
  modalidad: 'stock',
  preparacion_horas: null,
  pide_detalles: false,
  etiqueta_detalles: '',
};

type UnidadPreparacion = 'horas' | 'dias';

/** Cómo mostrar al editar las horas guardadas: en días si son múltiplos de 24 desde 48 h. */
function preparacionParaEditar(horas: number | null | undefined): { valor: string; unidad: UnidadPreparacion } {
  if (!horas) return { valor: '', unidad: 'horas' };
  if (horas >= 48 && horas % 24 === 0) return { valor: String(horas / 24), unidad: 'dias' };
  return { valor: String(horas), unidad: 'horas' };
}

export function ProductosVendedor() {
  const { usuario } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [imagenes, setImagenes] = useState<Producto | null>(null);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [formulario, setFormulario] = useState<DatosProducto>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [eliminar, setEliminar] = useState<Producto | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [prepValor, setPrepValor] = useState('');
  const [prepUnidad, setPrepUnidad] = useState<UnidadPreparacion>('horas');

  useEffect(() => {
    document.title = 'Productos · RioMarket';
  }, []);

  const verificacion = useQuery({ queryKey: claves.miVerificacion, queryFn: miVerificacion });
  const puestos = useQuery({ queryKey: claves.puestos.vendedor(usuario?.id), queryFn: () => listarPuestos({ vendedor: usuario!.id, page_size: 100 }), enabled: Boolean(usuario) });
  const productos = useQuery({ queryKey: claves.productos.vendedor, queryFn: () => listarProductos({ page_size: 100 }) });

  const verificado = verificacion.data?.estado_verificacion === 'aprobado';
  const puestoPorId = useMemo(() => new Map((puestos.data?.results ?? []).map((puesto) => [puesto.id, puesto])), [puestos.data]);
  const mios = useMemo(() => (productos.data?.results ?? []).filter((producto) => puestoPorId.has(producto.id_puesto)), [productos.data, puestoPorId]);

  // Cuántos pedidos sin terminar incluyen el producto que se edita (para avisar que no cambian).
  const pedidosAbiertos = useQuery({
    queryKey: ['pedidos', 'abiertos-del-producto', editando?.id] as const,
    queryFn: () => listarPedidos({ producto: editando!.id, abiertos: true, page_size: 1 }),
    enabled: modal && Boolean(editando),
  });
  const abiertos = pedidosAbiertos.data?.count ?? 0;

  const esEncargoForm = formulario.modalidad === 'encargo';
  const horasPreparacion = Math.round(Number(prepValor) * (prepUnidad === 'dias' ? 24 : 1));

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: claves.productos.todos });
  };

  const guardar = useMutation({
    mutationFn: () => {
      const datos: DatosProducto = esEncargoForm
        ? {
            ...formulario,
            stock: 0,
            preparacion_horas: horasPreparacion,
            etiqueta_detalles: formulario.pide_detalles ? (formulario.etiqueta_detalles ?? '').trim() : '',
          }
        : { ...formulario, modalidad: 'stock', preparacion_horas: null, pide_detalles: false, etiqueta_detalles: '' };
      return editando ? actualizarProducto(editando.id, datos) : crearProducto(datos);
    },
    onSuccess: () => {
      invalidar();
      setModal(false);
      setErrores({});
      toast.exito(editando ? 'Producto actualizado.' : 'Producto creado.');
    },
    onError: (error) => {
      const campos = erroresDeCampo(error);
      const nuevos: Record<string, string> = {};
      for (const [campo, mensajes] of Object.entries(campos)) nuevos[campo] = mensajes[0];
      setErrores(nuevos);
      toast.error(mensajeDeError(error, 'No pudimos guardar el producto.'));
    },
  });

  const borrar = useMutation({
    mutationFn: (id: number) => eliminarProducto(id),
    onSuccess: () => {
      invalidar();
      setEliminar(null);
      toast.exito('Producto eliminado.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const subir = useMutation({
    mutationFn: () => subirImagenProducto(imagenes!.id, archivo!),
    onSuccess: (imagen) => {
      invalidar();
      setArchivo(null);
      setImagenes((anterior) => (anterior ? { ...anterior, imagenes: [...(anterior.imagenes ?? []), imagen] } : anterior));
      toast.exito('Imagen subida.');
    },
    onError: (error) => toast.error(mensajeDeError(error, 'No pudimos subir la imagen.')),
  });

  const quitarImg = useMutation({
    mutationFn: (id: number) => eliminarImagenProducto(id),
    onSuccess: (_, id) => {
      invalidar();
      setImagenes((anterior) => (anterior ? { ...anterior, imagenes: (anterior.imagenes ?? []).filter((img) => img.id !== id) } : anterior));
      toast.exito('Imagen eliminada.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const abrirNuevo = () => {
    if (puestos.data?.results.length === 0) return;
    setEditando(null);
    setFormulario({ ...VACIO, id_puesto: puestos.data!.results[0].id });
    setPrepValor('');
    setPrepUnidad('horas');
    setErrores({});
    setModal(true);
  };

  const abrirEditar = (producto: Producto) => {
    setEditando(producto);
    setFormulario({
      id_puesto: producto.id_puesto,
      id_categoria: producto.id_categoria,
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? '',
      precio: producto.precio,
      stock: producto.stock ?? 0,
      unidad_medida: producto.unidad_medida ?? 'unidad',
      estado: producto.estado ?? 'activo',
      modalidad: producto.modalidad ?? 'stock',
      preparacion_horas: producto.preparacion_horas ?? null,
      pide_detalles: producto.pide_detalles ?? false,
      etiqueta_detalles: producto.etiqueta_detalles ?? '',
    });
    const prep = preparacionParaEditar(producto.preparacion_horas);
    setPrepValor(prep.valor);
    setPrepUnidad(prep.unidad);
    setErrores({});
    setModal(true);
  };

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const nuevos: Record<string, string> = {};
    if (!formulario.id_puesto) nuevos.id_puesto = 'Selecciona un puesto.';
    if (!formulario.id_categoria) nuevos.id_categoria = 'Selecciona una categoría.';
    if (formulario.nombre.trim().length < 3) nuevos.nombre = 'Escribe el nombre del producto.';
    if (Number(formulario.precio) <= 0) nuevos.precio = 'El precio debe ser mayor a 0.';
    if (!esEncargoForm && Number(formulario.stock) < 0) nuevos.stock = 'El stock no puede ser negativo.';
    if (esEncargoForm && !(horasPreparacion >= 1 && horasPreparacion <= MAX_HORAS_PREPARACION)) {
      nuevos.preparacion_horas = 'Indica cuánto tardas en prepararlo: de 1 hora a 14 días.';
    }
    if (esEncargoForm && (formulario.etiqueta_detalles ?? '').length > MAX_ETIQUETA) {
      nuevos.etiqueta_detalles = `Máximo ${MAX_ETIQUETA} caracteres.`;
    }
    if (Object.keys(nuevos).length) {
      setErrores(nuevos);
      return;
    }
    guardar.mutate();
  };

  const categoriasDelPuesto = useMemo(() => {
    if (!formulario.id_puesto) return [];
    return categoriasAsignadas(puestoPorId.get(formulario.id_puesto));
  }, [formulario.id_puesto, puestoPorId]);

  function categoriasAsignadas(puesto?: Puesto): Categoria[] {
    return (puesto?.categorias ?? []) as Categoria[];
  }

  return (
    <div>
      <EncabezadoPagina
        titulo="Productos"
        descripcion="Publica, edita y administra las imágenes de tus productos."
        acciones={<button type="button" className="btn-primary" onClick={abrirNuevo} disabled={!verificado || (puestos.data?.results.length ?? 0) === 0}><Plus className="h-4 w-4" /> Nuevo producto</button>}
      />

      {!verificado && <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">Necesitas verificación aprobada para crear productos.</p>}
      {verificado && (puestos.data?.results.length ?? 0) === 0 && <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">Primero crea un puesto y asígnale categorías.</p>}

      {productos.isLoading && <CargandoBloque mensaje="Cargando productos…" />}
      {productos.isError && <EstadoError mensaje="No pudimos cargar productos." onReintentar={() => void productos.refetch()} />}
      {mios.length === 0 && !productos.isLoading && (
        <EstadoVacio titulo="Sin productos" descripcion="Agrega tu primer producto al catálogo del puesto." icono={<ImagePlus className="h-9 w-9" />} accion={verificado && puestos.data?.results.length ? <button type="button" className="btn-primary" onClick={abrirNuevo}>Crear producto</button> : undefined} />
      )}

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500 dark:text-slate-400">
              <th className="p-3">Producto</th>
              <th className="p-3">Puesto</th>
              <th className="p-3">Precio</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mios.map((producto) => (
              <tr key={producto.id} className="border-b last:border-0">
                <td className="p-3">
                  <p className="font-medium">{producto.nombre}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{producto.unidad_medida}</p>
                </td>
                <td className="p-3">{puestoPorId.get(producto.id_puesto)?.nombre ?? '—'}</td>
                <td className="p-3 font-semibold">{formatearMoneda(producto.precio)}</td>
                <td className="p-3">
                  {producto.modalidad === 'encargo' ? (
                    <>
                      <span className="font-medium">Por encargo</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {producto.preparacion_horas ? `Listo en ${formatearPreparacion(producto.preparacion_horas)}` : ''}
                      </span>
                    </>
                  ) : (
                    producto.stock
                  )}
                </td>
                <td className="p-3"><EtiquetaEstado estado={producto.estado} /></td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button type="button" className="btn-ghost p-2" onClick={() => setImagenes(producto)} title="Imágenes"><ImagePlus className="h-4 w-4" /></button>
                    <button type="button" className="btn-ghost p-2" onClick={() => abrirEditar(producto)} title="Editar"><Pencil className="h-4 w-4" /></button>
                    <button type="button" className="btn-ghost p-2 text-rose-600" onClick={() => setEliminar(producto)} title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal abierto={modal} onCerrar={() => setModal(false)} titulo={editando ? 'Editar producto' : 'Nuevo producto'}>
        <form className="space-y-3" onSubmit={enviar} noValidate>
          <Campo etiqueta="Puesto" htmlFor="id_puesto" error={errores.id_puesto}>
            <select id="id_puesto" className="input" value={formulario.id_puesto || ''} onChange={(evento) => setFormulario((valor) => ({ ...valor, id_puesto: Number(evento.target.value), id_categoria: 0 }))}>
              <option value="">Selecciona</option>
              {puestos.data?.results.map((puesto) => <option key={puesto.id} value={puesto.id}>{puesto.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Categoría" htmlFor="id_categoria" error={errores.id_categoria}>
            <select id="id_categoria" className="input" value={formulario.id_categoria || ''} onChange={(evento) => setFormulario((valor) => ({ ...valor, id_categoria: Number(evento.target.value) }))}>
              <option value="">Selecciona</option>
              {categoriasDelPuesto.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
            </select>
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Nombre" htmlFor="nombre" error={errores.nombre}><input id="nombre" className="input" value={formulario.nombre} onChange={(evento) => setFormulario((valor) => ({ ...valor, nombre: evento.target.value }))} /></Campo>
            <Campo etiqueta="Unidad" htmlFor="unidad" error={errores.unidad_medida}><input id="unidad" className="input" value={formulario.unidad_medida} onChange={(evento) => setFormulario((valor) => ({ ...valor, unidad_medida: evento.target.value }))} placeholder="kg, libra, unidad..." /></Campo>
          </div>
          <fieldset>
            <legend className="label">¿Cómo lo vendes?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['stock', 'Tengo existencias', 'Se descuenta del stock al vender.'],
                  ['encargo', 'Lo hago por encargo', 'Sin stock: lo preparas cuando te lo piden.'],
                ] as const
              ).map(([valor, titulo, ayuda]) => (
                <label
                  key={valor}
                  className={`flex cursor-pointer items-start gap-2 rounded-xl border-2 p-3 text-sm ${
                    formulario.modalidad === valor ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40' : 'hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="modalidad"
                    className="mt-1 text-brand-600"
                    checked={formulario.modalidad === valor}
                    onChange={() => setFormulario((actual) => ({ ...actual, modalidad: valor }))}
                  />
                  <span>
                    <span className="block font-semibold">{titulo}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{ayuda}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Precio (COP)" htmlFor="precio" error={errores.precio}><input id="precio" inputMode="decimal" className="input" value={formulario.precio} onChange={(evento) => setFormulario((valor) => ({ ...valor, precio: evento.target.value }))} /></Campo>
            {!esEncargoForm && (
              <Campo etiqueta="Stock" htmlFor="stock" error={errores.stock}><input id="stock" type="number" min={0} className="input" value={formulario.stock} onChange={(evento) => setFormulario((valor) => ({ ...valor, stock: Number(evento.target.value) }))} /></Campo>
            )}
          </div>
          {esEncargoForm && (
            <div className="space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <Campo
                etiqueta="Tiempo de preparación"
                htmlFor="preparacion"
                error={errores.preparacion_horas}
                ayuda="El comprador no podrá pedirlo para antes de este tiempo."
              >
                <div className="flex gap-2">
                  <input
                    id="preparacion"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    className="input"
                    value={prepValor}
                    onChange={(evento) => setPrepValor(evento.target.value)}
                  />
                  <select
                    className="input w-28 shrink-0"
                    aria-label="Horas o días"
                    value={prepUnidad}
                    onChange={(evento) => setPrepUnidad(evento.target.value as UnidadPreparacion)}
                  >
                    <option value="horas">horas</option>
                    <option value="dias">días</option>
                  </select>
                </div>
              </Campo>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded text-brand-600"
                  checked={Boolean(formulario.pide_detalles)}
                  onChange={(evento) => setFormulario((actual) => ({ ...actual, pide_detalles: evento.target.checked }))}
                />
                Pedir detalles al comprador
              </label>
              {formulario.pide_detalles && (
                <Campo
                  etiqueta="¿Qué le preguntas?"
                  htmlFor="etiqueta_detalles"
                  error={errores.etiqueta_detalles}
                  ayuda={`El comprador lo verá como «${etiquetaDeDetalles(formulario.etiqueta_detalles)}» y podrá escribir hasta ${MAX_DETALLES} caracteres.`}
                >
                  <input
                    id="etiqueta_detalles"
                    className="input"
                    maxLength={MAX_ETIQUETA}
                    placeholder="Ej.: Sabor y mensaje de la torta"
                    value={formulario.etiqueta_detalles ?? ''}
                    onChange={(evento) => setFormulario((actual) => ({ ...actual, etiqueta_detalles: evento.target.value }))}
                  />
                </Campo>
              )}
            </div>
          )}
          <Campo etiqueta="Descripción" htmlFor="descripcion" error={errores.descripcion}><textarea id="descripcion" rows={3} className="input resize-y" value={formulario.descripcion ?? ''} onChange={(evento) => setFormulario((valor) => ({ ...valor, descripcion: evento.target.value }))} /></Campo>
          {editando && abiertos > 0 && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" role="status">
              Este producto tiene {abiertos} {abiertos === 1 ? 'pedido abierto' : 'pedidos abiertos'}. Los cambios no afectan a {abiertos === 1 ? 'ese pedido' : 'esos pedidos'}.
            </p>
          )}
          {editando && (
            <Campo etiqueta="Estado" htmlFor="estado" error={errores.estado}>
              <select id="estado" className="input" value={formulario.estado} onChange={(evento) => setFormulario((valor) => ({ ...valor, estado: evento.target.value }))}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
            </Campo>
          )}
          <ErrorCampo mensaje={errores.__general} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardar.isPending}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      <Modal abierto={Boolean(imagenes)} onCerrar={() => setImagenes(null)} titulo={`Imágenes - ${imagenes?.nombre ?? ''}`}>
        <div className="flex flex-wrap gap-2">
          {(imagenes?.imagenes ?? []).map((imagen) => (
            <div key={imagen.id} className="relative h-24 w-24 overflow-hidden rounded-lg border">
              <Imagen
                src={imagen.url}
                fallbackNombre={imagenes?.nombre ?? 'Producto'}
                contenedorClassName="h-full w-full"
                alt=""
                width={96}
                height={96}
              />
              <button type="button" className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white" onClick={() => quitarImg.mutate(imagen.id)}><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(evento) => {
            const f = evento.target.files?.[0];
            if (!f) { setArchivo(null); return; }
            const p = validarImagen(f);
            if (p) { toast.error(p); evento.target.value = ''; setArchivo(null); return; }
            setArchivo(f);
          }} />
          <button type="button" className="btn-primary" disabled={!archivo || subir.isPending} onClick={() => subir.mutate()}>{subir.isPending ? 'Subiendo…' : 'Subir'}</button>
        </div>
      </Modal>

      <ConfirmarModal abierto={Boolean(eliminar)} titulo="¿Eliminar producto?" descripcion="Si ya tiene pedidos, el servidor puede impedirlo." textoConfirmar="Eliminar" cargando={borrar.isPending} onConfirmar={() => eliminar && borrar.mutate(eliminar.id)} onCerrar={() => setEliminar(null)} />
    </div>
  );
}
