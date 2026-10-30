import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { obtenerProducto, obtenerPuesto } from '../api/catalog';
import { useCart } from '../cart/CartProvider';
import { ConfirmarModal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { mensajeDeError } from '../lib/errors';
import type { ItemPedido, Pedido, Producto, Puesto } from '../lib/types';
import { cn } from '../lib/utils';
import {
  planificarVolverAPedir,
  puedeVolverAPedir,
  resumenVolverAPedir,
  type PlanVolverAPedir,
} from '../lib/volverAPedir';

interface Pendiente {
  plan: PlanVolverAPedir;
  puesto: Puesto;
}

/**
 * «Volver a pedir»: consulta cada producto como está hoy, lo agrega al carrito con la misma
 * cantidad (limitada al stock) y lleva al carrito. Si el carrito es de otro puesto pide
 * confirmación antes de vaciarlo.
 */
export function BotonVolverAPedir(props: PropsBoton) {
  // Sin hooks aquí: un pedido en curso no necesita carrito ni avisos.
  if (!puedeVolverAPedir(props.pedido)) return null;
  return <BotonActivo {...props} />;
}

type PropsBoton = {
  pedido: Pick<Pedido, 'id' | 'id_puesto' | 'estado'> & {
    items: Pick<ItemPedido, 'id_producto' | 'nombre_producto' | 'cantidad'>[];
  };
  className?: string;
};

function BotonActivo({ pedido, className }: PropsBoton) {
  const { carrito, agregarLineas } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);

  const terminar = (plan: PlanVolverAPedir, puesto: Puesto, reemplazar: boolean) => {
    agregarLineas(
      puesto,
      plan.lineas.map(({ producto, cantidad }) => ({ producto, cantidad })),
      { reemplazar },
    );
    const resumen = resumenVolverAPedir(plan);
    if (plan.omitidas.length > 0 || plan.lineas.some((linea) => linea.cantidad < linea.pedida)) toast.info(resumen);
    else toast.exito(resumen);
    navigate('/carrito');
  };

  const iniciar = async () => {
    if (cargando) return;
    setCargando(true);
    try {
      const ids = [...new Set(pedido.items.map((item) => item.id_producto))];
      const [puesto, productos] = await Promise.all([
        obtenerPuesto(pedido.id_puesto).catch(() => null),
        Promise.all(ids.map((id) => obtenerProducto(id).catch(() => null))),
      ]);
      const actuales = new Map<number, Producto | null>(ids.map((id, i) => [id, productos[i]]));
      const plan = planificarVolverAPedir(pedido.items, actuales);

      if (!puesto || puesto.estado !== 'activo') {
        toast.error('Este puesto no está disponible por ahora, así que no pudimos repetir el pedido.');
        return;
      }
      if (plan.lineas.length === 0) {
        toast.error(`No pudimos repetir el pedido. ${resumenVolverAPedir(plan)}`);
        return;
      }
      if (carrito && carrito.puestoId !== puesto.id) {
        setPendiente({ plan, puesto });
        return;
      }
      terminar(plan, puesto, false);
    } catch (error) {
      toast.error(mensajeDeError(error, 'No pudimos repetir el pedido. Intenta de nuevo.'));
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={cn('btn-secondary', className)}
        onClick={() => void iniciar()}
        disabled={cargando}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {cargando ? 'Revisando…' : 'Volver a pedir'}
      </button>
      <ConfirmarModal
        abierto={Boolean(pendiente)}
        titulo="Tu carrito tiene productos de otro puesto"
        descripcion={`Al continuar se vaciará el carrito de "${carrito?.puestoNombre ?? ''}" y se agregarán los productos de "${pendiente?.puesto.nombre ?? ''}".`}
        textoConfirmar="Vaciar y agregar"
        onConfirmar={() => {
          if (!pendiente) return;
          const { plan, puesto } = pendiente;
          setPendiente(null);
          terminar(plan, puesto, true);
        }}
        onCerrar={() => setPendiente(null)}
      />
    </>
  );
}
