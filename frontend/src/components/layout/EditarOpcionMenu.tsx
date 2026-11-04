import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listarRecursos, type RecursoAdmin } from '../../api/admin';
import { invalidarMenu } from '../../lib/invalidarMenu';
import { claves } from '../../lib/queryKeys';
import type { MenuItem } from '../../navigation/tipos';
import { FormularioRecurso } from '../admin/FormularioRecurso';

/**
 * Ventana para editar una opción del menú desde la propia barra (nombre, icono, grupo y orden).
 *
 * El menú (`/auth/menu/`) no trae el id del recurso, así que se busca por código en la lista de recursos
 * del administrador. Al guardar se vuelve a pedir el menú y la barra cambia en el acto.
 */
export function EditarOpcionMenu({
  item,
  habilitado,
  onCerrar,
}: {
  /** La opción que se está editando (`null`: ventana cerrada). */
  item: MenuItem | null;
  /** El modo «Editar menú» está activo: se pide la lista de recursos de antemano para que el lápiz responda al instante. */
  habilitado: boolean;
  onCerrar: () => void;
}) {
  const queryClient = useQueryClient();
  const recursos = useQuery({
    queryKey: claves.adminRecursos.lista('', '', ''),
    queryFn: () => listarRecursos(),
    enabled: habilitado,
  });

  const encontrado = item ? recursos.data?.find((r) => r.codigo === item.codigo) ?? null : null;

  // Copia del recurso mientras la ventana está abierta: si la lista se vuelve a pedir (al volver a la
  // pestaña, por ejemplo), el formulario no se reinicia en medio de lo que la persona está escribiendo.
  const [recurso, setRecurso] = useState<RecursoAdmin | null>(null);
  useEffect(() => {
    if (!item) {
      setRecurso(null);
      return;
    }
    setRecurso((actual) => (actual?.codigo === item.codigo ? actual : encontrado));
  }, [item, encontrado]);

  // Los grupos que ya existen en el mismo panel, para elegir uno en vez de escribirlo.
  const grupos = useMemo(() => {
    if (!recurso) return [];
    const mismos = (recursos.data ?? []).filter((r) => r.ambito === recurso.ambito && r.grupo);
    return [...new Set(mismos.map((r) => r.grupo))].sort();
  }, [recursos.data, recurso]);

  return (
    <FormularioRecurso
      recurso={recurso}
      soloMenu
      gruposSugeridos={grupos}
      onCerrar={onCerrar}
      onGuardado={() => {
        void queryClient.invalidateQueries({ queryKey: claves.adminRecursos.todos });
        void queryClient.invalidateQueries({ queryKey: claves.adminRoles });
        void invalidarMenu(queryClient);
        onCerrar();
      }}
    />
  );
}
