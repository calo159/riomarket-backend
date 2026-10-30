import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import {
  actualizarCategoria,
  crearCategoria,
  eliminarCategoria,
  listarCategorias,
} from '../../api/catalog';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { ConfirmarModal, Modal } from '../../components/ui/Modal';
import { Campo, ErrorCampo } from '../../components/ui/Campos';
import { useToast } from '../../components/ui/Toast';
import { erroresDeCampo, mensajeDeError } from '../../lib/errors';
import type { Categoria } from '../../lib/types';
import { claves } from '../../lib/queryKeys';

interface FormularioCategoria {
  nombre: string;
  id_categoria_padre: string;
  activa: boolean;
}

const VACIO: FormularioCategoria = { nombre: '', id_categoria_padre: '', activa: true };

export function CategoriasAdmin() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [formulario, setFormulario] = useState<FormularioCategoria>(VACIO);
  const [error, setError] = useState('');
  const [eliminar, setEliminar] = useState<Categoria | null>(null);

  useEffect(() => {
    document.title = 'Categorías · Administración · RioMarket';
  }, []);

  const categorias = useQuery({ queryKey: claves.categorias, queryFn: listarCategorias });

  const refrescar = () => {
    void queryClient.invalidateQueries({ queryKey: claves.categorias });
    void queryClient.invalidateQueries({ queryKey: claves.adminResumen });
  };

  const guardar = useMutation({
    mutationFn: () => {
      const datos = {
        nombre: formulario.nombre.trim(),
        id_categoria_padre: formulario.id_categoria_padre ? Number(formulario.id_categoria_padre) : null,
        activa: formulario.activa,
      };
      return editando ? actualizarCategoria(editando.id, datos) : crearCategoria(datos);
    },
    onSuccess: () => {
      refrescar();
      setModal(false);
      setEditando(null);
      setFormulario(VACIO);
      setError('');
      toast.exito(editando ? 'Categoría actualizada.' : 'Categoría creada.');
    },
    onError: (fallo) => {
      const campos = erroresDeCampo(fallo);
      setError(campos.nombre?.[0] ?? campos.id_categoria_padre?.[0] ?? mensajeDeError(fallo));
    },
  });

  const borrar = useMutation({
    mutationFn: (id: number) => eliminarCategoria(id),
    onSuccess: () => {
      refrescar();
      setEliminar(null);
      toast.exito('Categoría eliminada.');
    },
    onError: (fallo) => {
      setEliminar(null);
      toast.error(mensajeDeError(fallo, 'No se puede eliminar una categoría con subcategorías o productos asociados.'));
    },
  });

  const abrirNueva = () => {
    setEditando(null);
    setFormulario(VACIO);
    setError('');
    setModal(true);
  };

  const abrirEditar = (categoria: Categoria) => {
    setEditando(categoria);
    setFormulario({
      nombre: categoria.nombre,
      id_categoria_padre: categoria.id_categoria_padre ? String(categoria.id_categoria_padre) : '',
      activa: categoria.activa ?? true,
    });
    setError('');
    setModal(true);
  };

  const enviar = () => {
    if (!formulario.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    guardar.mutate();
  };

  const lista = categorias.data ?? [];
  const nombreDe = (id: number | null | undefined) => lista.find((item) => item.id === id)?.nombre ?? '—';

  return (
    <div>
      <EncabezadoPagina
        titulo="Categorías"
        descripcion="Organiza el catálogo. Una categoría con subcategorías o productos no se puede borrar."
        acciones={
          <button type="button" className="btn-primary" onClick={abrirNueva}>
            <Plus className="h-4 w-4" /> Nueva categoría
          </button>
        }
      />

      {categorias.isLoading && <CargandoBloque mensaje="Cargando categorías…" />}
      {categorias.isError && <EstadoError mensaje="No pudimos cargar las categorías." onReintentar={() => void categorias.refetch()} />}
      {categorias.data && lista.length === 0 && (
        <EstadoVacio titulo="Sin categorías" descripcion="Crea la primera categoría del catálogo." icono={<Tags className="h-9 w-9" />} />
      )}
      {lista.length > 0 && (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="p-3">Nombre</th>
                <th className="p-3">Categoría padre</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((categoria) => (
                <tr key={categoria.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{categoria.nombre}</td>
                  <td className="p-3 text-slate-500">{nombreDe(categoria.id_categoria_padre)}</td>
                  <td className="p-3">
                    <span className={`badge ${categoria.activa ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {categoria.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="btn-ghost p-2" onClick={() => abrirEditar(categoria)} aria-label={`Editar ${categoria.nombre}`}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" className="btn-ghost p-2 text-rose-600 dark:text-rose-400" onClick={() => setEliminar(categoria)} aria-label={`Eliminar ${categoria.nombre}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal abierto={modal} onCerrar={() => setModal(false)} titulo={editando ? `Editar ${editando.nombre}` : 'Nueva categoría'}>
        <Campo etiqueta="Nombre" htmlFor="categoria-nombre">
          <input id="categoria-nombre" className="input" value={formulario.nombre} onChange={(evento) => setFormulario({ ...formulario, nombre: evento.target.value })} />
        </Campo>
        <Campo etiqueta="Categoría padre (opcional)" htmlFor="categoria-padre" className="mt-3">
          <select
            id="categoria-padre"
            className="input"
            value={formulario.id_categoria_padre}
            onChange={(evento) => setFormulario({ ...formulario, id_categoria_padre: evento.target.value })}
          >
            <option value="">Sin padre (categoría principal)</option>
            {lista
              .filter((categoria) => categoria.id !== editando?.id)
              .map((categoria) => (
                <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
              ))}
          </select>
        </Campo>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={formulario.activa}
            onChange={(evento) => setFormulario({ ...formulario, activa: evento.target.checked })}
          />
          Activa (visible para los vendedores)
        </label>
        <ErrorCampo mensaje={error} />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setModal(false)} disabled={guardar.isPending}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={enviar} disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </div>
      </Modal>

      <ConfirmarModal
        abierto={Boolean(eliminar)}
        titulo={`¿Eliminar ${eliminar?.nombre ?? ''}?`}
        descripcion="Solo se puede eliminar si no tiene subcategorías ni productos asociados."
        textoConfirmar="Eliminar categoría"
        cargando={borrar.isPending}
        onConfirmar={() => eliminar && borrar.mutate(eliminar.id)}
        onCerrar={() => setEliminar(null)}
      />
    </div>
  );
}
