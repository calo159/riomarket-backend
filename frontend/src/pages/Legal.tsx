import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

const CONTACTO = 'soporte@riomarket.test';
const ACTUALIZADO = 'noviembre de 2026';

function Documento({ titulo, children }: { titulo: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${titulo} · RioMarket`;
  }, [titulo]);

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Última actualización: {ACTUALIZADO}</p>
      <div className="mt-6 space-y-6 text-slate-700 dark:text-slate-300">{children}</div>
      <p className="mt-8 text-sm">
        <Link className="link" to="/terminos">Términos y condiciones</Link>
        {' · '}
        <Link className="link" to="/privacidad">Política de privacidad</Link>
      </p>
    </article>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{titulo}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

function Lista({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function Terminos() {
  return (
    <Documento titulo="Términos y condiciones">
      <p>
        RioMarket es una plataforma que conecta a compradores con los puestos de la plaza de mercado de Riohacha. Al crear
        una cuenta aceptas estas condiciones.
      </p>

      <Seccion titulo="Qué es RioMarket y qué no es">
        <p>
          RioMarket es un intermediario: publica el catálogo de los puestos y organiza los pedidos. Los productos los vende
          y los entrega cada puesto, que es responsable de su calidad, su precio y su disponibilidad.
        </p>
        <p>
          Esta es una versión de un proyecto académico. Los pagos distintos al efectivo funcionan en modo de prueba y no
          mueven dinero real.
        </p>
      </Seccion>

      <Seccion titulo="Tu cuenta">
        <Lista
          items={[
            'Debes dar datos verdaderos y mantenerlos al día. Cada correo y cada celular sirven para una sola cuenta.',
            'Eres responsable de tu contraseña y de lo que se haga con tu cuenta. Avísanos si crees que alguien más entró.',
            'Podemos suspender cuentas que incumplan estas condiciones, suplanten a otras personas o intenten dañar el servicio.',
          ]}
        />
      </Seccion>

      <Seccion titulo="Si compras">
        <Lista
          items={[
            'Un pedido queda pendiente hasta que el puesto lo acepta. Tú puedes cancelarlo mientras esté pendiente; después de aceptado, lo cancelan el puesto o el administrador.',
            'Los pedidos y los productos apartados tienen un plazo. Si vence sin que se atiendan o se paguen, se cancelan solos.',
            'El precio que ves incluye el valor de la mercancía; si pides a domicilio se suma la tarifa de envío antes de confirmar.',
            'Puedes reseñar un puesto solo después de recibir un pedido suyo. No se permiten reseñas falsas u ofensivas; el administrador puede ocultarlas.',
          ]}
        />
      </Seccion>

      <Seccion titulo="Si vendes">
        <Lista
          items={[
            'Para publicar puestos debes verificar tu identidad con tu cédula, y solo los vendedores aprobados pueden vender.',
            'Eres responsable de la información de tus productos, de tus precios y de entregar lo que el cliente pidió.',
            'RioMarket cobra una comisión sobre lo que el cliente paga por la mercancía (sin contar el envío). El porcentaje vigente te lo informamos en tu panel y puede cambiar avisando antes.',
            'El efectivo lo cobras tú en el puesto, así que la comisión de esos cobros se la debes a RioMarket. El administrador anota cada pago que le haces.',
            'Si tu deuda de comisión crece, te avisaremos; si llega al límite establecido, tus puestos dejan de recibir pedidos nuevos hasta que pagues. Los pedidos que ya tenías en curso se siguen atendiendo.',
          ]}
        />
      </Seccion>

      <Seccion titulo="Uso aceptable">
        <p>
          No uses RioMarket para vender productos ilegales o peligrosos, engañar a otras personas, copiar datos de forma
          masiva ni intentar saltarte las medidas de seguridad.
        </p>
      </Seccion>

      <Seccion titulo="Responsabilidad">
        <p>
          Hacemos lo posible por mantener el servicio disponible, pero puede tener interrupciones. RioMarket no responde por
          lo que un puesto venda o entregue mal, ni por daños que no pueda controlar; la relación de compra es entre el
          comprador y el puesto.
        </p>
      </Seccion>

      <Seccion titulo="Cambios y ley aplicable">
        <p>
          Podemos actualizar estas condiciones; la fecha de arriba indica la última versión. Se rigen por las leyes de
          Colombia. Para dudas o reclamos escribe a <a className="link" href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.
        </p>
      </Seccion>
    </Documento>
  );
}

export function Privacidad() {
  return (
    <Documento titulo="Política de privacidad">
      <p>
        Esta política explica qué datos personales trata RioMarket, para qué y cómo puedes ejercer tus derechos, conforme a
        la Ley 1581 de 2012 de Colombia (protección de datos personales).
      </p>

      <Seccion titulo="Quién es el responsable">
        <p>
          RioMarket, Riohacha, La Guajira (Colombia). Contacto para temas de datos:{' '}
          <a className="link" href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.
        </p>
      </Seccion>

      <Seccion titulo="Qué datos tratamos">
        <Lista
          items={[
            'Al registrarte: nombre, correo, celular y contraseña. La contraseña se guarda cifrada de una sola vía; nadie puede leerla.',
            'Si lo agregas: foto de perfil y direcciones de entrega (con una referencia y, si la agregas, su ubicación en el mapa).',
            'Al comprar: tus pedidos, su estado y los pagos asociados; también tus reseñas, favoritos y notificaciones.',
            'Si eres vendedor: tu número de cédula (se guarda cifrado) y la foto de tu cédula, solo para verificar tu identidad. La foto se guarda en un espacio privado y solo la ve quien revisa verificaciones.',
            'De seguridad: un registro de acciones importantes (quién hizo qué y cuándo) que incluye la dirección IP, y una cookie de sesión.',
          ]}
        />
      </Seccion>

      <Seccion titulo="Para qué los usamos">
        <Lista
          items={[
            'Crear tu cuenta, iniciar sesión y recuperar tu contraseña.',
            'Gestionar pedidos: el puesto ve lo necesario para atenderlo (por ejemplo, tu nombre y, si es a domicilio, la dirección de entrega).',
            'Verificar a los vendedores y evitar fraudes o cuentas duplicadas.',
            'Enviarte avisos del servicio (estado de pedidos, recuperación de contraseña). No enviamos publicidad de terceros.',
            'Mantener la seguridad del sistema y contar cuánto se vende, sin identificarte, para mejorar el servicio.',
          ]}
        />
      </Seccion>

      <Seccion titulo="Con quién los compartimos">
        <p>
          No vendemos tus datos. Los puestos reciben solo lo necesario para atender tus pedidos. Usamos proveedores de
          alojamiento, base de datos, almacenamiento de archivos y envío de correos que tratan los datos por nuestra
          cuenta y solo para prestar el servicio. Podemos entregar información si una autoridad competente lo exige.
        </p>
      </Seccion>

      <Seccion titulo="Cookies y almacenamiento en tu navegador">
        <p>
          Usamos una cookie necesaria para mantener tu sesión iniciada y guardamos en tu navegador tu carrito y tu
          preferencia de tema (claro u oscuro). No usamos cookies de publicidad ni de seguimiento.
        </p>
      </Seccion>

      <Seccion titulo="Cuánto tiempo los guardamos">
        <p>
          Mientras tu cuenta esté activa y el tiempo que la ley exija conservar registros de pedidos y de seguridad.
        </p>
      </Seccion>

      <Seccion titulo="Tus derechos">
        <p>Puedes conocer, actualizar y rectificar tus datos, pedir que los suprimamos, y revocar tu autorización.</p>
        <p>
          Gran parte la haces tú en tu perfil. Para lo demás, o para pedir que eliminemos tu cuenta, escribe a{' '}
          <a className="link" href={`mailto:${CONTACTO}`}>{CONTACTO}</a>; respondemos en un plazo máximo de 15 días hábiles.
          Si no quedas conforme, puedes acudir a la Superintendencia de Industria y Comercio.
        </p>
      </Seccion>

      <Seccion titulo="Menores de edad">
        <p>RioMarket no está dirigido a menores de 18 años y no recopilamos sus datos a propósito.</p>
      </Seccion>
    </Documento>
  );
}
