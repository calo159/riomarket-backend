import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, RotateCcw } from 'lucide-react';
import {
  guardarPersonalizacion,
  obtenerPersonalizacion,
  type CampoPersonalizacion,
  type PersonalizacionAdmin,
} from '../../api/sitio';
import { Campo } from '../../components/ui/Campos';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError } from '../../components/ui/Estado';
import { useToast } from '../../components/ui/Toast';
import { erroresDeCampo, mensajeDeError } from '../../lib/errors';
import { formatearFechaHora } from '../../lib/format';
import { claves } from '../../lib/queryKeys';
import { aplicarSitio, sitioActual, tituloPagina, type Sitio } from '../../lib/sitio';

/** El sitio tal como quedaría con lo que hay en el servidor y lo que se está escribiendo. */
function armarSitio(datos: PersonalizacionAdmin, escrito: Record<string, string>): Sitio {
  const todos = datos.grupos.flatMap((g) => g.campos);
  const propio = (c: CampoPersonalizacion) => (c.clave in escrito ? escrito[c.clave].trim() : c.propio);
  // Los de por defecto que nombran la ciudad o la marca siguen a lo que se está escribiendo.
  const ciudadCampo = todos.find((c) => c.clave === 'ciudad')!;
  const marcaCampo = todos.find((c) => c.clave === 'nombre_marca')!;
  const ciudad = propio(ciudadCampo) || ciudadCampo.defecto;
  const marca = propio(marcaCampo) || marcaCampo.defecto;
  const sitio: Record<string, string> = {};
  for (const campo of todos) {
    const porDefecto = campo.plantilla.split('{ciudad}').join(ciudad).split('{nombre_marca}').join(marca);
    sitio[campo.clave] = propio(campo) || porDefecto;
  }
  const paleta = datos.paletas.find((p) => p.clave === sitio.color_marca);
  return { ...sitio, color_tema: paleta?.color ?? sitioActual().color_tema } as unknown as Sitio;
}

function SelectorDeColor({
  datos,
  valor,
  alElegir,
}: {
  datos: PersonalizacionAdmin;
  valor: string;
  alElegir: (clave: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Color de la marca" className="mt-2 flex flex-wrap gap-2.5">
      {datos.paletas.map((paleta) => {
        const activa = paleta.clave === valor;
        return (
          <button
            key={paleta.clave}
            type="button"
            role="radio"
            aria-checked={activa}
            onClick={() => alElegir(paleta.clave)}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              activa
                ? 'border-brand-600 bg-brand-50 text-brand-800 dark:border-brand-300 dark:bg-slate-800 dark:text-brand-100'
                : 'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500'
            }`}
          >
            <span
              aria-hidden="true"
              className="grid h-6 w-6 place-items-center rounded-full text-white"
              style={{ background: paleta.color }}
            >
              {activa && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            {paleta.etiqueta}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Identidad y textos del sitio: nombre, ciudad, portada, contacto, pie de página y color. Es lo que permite que quien
 * compre el proyecto lo vuelva suyo sin tocar código (ADR-024). Mientras se escribe, el color y el nombre se ven ya
 * en toda la página; si no se guarda, al salir vuelve lo anterior. Cada cambio queda en la auditoría.
 */
export function Personalizacion() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [escrito, setEscrito] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [errorGeneral, setErrorGeneral] = useState('');

  useEffect(() => {
    document.title = tituloPagina('Personalización', 'Administración');
  }, []);

  const consulta = useQuery({ queryKey: claves.adminPersonalizacion, queryFn: obtenerPersonalizacion });
  const datos = consulta.data;

  // Vista previa en vivo: la página entera toma el nombre y el color que se están escribiendo.
  const previa = useMemo(() => (datos ? armarSitio(datos, escrito) : null), [datos, escrito]);
  useEffect(() => {
    if (previa) aplicarSitio(previa);
  }, [previa]);
  // Al salir sin guardar vuelve lo que rige de verdad.
  useEffect(() => {
    return () => {
      const guardado = queryClient.getQueryData<PersonalizacionAdmin>(claves.adminPersonalizacion);
      if (guardado) aplicarSitio(armarSitio(guardado, {}));
    };
  }, [queryClient]);

  const guardar = useMutation({
    mutationFn: (valores: Record<string, string | null>) => guardarPersonalizacion(valores),
    onSuccess: (nuevo) => {
      queryClient.setQueryData(claves.adminPersonalizacion, nuevo);
      aplicarSitio(armarSitio(nuevo, {}));
      void queryClient.invalidateQueries({ queryKey: claves.sitio });
      setEscrito({});
      setErrores({});
      setErrorGeneral('');
      toast.exito('Listo: el sitio ya muestra tus cambios.');
    },
    onError: (error) => {
      const porCampo = erroresDeCampo(error);
      setErrores(porCampo);
      setErrorGeneral(Object.keys(porCampo).length ? '' : mensajeDeError(error, 'No pudimos guardar los cambios.'));
    },
  });

  if (consulta.isLoading) return <CargandoBloque mensaje="Cargando la personalización…" />;
  if (consulta.isError || !datos) {
    return <EstadoError mensaje="No pudimos cargar la personalización." onReintentar={() => void consulta.refetch()} />;
  }

  const valorDe = (campo: CampoPersonalizacion) => (campo.clave in escrito ? escrito[campo.clave] : campo.propio);
  // Escribir justo el valor de por defecto es lo mismo que no tener uno propio.
  const normal = (campo: CampoPersonalizacion) => (escrito[campo.clave].trim() === campo.defecto ? '' : escrito[campo.clave].trim());
  const cambios = datos.grupos
    .flatMap((g) => g.campos)
    .filter((campo) => campo.clave in escrito && normal(campo) !== campo.propio);

  const escribir = (campo: CampoPersonalizacion, texto: string) => {
    setEscrito((previo) => ({ ...previo, [campo.clave]: texto }));
    setErrores((previo) => ({ ...previo, [campo.clave]: [] }));
  };
  const guardarCambios = () => {
    const valores: Record<string, string | null> = {};
    for (const campo of cambios) valores[campo.clave] = normal(campo);
    guardar.mutate(valores);
  };

  return (
    <div>
      <EncabezadoPagina
        titulo="Personalización"
        descripcion="El nombre, la ciudad, la portada, el contacto, el pie de página y el color de tu marca. Lo que cambies se ve en toda la tienda sin tocar código; mientras escribes, la página ya muestra cómo queda."
      />

      <div className="space-y-5">
        {datos.grupos.map((grupo) => (
          <section key={grupo.nombre} className="card p-4 sm:p-5" aria-labelledby={`personalizacion-${grupo.nombre}`}>
            <h2 id={`personalizacion-${grupo.nombre}`} className="mb-4 text-base font-bold">
              {grupo.nombre}
            </h2>
            <div className="grid gap-5 md:grid-cols-2">
              {grupo.campos.map((campo) => {
                const id = `pers-${campo.clave}`;
                const error = errores[campo.clave]?.[0];
                const propioAhora = valorDe(campo).trim();
                const usaDefecto = propioAhora === '' || propioAhora === campo.defecto;
                if (campo.tipo === 'paleta') {
                  return (
                    <div key={campo.clave} className="md:col-span-2">
                      <p className="label">{campo.etiqueta}</p>
                      <SelectorDeColor
                        datos={datos}
                        valor={propioAhora || campo.defecto}
                        alElegir={(clave) => escribir(campo, clave)}
                      />
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{campo.ayuda}</p>
                    </div>
                  );
                }
                const ancho = campo.tipo === 'parrafo' ? 'md:col-span-2' : '';
                return (
                  <Campo key={campo.clave} etiqueta={campo.etiqueta} htmlFor={id} ayuda={campo.ayuda} error={error} className={ancho}>
                    {campo.tipo === 'parrafo' ? (
                      <textarea
                        id={id}
                        rows={2}
                        maxLength={campo.largo + 40}
                        className="input mt-1"
                        value={valorDe(campo)}
                        placeholder={campo.defecto}
                        onChange={(e) => escribir(campo, e.target.value)}
                        aria-invalid={Boolean(error)}
                      />
                    ) : (
                      <input
                        id={id}
                        type={campo.tipo === 'correo' ? 'email' : campo.tipo === 'url' ? 'url' : 'text'}
                        inputMode={campo.tipo === 'telefono' ? 'tel' : undefined}
                        maxLength={campo.largo + 40}
                        className="input mt-1"
                        value={valorDe(campo)}
                        placeholder={campo.defecto || 'Sin definir'}
                        onChange={(e) => escribir(campo, e.target.value)}
                        aria-invalid={Boolean(error)}
                      />
                    )}
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {usaDefecto ? 'Rige el de por defecto' : `${valorDe(campo).trim().length}/${campo.largo}`}
                      </span>
                      {!usaDefecto && (
                        <button type="button" className="btn-ghost text-xs" onClick={() => escribir(campo, '')}>
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Volver al de por defecto
                        </button>
                      )}
                    </div>
                  </Campo>
                );
              })}
            </div>
          </section>
        ))}

        <section className="card p-4 sm:p-5" aria-labelledby="personalizacion-guardar">
          <h2 id="personalizacion-guardar" className="text-base font-bold">
            Guardar cambios
          </h2>
          {cambios.length > 0 ? (
            <ul className="mb-4 mt-2 space-y-1 text-sm">
              {cambios.map((campo) => (
                <li key={campo.clave}>
                  {campo.etiqueta}: <strong>{escrito[campo.clave].trim() || 'el de por defecto'}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
              Aún no cambiaste nada.
              {datos.actualizado && ` Último cambio: ${formatearFechaHora(datos.actualizado)}`}
            </p>
          )}
          {errorGeneral && (
            <p className="field-error mb-3" role="alert">
              {errorGeneral}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={cambios.length === 0 || guardar.isPending} onClick={guardarCambios}>
              {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={cambios.length === 0 || guardar.isPending}
              onClick={() => {
                setEscrito({});
                setErrores({});
                setErrorGeneral('');
              }}
            >
              Descartar
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
