# ADR-004: Direcciones de entrega y notificaciones

**Estado**: Aceptado (Fase 5)

## Contexto

El comprador escribía la dirección a mano en cada pedido (`direccion_entrega`,
`referencia_entrega`), lo que obliga a re-teclearla y no permite llevar un mapa
de entrega. Además, los cambios de estado del pedido ocurrían en silencio: el
comprador y el vendedor no recibían ningún aviso.

Dos necesidades: (1) reutilizar direcciones guardadas sin perder el texto
libre que ya existía, y (2) notificar los eventos de pedidos sin acoplar los
módulos ni obligar a configurar un servidor de correo.

## Decisiones

1. **App `apps/addresses` con `Direccion`**: pertenece a un `Usuario`
   (`ForeignKey CASCADE`, `related_name="direcciones"`). Campos: `alias`,
   `direccion`, `referencia`, `latitud`/`longitud` (`Decimal(9,6)`, opcionales),
   `es_predeterminada`, `activa`, fechas.

2. **Invariantes en la BD** (no solo en el service), con `CheckConstraint` y
   `UniqueConstraint` parciales:
   - a lo sumo una `es_predeterminada=True` por usuario;
   - `latitud` y `longitud` van juntas o ninguna;
   - una dirección predeterminada no puede estar inactiva.

3. **La primera dirección activa es la predeterminada**: `crear_direccion` la
   marca sola si el usuario no tiene ninguna activa. `marcar_predeterminada`
   quita la anterior dentro de una transacción. Desactivar una dirección
   (`activa=False`) le retira la marca de predeterminada.

4. **Visibilidad por rol**: cada usuario ve y edita solo sus direcciones; el
   admin ve todas. La escritura la controla `EsComprador` y el service revalida
   la pertenencia (`_exigir_dueno`) para cerrar el hueco a nivel de objeto.

5. **Integración con `Pedido` sin romper lo existente**: `Pedido` gana
   `id_direccion` (`ForeignKey SET_NULL`), `latitud_entrega` y
   `longitud_entrega`. Al crear/editar, si se pasa `id_direccion` se valida que
   sea del comprador y esté activa, y se copian dirección/referencia/coordenadas
   como **snapshot**: borrar la dirección no altera el pedido (por eso
   `SET_NULL`). El texto libre sigue funcionando (retrocompatible) y un pedido a
   domicilio sigue exigiendo `direccion_entrega`.

6. **App `apps/notifications` con `Notificacion`**: `id_usuario` (CASCADE) +
   `id_pedido` (`SET_NULL`, historial), `tipo` (enum con `CheckConstraint`),
   `titulo`, `mensaje`, `leida`, `fecha_creacion`, `fecha_lectura`. Las
   notificaciones las crean los **services** (no el cliente): al crear un pedido
   se avisa al vendedor; en cada transición de estado se avisa al comprador (y
   al vendedor cuando se cancela). El endpoint es de solo lectura + acciones
   `leida`, `marcar-todas` y `contador`.

7. **Email opcional por flag**: `NOTIFICATIONS_EMAIL_ENABLED` (por defecto
   `False`) decide si además de la notificación in-app se envía un correo
   (`send_mail`, `fail_silently=True`). Un fallo de correo **nunca** rompe la
   operación del pedido. En dev se usa `console.EmailBackend`; en tests
   `locmem`.

## Consecuencias

- Los módulos de pedidos/notificaciones se comunican por llamadas a services
  con import diferido (`from apps.notifications import services`) y protegidas
  con `try/except` + log, para no acoplar el dominio ni tumbar un pedido por un
  fallo de notificación.
- Se añadieron `DireccionFactory` y `NotificacionFactory`, y pruebas de
  services, constraints, integración con pedidos y endpoints. Ver
  `apps/addresses/tests/test_direcciones.py` y
  `apps/notifications/tests/test_notificaciones.py`.
- Activar el email en producción requiere configurar un `EMAIL_BACKEND` SMTP
  real (no incluido por defecto).
