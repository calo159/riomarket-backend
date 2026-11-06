import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import {
  guardarConfiguracion,
  obtenerConfiguracion,
  type CampoConfiguracion,
  type ClaveConfiguracion,
  type ValoresConfiguracion,
} from '../../api/admin';
import { Campo, ErrorCampo } from '../../components/ui/Campos';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError } from '../../components/ui/Estado';
import { useToast } from '../../components/ui/Toast';
import { erroresDeCampo, mensajeDeError } from '../../lib/errors';
import { formatearFechaHora, formatearMoneda } from '../../lib/format';
import { claves } from '../../lib/queryKeys';
import { useUnaVez } from '../../lib/useUnaVez';
import { nombreMarca } from '../../lib/sitio';

const MOTIVO_MIN = 5;
/** Venta de ejemplo para que se vea qué significa el porcentaje en pesos. */
const VENTA_EJEMPLO = 50000;

const GRUPOS: { titulo: string; descripcion: string; campos: ClaveConfiguracion[] }[] = [
  {
    titulo: 'Cobros',
    descripcion: 'Lo que cobra la plataforma y lo que paga el comprador por el domicilio.',
    campos: ['comision_porcentaje', 'tarifa_domicilio'],
  },
  {
    titulo: 'Atraso de la comisión en efectivo',
    descripcion: 'Cuando un vendedor cobra en efectivo, la comisión queda pendiente hasta que la pague.',
    campos: ['limite_aviso', 'limite_bloqueo'],
  },
];

function aNumero(texto: string): number {
  const limpio = texto.trim().replace(',', '.');
  return limpio === '' ? Number.NaN : Number(limpio);
}

/** Lo que se escribe en el campo: `4500.00` se ve como `4500`, y `5.50` como `5.5`. */
function paraEditar(valor: string): string {
  return String(Number(valor));
}

function mostrar(campo: CampoConfiguracion, valor: string | number): string {
  const numero = Number(valor);
  if (campo.unidad === '%') return `${numero.toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`;
  return formatearMoneda(numero);
}

/**
 * Comisión, tarifa de domicilio y límites de atraso. Lo que se fija aquí gana sobre las variables de
 * Render y rige para los pedidos NUEVOS: los ya hechos conservan lo que se les cobró. Cada cambio pide
 * un motivo y queda en la auditoría.
 */
export function Configuracion() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [escrito, setEscrito] = useState<Partial<Record<ClaveConfiguracion, string>>>({});
  const [volverAlServidor, setVolverAlServidor] = useState<Partial<Record<ClaveConfiguracion, boolean>>>({});
  const [motivo, setMotivo] = useState('');
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [guardadoAhora, avisarGuardado] = useUnaVez();

  useEffect(() => {
    document.title = `Configuración · Administración · ${nombreMarca()}`;
  }, []);

  const consulta = useQuery({ queryKey: claves.adminConfiguracion, queryFn: obtenerConfiguracion });
  const datos = consulta.data;

  const guardar = useMutation({
    mutationFn: (valores: ValoresConfiguracion) => guardarConfiguracion(valores, motivo.trim()),
    onSuccess: (nuevo) => {
      queryClient.setQueryData(claves.adminConfiguracion, nuevo);
      void queryClient.invalidateQueries({ queryKey: claves.adminResumen });
      void queryClient.invalidateQueries({ queryKey: claves.configuracionPublica });
      setEscrito({});
      setVolverAlServidor({});
      setMotivo('');
      setErrores({});
      setErrorGeneral('');
      toast.exito('Guardamos la configuración. Rige para los pedidos nuevos.');
      avisarGuardado();
    },
    onError: (fallo) => {
      setErrores(erroresDeCampo(fallo));
      setErrorGeneral(mensajeDeError(fallo, 'No pudimos guardar la configuración.'));
    },
  });

  if (consulta.isLoading) return <CargandoBloque mensaje="Cargando configuración…" />;
  if (consulta.isError || !datos) {
    return <EstadoError mensaje="No pudimos cargar la configuración." onReintentar={() => void consulta.refetch()} />;
  }

  const porClave = new Map(datos.campos.map((campo) => [campo.clave, campo]));
  const textoDe = (campo: CampoConfiguracion) => escrito[campo.clave] ?? paraEditar(campo.valor);

  // Qué cambiaría al guardar, campo por campo, y si lo escrito es válido.
  const pendientes: { campo: CampoConfiguracion; nuevo: string | null; mostrado: string; problema?: string }[] = [];
  for (const campo of datos.campos) {
    if (volverAlServidor[campo.clave]) {
      if (campo.origen === 'panel') {
        pendientes.push({ campo, nuevo: null, mostrado: `${mostrar(campo, campo.del_servidor)} (el del servidor)` });
      }
      continue;
    }
    if (escrito[campo.clave] === undefined) continue;
    const numero = aNumero(escrito[campo.clave]!);
    if (Number.isNaN(numero)) {
      pendientes.push({ campo, nuevo: null, mostrado: '', problema: 'Escribe un número.' });
      continue;
    }
    if (numero < Number(campo.minimo) || numero > Number(campo.maximo)) {
      pendientes.push({
        campo,
        nuevo: null,
        mostrado: '',
        problema: `Debe estar entre ${mostrar(campo, campo.minimo)} y ${mostrar(campo, campo.maximo)}.`,
      });
      continue;
    }
    if (numero === Number(campo.valor)) continue;
    pendientes.push({ campo, nuevo: String(numero), mostrado: mostrar(campo, numero) });
  }

  const numeroDe = (clave: ClaveConfiguracion): number => {
    const campo = porClave.get(clave)!;
    if (volverAlServidor[clave]) return Number(campo.del_servidor);
    const numero = aNumero(textoDe(campo));
    return Number.isNaN(numero) ? Number(campo.valor) : numero;
  };
  const aviso = numeroDe('limite_aviso');
  const bloqueo = numeroDe('limite_bloqueo');
  const pausaMenorQueAviso = aviso > 0 && bloqueo > 0 && bloqueo < aviso;

  const hayProblema = pendientes.some((p) => p.problema) || pausaMenorQueAviso;
  const hayCambios = pendientes.length > 0;
  const puedeGuardar = hayCambios && !hayProblema && !guardar.isPending;

  const escribir = (campo: CampoConfiguracion, texto: string) => {
    setEscrito((actual) => ({ ...actual, [campo.clave]: texto }));
    setVolverAlServidor((actual) => ({ ...actual, [campo.clave]: false }));
  };
  const volver = (campo: CampoConfiguracion) => {
    setEscrito((actual) => {
      const { [campo.clave]: _descartado, ...resto } = actual;
      return resto;
    });
    setVolverAlServidor((actual) => ({ ...actual, [campo.clave]: true }));
  };

  const enviar = () => {
    if (motivo.trim().length < MOTIVO_MIN) {
      setErrores({ motivo: [`Indica un motivo de al menos ${MOTIVO_MIN} caracteres.`] });
      setErrorGeneral('');
      return;
    }
    const valores: ValoresConfiguracion = {};
    for (const { campo, nuevo } of pendientes) valores[campo.clave] = nuevo;
    guardar.mutate(valores);
  };

  const comision = numeroDe('comision_porcentaje');
  const comisionDeEjemplo = Math.round((VENTA_EJEMPLO * (Number.isFinite(comision) ? comision : 0)) / 100);

  return (
    <div>
      <EncabezadoPagina
        titulo="Configuración"
        descripcion="Comisión, domicilio y límites de atraso. Lo que cambies rige para los pedidos nuevos; los que ya existen conservan lo que se les cobró."
      />

      <div className="space-y-5">
        {GRUPOS.map((grupo) => (
          <section key={grupo.titulo} className="card p-4 sm:p-5" aria-labelledby={`grupo-${grupo.campos[0]}`}>
            <h2 id={`grupo-${grupo.campos[0]}`} className="text-base font-bold">
              {grupo.titulo}
            </h2>
            <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">{grupo.descripcion}</p>

            <div className="divide-y">
              {grupo.campos.map((clave) => {
                const campo = porClave.get(clave)!;
                const pendiente = pendientes.find((p) => p.campo.clave === clave);
                const error = pendiente?.problema ?? errores[clave]?.[0];
                const delPanel = campo.origen === 'panel';
                const idEntrada = `config-${clave}`;
                return (
                  <div key={clave} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_16rem] sm:gap-6">
                    <div>
                      <Campo etiqueta={campo.etiqueta} htmlFor={idEntrada} ayuda={campo.ayuda} error={error}>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="relative w-44">
                            <input
                              id={idEntrada}
                              type="text"
                              inputMode="decimal"
                              className={`input ${campo.unidad === '$' ? 'pl-7' : 'pr-8'}`}
                              value={volverAlServidor[clave] ? paraEditar(campo.del_servidor) : textoDe(campo)}
                              onChange={(e) => escribir(campo, e.target.value)}
                              aria-invalid={Boolean(error)}
                            />
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm text-slate-500 ${
                                campo.unidad === '$' ? 'left-3' : 'right-3'
                              }`}
                            >
                              {campo.unidad}
                            </span>
                          </div>
                          {delPanel && !volverAlServidor[clave] && (
                            <button type="button" className="btn-ghost text-xs" onClick={() => volver(campo)}>
                              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Usar el del servidor
                            </button>
                          )}
                        </div>
                      </Campo>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 sm:pt-6">
                      <p>
                        Hoy rige <strong className="text-slate-700 dark:text-slate-200">{mostrar(campo, campo.valor)}</strong>{' '}
                        <span
                          className={`badge ${
                            delPanel
                              ? 'bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {delPanel ? 'del panel' : 'del servidor'}
                        </span>
                      </p>
                      {delPanel && <p className="mt-1">El del servidor es {mostrar(campo, campo.del_servidor)}.</p>}
                      {volverAlServidor[clave] && delPanel && <p className="mt-1">Al guardar vuelve al del servidor.</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            {grupo.campos.includes('comision_porcentaje') && (
              <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                Ejemplo: en una venta de {formatearMoneda(VENTA_EJEMPLO)} la comisión es{' '}
                <strong>{formatearMoneda(comisionDeEjemplo)}</strong> y el vendedor recibe{' '}
                <strong>{formatearMoneda(VENTA_EJEMPLO - comisionDeEjemplo)}</strong>. No se cobra sobre el domicilio.
              </p>
            )}
            {grupo.campos.includes('limite_aviso') && (
              <>
                <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  Con los límites guardados hoy: <strong>{datos.vendedores.al_dia}</strong> vendedores al día,{' '}
                  <strong>{datos.vendedores.aviso}</strong> en aviso, <strong>{datos.vendedores.bloqueado}</strong> en pausa. Bajar un
                  límite puede pausar a más vendedores en cuanto lo guardes; un 0 apaga ese escalón.
                </p>
                {pausaMenorQueAviso && (
                  <p className="field-error mt-2" role="alert">
                    La pausa no puede ser menor que el aviso.
                  </p>
                )}
              </>
            )}
          </section>
        ))}

        <section className={`card p-4 sm:p-5 ${guardadoAhora ? 'destello-ok' : ''}`} aria-labelledby="config-guardar">
          <h2 id="config-guardar" className="text-base font-bold">
            Guardar cambios
          </h2>
          {hayCambios ? (
            <ul className="mb-4 mt-2 space-y-1 text-sm">
              {pendientes
                .filter((p) => !p.problema)
                .map(({ campo, mostrado }) => (
                  <li key={campo.clave}>
                    {campo.etiqueta}: {mostrar(campo, campo.valor)} → <strong>{mostrado}</strong>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
              Aún no cambiaste nada.
              {datos.actualizado && ` Último cambio: ${formatearFechaHora(datos.actualizado)}`}
            </p>
          )}

          <Campo etiqueta="Motivo del cambio (obligatorio)" htmlFor="config-motivo" error={errores.motivo?.[0]}>
            <textarea
              id="config-motivo"
              rows={2}
              className="input"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por ejemplo: acuerdo con la asociación de vendedores"
            />
          </Campo>
          {!errores.motivo && !Object.keys(errores).some((k) => porClave.has(k as ClaveConfiguracion)) && (
            <ErrorCampo mensaje={errorGeneral} />
          )}
          <button type="button" className="btn-primary mt-3" disabled={!puedeGuardar} onClick={enviar}>
            {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </section>
      </div>
    </div>
  );
}
