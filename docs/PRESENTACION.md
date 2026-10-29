# Guion de presentación

Demo de 5 minutos con los datos de `seed_masivo`. Contraseña para todos los
usuarios: `RioMarket2026!`.

## Usuarios de prueba

| Rol | Correo | Uso en la demo |
| --- | --- | --- |
| Administrador | `admin@riomarket.test` | Verificación, métricas y auditoría |
| Vendedor aprobado | `carmen@riomarket.test` | Puestos, productos y pedidos |
| Vendedor aprobado | `diego@riomarket.test` | Segunda tienda del catálogo |
| Comprador | `luis@riomarket.test` | Compra y reseña |

## Antes de empezar

1. Backend: `python manage.py runserver`.
2. Frontend: `cd frontend && npm run dev`.
3. Datos: `python manage.py seed_masivo` (idempotente).
4. Abrir <http://127.0.0.1:3000> y comprobar `/api/health/`.

## Guion sugerido

1. **Portada y catálogo** (1 min): abrir la app, mostrar categorías, búsqueda,
   filtros y un producto de un puesto.
2. **Compra como Luis** (1 min): login, agregar al carrito, checkout con retiro y
   cupón si aplica, crear pedido.
3. **Pago sandbox** (1 min): registrar pago, aprobarlo desde el detalle y mostrar
   los montos calculados por el backend (subtotal, domicilio, comisión y neto).
4. **Vendedor** (1 min): login como Carmen, confirmar el pedido, pasarlo a
   preparación y marcarlo en camino. Mostrar que sin pago aprobado no confirma y que el vendedor no puede marcarlo entregado: lo confirma el comprador.
5. **Administrador** (1 min): login como admin, revisar una verificación, el
   listado global de pagos y un registro de auditoría.
6. **Cierre** (30 s): recordar que la API es la autoridad, el frontend solo oculta
   acciones, y que el sandbox no es una pasarela real.

## Mensajes clave

- Pedido de un solo puesto con stock atómico y snapshots de nombre/precio.
- Confirmación condicionada por un pago aprobado.
- Refresh en cookie HttpOnly y access en memoria.
- Verificación de vendedor con cédula cifrada y foto privada.
- Reseñas solo después de una entrega.
- Auditoría de acciones sensibles para el administrador.

## Preguntas probables

| Pregunta | Respuesta corta |
| --- | --- |
| ¿Por qué cookie HttpOnly para el refresh? | Reduce el robo por XSS; el access no se persiste y la cookie no es legible desde JS. |
| ¿JWT o sesiones? | JWT con rotación y blacklist; la cookie protege el refresh y el backend sigue siendo stateless para el access. |
| ¿Cómo evitan pedidos duplicados o stock negativo? | Transacciones, `select_for_update` y validaciones/constraints en la base. |
| ¿Quién paga la comisión? | El vendedor: `neto_vendedor = subtotal - comisión`; el comprador paga subtotal + domicilio - descuento. |
| ¿RBAC? | Permisos DRF por rol y objeto en el backend; rutas protegidas en el frontend como apoyo visual. |
| ¿Cómo protegen la cédula? | Fernet en reposo, HMAC para unicidad y almacenamiento privado servido solo al admin. |
| ¿Qué falta para producción real? | Pasarela real, SMTP, almacenamiento de objetos, retención de auditoría y rotación de secretos. |
| ¿Qué pasa si cae Render free? | El servicio duerme a los 15 min y la base free caduca a los 30 días; Supabase es la alternativa documentada. |
| ¿Por qué hay vulnerabilidades en `npm audit`? | Son principalmente herramientas de desarrollo; los saltos mayores están planificados y documentados en `docs/MANTENIMIENTO.md`. |
| ¿Los tests tocan la base real? | No: la suite usa SQLite en memoria salvo que se defina `TEST_DATABASE_URL`. |

## Evidencias para mostrar

- Swagger: `/api/docs/`.
- Health: `/api/health/`.
- CI: `.github/workflows/ci.yml`.
- Auditoría: `docs/MANTENIMIENTO.md`.
- Seguridad: `SEGURIDAD.md`.
