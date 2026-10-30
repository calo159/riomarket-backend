import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { reportarNoRecibido } from '../../api/orders';
import { crearPago, simularPago } from '../../api/payments';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { Campo, ErrorCampo } from '../../components/ui/Campos';
import { formatearMoneda } from '../../lib/format';
import { erroresDeCampo, mensajeDeError } from '../../lib/errors';
import { SANDBOX_PAGOS } from './config';

interface PropsModal {
  abierto: boolean;
  onCerrar: () => void;
  pedidoId: number;
  /** Refresca las consultas del pedido tras una acción exitosa. */
  onExito: () => void;
}

/** El comprador avisa que el pedido en camino no le ha llegado. */
export function ModalNoRecibido({ abierto, onCerrar, pedidoId, onExito }: PropsModal) {
  const toast = useToast();
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (abierto) setError('');
  }, [abierto]);

  const reportar = useMutation({
    mutationFn: () => reportarNoRecibido(pedidoId, motivo),
    onSuccess: () => {
      onExito();
      onCerrar();
      setMotivo('');
      setError('');
      toast.exito('Avisamos al vendedor. Aún puedes confirmar cuando recibas el pedido.');
    },
    onError: (err) => setError(mensajeDeError(err)),
  });

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Reportar que no me ha llegado">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Avisaremos al vendedor y al administrador. El pedido sigue en camino; si llega, podrás confirmarlo igualmente.
      </p>
      <Campo etiqueta="Motivo (opcional)" htmlFor="motivo-no-recibido" className="mt-3">
        <textarea
          id="motivo-no-recibido"
          rows={3}
          maxLength={200}
          className="input"
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          placeholder="Cuéntanos qué pasó (máximo 200 caracteres)."
        />
      </Campo>
      <ErrorCampo mensaje={error} />
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCerrar} disabled={reportar.isPending}>
          Cancelar
        </button>
        <button type="button" className="btn-primary" onClick={() => reportar.mutate()} disabled={reportar.isPending}>
          {reportar.isPending ? 'Enviando…' : 'Avisar al vendedor'}
        </button>
      </div>
    </Modal>
  );
}

/** El comprador registra el pago del pedido con el método elegido. */
export function ModalPago({
  abierto,
  onCerrar,
  pedidoId,
  onExito,
  total,
  tipoEntrega,
}: PropsModal & { total: string; tipoEntrega?: string }) {
  const toast = useToast();
  const [metodo, setMetodo] = useState(tipoEntrega === 'retiro' || !SANDBOX_PAGOS ? 'efectivo' : 'simulado');
  const [error, setError] = useState('');

  const pagar = useMutation({
    mutationFn: async () => {
      const nuevo = await crearPago({ pedido: pedidoId, metodo_pago: metodo });
      if (metodo === 'simulado') return simularPago(nuevo.id, 'aprobar');
      return nuevo;
    },
    onSuccess: (pago) => {
      onExito();
      onCerrar();
      setError('');
      toast.exito(
        pago.estado === 'aprobado'
          ? 'Pago aprobado en modo sandbox.'
          : 'Pago registrado. Queda pendiente de confirmación.',
      );
    },
    onError: (err) => {
      const campos = erroresDeCampo(err);
      setError(campos.metodo_pago?.[0] ?? campos.id_pedido?.[0] ?? mensajeDeError(err));
    },
  });

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Registrar pago">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Total a pagar: <strong>{formatearMoneda(total)}</strong>
      </p>
      <Campo etiqueta="Método de pago" htmlFor="metodo-pago" className="mt-4">
        <select id="metodo-pago" className="input" value={metodo} onChange={(evento) => setMetodo(evento.target.value)}>
          {SANDBOX_PAGOS && <option value="simulado">Simulado (sandbox, se aprueba al instante)</option>}
          <option value="efectivo">Efectivo (lo confirma el vendedor)</option>
          <option value="transferencia">Transferencia</option>
          <option value="tarjeta">Tarjeta débito/crédito</option>
          <option value="nequi">Nequi</option>
          <option value="daviplata">Daviplata</option>
        </select>
      </Campo>
      {tipoEntrega === 'retiro' && metodo === 'efectivo' && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Pagas en el puesto al recoger tu pedido.</p>
      )}
      <ErrorCampo mensaje={error} />
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCerrar} disabled={pagar.isPending}>
          Cancelar
        </button>
        <button type="button" className="btn-primary" onClick={() => pagar.mutate()} disabled={pagar.isPending}>
          {pagar.isPending ? 'Procesando…' : 'Registrar pago'}
        </button>
      </div>
    </Modal>
  );
}
