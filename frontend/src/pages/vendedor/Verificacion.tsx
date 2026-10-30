import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Clock, FileImage, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { enviarVerificacion, miVerificacion } from '../../api/verification';
import { useSession } from '../../auth/SessionProvider';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError } from '../../components/ui/Estado';
import { Campo, ErrorCampo } from '../../components/ui/Campos';
import { useToast } from '../../components/ui/Toast';
import { erroresDeCampo, mensajeDeError } from '../../lib/errors';
import { formatearFechaHora, ETIQUETAS_VERIFICACION } from '../../lib/format';
import { validarImagen } from '../../lib/utils';
import { claves } from '../../lib/queryKeys';

export function Verificacion() {
  const { recargarPerfil } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const inputFoto = useRef<HTMLInputElement>(null);
  const [cedula, setCedula] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = 'Verificación · RioMarket';
  }, []);

  const verificacion = useQuery({ queryKey: claves.miVerificacion, queryFn: miVerificacion });

  const enviar = useMutation({
    mutationFn: () => enviarVerificacion(cedula.trim(), foto!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: claves.miVerificacion });
      void recargarPerfil();
      setCedula('');
      setFoto(null);
      setErrores({});
      if (inputFoto.current) inputFoto.current.value = '';
      toast.exito('Solicitud enviada. Un administrador la revisará pronto.');
    },
    onError: (error) => {
      const campos = erroresDeCampo(error);
      const nuevos: Record<string, string> = {};
      for (const [campo, mensajes] of Object.entries(campos)) nuevos[campo] = mensajes[0];
      setErrores(nuevos);
      toast.error(mensajeDeError(error, 'No pudimos enviar la verificación.'));
    },
  });

  const seleccionarFoto = (archivo: File | undefined) => {
    if (!archivo) {
      setFoto(null);
      return;
    }
    const problema = validarImagen(archivo);
    if (problema) {
      setErrores((valor) => ({ ...valor, foto_cedula: problema }));
      setFoto(null);
      return;
    }
    setErrores((valor) => ({ ...valor, foto_cedula: '' }));
    setFoto(archivo);
  };

  const onSubmit = (evento: FormEvent) => {
    evento.preventDefault();
    const nuevos: Record<string, string> = {};
    if (!/^\d{6,12}$/.test(cedula.trim())) nuevos.numero_cedula = 'Escribe entre 6 y 12 dígitos.';
    if (!foto) nuevos.foto_cedula = 'Adjunta una foto de tu cédula.';
    if (Object.keys(nuevos).length) {
      setErrores(nuevos);
      return;
    }
    enviar.mutate();
  };

  if (verificacion.isLoading) {
    return <div className="mx-auto max-w-3xl"><CargandoBloque mensaje="Consultando tu verificación…" /></div>;
  }
  if (verificacion.isError) {
    return <EstadoError mensaje="No pudimos consultar tu verificación." onReintentar={() => void verificacion.refetch()} />;
  }

  const datos = verificacion.data;
  const estado = datos?.estado_verificacion;
  const puedeEnviar = !datos || estado === 'rechazado';

  const configuracion = {
    pendiente: {
      icono: Clock,
      clase: ' bg-sol-400 text-slate-950',
      titulo: 'Tu solicitud está en revisión',
      detalle: 'Un administrador revisará tu cédula. Te notificaremos cuando haya una decisión.',
    },
    aprobado: {
      icono: BadgeCheck,
      clase: ' bg-verde-600 text-white',
      titulo: '¡Estás verificado!',
      detalle: 'Ya puedes crear puestos, publicar productos y recibir pedidos.',
    },
    rechazado: {
      icono: XCircle,
      clase: ' bg-rojo-600 text-white',
      titulo: 'Tu verificación fue rechazada',
      detalle: datos?.motivo_rechazo || 'Corrige los datos y vuelve a enviar la solicitud.',
    },
  }[estado ?? 'pendiente'];

  const Icono = configuracion.icono;

  return (
    <div className="mx-auto max-w-3xl">
      <EncabezadoPagina
        titulo="Verificación de vendedor"
        descripcion="Verifica tu identidad para publicar productos y recibir pedidos."
      />

      {datos && (
        <section className={`mb-5 rounded-xl border p-4 ${configuracion.clase}`}>
          <div className="flex items-start gap-3">
            <Icono className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="font-extrabold">{configuracion.titulo}</h2>
              <p className="mt-0.5 text-sm">{configuracion.detalle}</p>
              <p className="mt-2 text-xs opacity-80">
                Estado: {ETIQUETAS_VERIFICACION[estado ?? 'pendiente'] ?? estado} · Enviada el {formatearFechaHora(datos.fecha_solicitud)}
                {datos.fecha_revision && ` · Revisada el ${formatearFechaHora(datos.fecha_revision)}`}
              </p>
            </div>
          </div>
        </section>
      )}

      {puedeEnviar ? (
        <form className="card p-5" onSubmit={onSubmit} noValidate>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <ShieldCheck className="h-5 w-5" /> {datos ? 'Enviar de nuevo' : 'Enviar documentos'}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Tu número de cédula se guarda cifrado y la foto se almacena de forma privada. Solo la ve el equipo de revisión.
          </p>
          <div className="mt-4 space-y-3">
            <Campo etiqueta="Número de cédula" htmlFor="cedula" error={errores.numero_cedula} ayuda="Sin puntos ni espacios.">
              <input
                id="cedula"
                inputMode="numeric"
                className="input"
                value={cedula}
                onChange={(evento) => setCedula(evento.target.value.replace(/\D/g, ''))}
                placeholder="1234567890"
                maxLength={12}
              />
            </Campo>

            <Campo etiqueta="Foto de la cédula" htmlFor="foto" error={errores.foto_cedula} ayuda="JPEG, PNG o WebP. Máximo 2 MB.">
              <input
                ref={inputFoto}
                id="foto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(evento) => seleccionarFoto(evento.target.files?.[0])}
              />
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-dashed p-4 text-left transition hover:border-brand-400"
                onClick={() => inputFoto.current?.click()}
              >
                {foto ? <FileImage className="h-6 w-6 text-brand-600" /> : <Upload className="h-6 w-6 text-slate-600 dark:text-slate-400" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{foto ? foto.name : 'Selecciona una imagen'}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {foto ? `${(foto.size / 1024).toFixed(0)} KB` : 'La imagen debe mostrar la cédula completa y legible.'}
                  </span>
                </span>
              </button>
            </Campo>
            <ErrorCampo mensaje={errores.__general ?? errores.usuario} />
          </div>
          <button type="submit" className="btn-primary mt-5" disabled={enviar.isPending}>
            {enviar.isPending ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </form>
      ) : (
        <section className="card p-5 text-sm text-slate-600 dark:text-slate-300">
          {estado === 'pendiente'
            ? 'No necesitas hacer nada más por ahora. Te avisaremos cuando la verificación sea revisada.'
            : 'Tu cuenta ya está habilitada. Puedes administrar tus puestos y productos desde el panel.'}
        </section>
      )}
    </div>
  );
}
