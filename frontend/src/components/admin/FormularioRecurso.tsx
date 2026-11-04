import { useEffect, useId, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  actualizarRecurso,
  crearRecurso,
  ETIQUETAS_AMBITO,
  type AmbitoRecurso,
  type DatosRecurso,
  type RecursoAdmin,
} from '../../api/admin';
import { erroresDeCampo, mensajeDeError } from '../../lib/errors';
import { iconoDe, NOMBRES_ICONOS } from '../../navigation/iconos';
import { Campo, ErrorCampo } from '../ui/Campos';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

const VACIO: DatosRecurso = {
  codigo: '',
  nombre: '',
  descripcion: '',
  ambito: 'panel_admin',
  ruta: '',
  icono: '',
  grupo: '',
  orden: 0,
  es_publico: false,
  activo: true,
};

/** Elegir un icono de los que el menú sabe dibujar, viendo cómo queda. */
function SelectorIcono({ id, valor, onCambio }: { id: string; valor: string; onCambio: (valor: string) => void }) {
  const Icono = iconoDe(valor);
  // Un recurso viejo puede traer un nombre fuera de la lista: se conserva como opción para no perderlo sin querer.
  const fueraDeLista = valor !== '' && !NOMBRES_ICONOS.includes(valor);
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-slate-50 dark:bg-slate-800" aria-hidden="true">
        <Icono className="h-5 w-5" />
      </span>
      <select id={id} className="input" value={valor} onChange={(evento) => onCambio(evento.target.value)}>
        <option value="">Sin icono (círculo)</option>
        {fueraDeLista && <option value={valor}>{valor} (no reconocido)</option>}
        {NOMBRES_ICONOS.map((nombre) => (
          <option key={nombre} value={nombre}>
            {nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

interface Props {
  recurso: RecursoAdmin | 'nuevo' | null;
  onCerrar: () => void;
  onGuardado: () => void;
  /**
   * Edición desde la barra del menú: solo lo que cambia cómo se ve la opción (nombre, icono, grupo y orden).
   * No toca la ruta, el ámbito ni los permisos, así que no puede dejar a nadie sin acceso.
   */
  soloMenu?: boolean;
  /** Grupos que ya existen en el menú, para elegir uno en vez de escribirlo (y no crear otro por un error de tipeo). */
  gruposSugeridos?: string[];
}

/** Formulario (en ventana) para crear o editar un recurso del RBAC. Lo usan `/admin/recursos` y la barra del panel. */
export function FormularioRecurso({ recurso, onCerrar, onGuardado, soloMenu = false, gruposSugeridos = [] }: Props) {
  const toast = useToast();
  const idBase = useId();
  const existente = recurso && recurso !== 'nuevo' ? recurso : null;
  const sistema = existente?.es_sistema ?? false;
  const [datos, setDatos] = useState<DatosRecurso>(VACIO);
  const [error, setError] = useState('');
  const [errores, setErrores] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setDatos(existente ? { ...VACIO, ...existente } : VACIO);
    setError('');
    setErrores({});
  }, [recurso, existente]);

  const campo = <K extends keyof DatosRecurso>(clave: K, valor: DatosRecurso[K]) =>
    setDatos((actual) => ({ ...actual, [clave]: valor }));

  const guardar = useMutation({
    mutationFn: () => {
      if (!existente) return crearRecurso(datos);
      const { nombre, descripcion, icono, grupo, orden } = datos;
      // Desde la barra solo viaja lo visual; en un recurso de sistema, solo los campos editables.
      if (soloMenu) return actualizarRecurso(existente.id, { nombre, icono, grupo, orden });
      return actualizarRecurso(existente.id, sistema ? { nombre, descripcion, icono, grupo, orden } : datos);
    },
    onSuccess: () => {
      toast.exito(existente ? 'Recurso actualizado.' : 'Recurso creado.');
      onGuardado();
    },
    onError: (fallo) => {
      setErrores(erroresDeCampo(fallo));
      setError(mensajeDeError(fallo));
    },
  });

  const enviar = () => {
    if (!datos.nombre.trim() || (!soloMenu && !datos.codigo.trim())) {
      setError(soloMenu ? 'El nombre es obligatorio.' : 'El código y el nombre son obligatorios.');
      return;
    }
    if (!soloMenu && datos.ruta && !datos.ruta.startsWith('/')) {
      setError('La ruta debe estar vacía o empezar con «/».');
      return;
    }
    setError('');
    guardar.mutate();
  };

  const id = (nombre: string) => `${idBase}-${nombre}`;
  const listaGrupos = `${idBase}-grupos`;

  const campoNombre = (
    <Campo etiqueta="Nombre" htmlFor={id('nombre')} error={errores.nombre?.[0]} ayuda={soloMenu ? 'Es el texto que ve la gente en el menú.' : undefined}>
        <input id={id('nombre')} className="input" value={datos.nombre} maxLength={80} onChange={(e) => campo('nombre', e.target.value)} />
    </Campo>
  );
  const campoIcono = (
    <Campo etiqueta="Icono" htmlFor={id('icono')} error={errores.icono?.[0]}>
        <SelectorIcono id={id('icono')} valor={datos.icono} onCambio={(valor) => campo('icono', valor)} />
    </Campo>
  );
  const campoGrupo = (
    <Campo etiqueta="Grupo del menú" htmlFor={id('grupo')} error={errores.grupo?.[0]} ayuda={soloMenu ? 'El título de sección bajo el que aparece. Vacío: sin sección.' : undefined}>
        <input
          id={id('grupo')}
          className="input"
          value={datos.grupo}
          maxLength={40}
          list={gruposSugeridos.length > 0 ? listaGrupos : undefined}
          onChange={(e) => campo('grupo', e.target.value)}
        />
        {gruposSugeridos.length > 0 && (
          <datalist id={listaGrupos}>
            {gruposSugeridos.map((grupo) => (
              <option key={grupo} value={grupo} />
            ))}
          </datalist>
        )}
    </Campo>
  );
  const campoOrden = (
    <Campo etiqueta="Orden" htmlFor={id('orden')} error={errores.orden?.[0]} ayuda={soloMenu ? 'Menor número, más arriba dentro de su grupo.' : undefined}>
        <input id={id('orden')} type="number" min={0} className="input" value={datos.orden} onChange={(e) => campo('orden', Number(e.target.value) || 0)} />
    </Campo>
  );

  return (
    <Modal
      abierto={recurso !== null}
      onCerrar={onCerrar}
      titulo={soloMenu ? `Editar «${existente?.nombre ?? ''}» en el menú` : existente ? `Editar «${existente.codigo}»` : 'Nuevo recurso'}
      ancho="max-w-xl"
    >
      {soloMenu ? (
        <>
          <p className="mb-3 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Aquí solo cambias cómo se ve la opción en el menú. Quién puede abrirla no se toca.
          </p>
          <div className="grid gap-3">
            {campoNombre}
            {campoIcono}
            {campoGrupo}
            {campoOrden}
          </div>
        </>
      ) : (
        <>
          {sistema && (
            <p className="mb-3 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Es un recurso de sistema: código, ruta, ámbito, visibilidad pública y estado no se pueden cambiar.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Código" htmlFor={id('codigo')} error={errores.codigo?.[0]} ayuda="Ej.: admin.reportes">
              <input id={id('codigo')} className="input" value={datos.codigo} disabled={sistema} onChange={(e) => campo('codigo', e.target.value)} />
            </Campo>
            {campoNombre}
            <Campo etiqueta="Ámbito" htmlFor={id('ambito')}>
              <select id={id('ambito')} className="input" value={datos.ambito} disabled={sistema} onChange={(e) => campo('ambito', e.target.value as AmbitoRecurso)}>
                {Object.entries(ETIQUETAS_AMBITO).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>{etiqueta}</option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Ruta" htmlFor={id('ruta')} error={errores.ruta?.[0]} ayuda="Vacía si no aparece en el menú.">
              <input id={id('ruta')} className="input" value={datos.ruta} disabled={sistema} onChange={(e) => campo('ruta', e.target.value)} />
            </Campo>
            {campoIcono}
            {campoGrupo}
            {campoOrden}
            <Campo etiqueta="Descripción" htmlFor={id('descripcion')}>
              <input id={id('descripcion')} className="input" value={datos.descripcion} maxLength={200} onChange={(e) => campo('descripcion', e.target.value)} />
            </Campo>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={datos.es_publico} disabled={sistema} onChange={(e) => campo('es_publico', e.target.checked)} />
              Visible sin sesión
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={datos.activo} disabled={sistema} onChange={(e) => campo('activo', e.target.checked)} />
              Activo
            </label>
          </div>
        </>
      )}
      <ErrorCampo mensaje={error} />
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCerrar} disabled={guardar.isPending}>Cancelar</button>
        <button type="button" className="btn-primary" onClick={enviar} disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </Modal>
  );
}
