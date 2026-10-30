import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
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

const VACIO: DatosProducto = {
  id_puesto: 0,
  id_categoria: 0,
  nombre: '',
  descripcion: '',
  precio: '',
  stock: 0,
  unidad_medida: 'unidad',
  estado: 'activo',
};

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

  useEffect(() => {
    document.title = 'Productos · RioMarket';
  }, []);

  const verificacion = useQuery({ queryKey: claves.miVerificacion, queryFn: miVerificacion });
  const puestos = useQuery({ queryKey: claves.puestos.vendedor(usuario?.id), queryFn: () => listarPuestos({ vendedor: usuario!.id, page_size: 100 }), enabled: Boolean(usuario) });
  const productos = useQuery({ queryKey: claves.productos.vendedor, queryFn: () => listarProductos({ page_size: 100 }) });

  const verificado = verificacion.data?.estado_verificacion === 'aprobado';
  const puestoPorId = useMemo(() => new Map((puestos.data?.results ?? []).map((puesto) => [puesto.id, puesto])), [puestos.data]);
  const mios = useMemo(() => (productos.data?.results ?? []).filter((producto) => puestoPorId.has(producto.id_puesto)), [productos.data, puestoPorId]);

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: claves.productos.todos });
  };

  const guardar = useMutation({
    mutationFn: () => (editando ? actualizarProducto(editando.id, formulario) : crearProducto(formulario)),
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
    });
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
    if (Number(formulario.stock) < 0) nuevos.stock = 'El stock no puede ser negativo.';
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

      {!verificado && <p className="mb-4 text-sm text-sol-700 dark:text-sol-400">Necesitas verificación aprobada para crear productos.</p>}
      {verificado && (puestos.data?.results.length ?? 0) === 0 && <p className="mb-4 text-sm text-sol-700 dark:text-sol-400">Primero crea un puesto y asígnale categorías.</p>}

      {productos.isLoading && <CargandoBloque mensaje="Cargando productos…" />}
      {productos.isError && <EstadoError mensaje="No pudimos cargar productos." onReintentar={() => void productos.refetch()} />}
      {mios.length === 0 && !productos.isLoading && (
        <EstadoVacio titulo="Sin productos" descripcion="Agrega tu primer producto al catálogo del puesto." accion={verificado && puestos.data?.results.length ? <button type="button" className="btn-primary" onClick={abrirNuevo}>Crear producto</button> : undefined} />
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
                <td className="p-3">{producto.stock}</td>
                <td className="p-3">{producto.estado}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button type="button" className="btn-ghost p-2" onClick={() => setImagenes(producto)} title="Imágenes"><ImagePlus className="h-4 w-4" /></button>
                    <button type="button" className="btn-ghost p-2" onClick={() => abrirEditar(producto)} title="Editar"><Pencil className="h-4 w-4" /></button>
                    <button type="button" className="btn-ghost p-2 text-rojo-600" onClick={() => setEliminar(producto)} title="Eliminar"><Trash2 className="h-4 w-4" /></button>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Precio (COP)" htmlFor="precio" error={errores.precio}><input id="precio" inputMode="decimal" className="input" value={formulario.precio} onChange={(evento) => setFormulario((valor) => ({ ...valor, precio: evento.target.value }))} /></Campo>
            <Campo etiqueta="Stock" htmlFor="stock" error={errores.stock}><input id="stock" type="number" min={0} className="input" value={formulario.stock} onChange={(evento) => setFormulario((valor) => ({ ...valor, stock: Number(evento.target.value) }))} /></Campo>
          </div>
          <Campo etiqueta="Descripción" htmlFor="descripcion" error={errores.descripcion}><textarea id="descripcion" rows={3} className="input resize-y" value={formulario.descripcion ?? ''} onChange={(evento) => setFormulario((valor) => ({ ...valor, descripcion: evento.target.value }))} /></Campo>
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
