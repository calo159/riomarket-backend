# ADR-005: Reseñas y reputación de puestos

**Estado**: Aceptado (Fase 6a)

## Contexto

El comprador no tenía forma de valorar a un puesto y el catálogo no exponía
ninguna señal de confianza. Se necesitaba un sistema de reseñas que no se
prestara a abuso (reseñar sin haber comprado) y que no penalizara el listado
del catálogo ni la reputación por reseñas ocultas por moderación.

## Decisiones

1. **App `apps/reviews` con `Resena`**: `id_usuario` (comprador) y `id_puesto`
   (`CASCADE`), `calificacion` (1-5, `CheckConstraint`), `comentario`,
   `id_pedido` (`SET_NULL`, historial), `visible` (moderación), `respuesta` del
   vendedor + `fecha_respuesta`, `fecha_creacion`. `UniqueConstraint`
   `(id_usuario, id_puesto)`.

2. **Solo se reseña tras un pedido entregado** de ese puesto y del propio
   comprador (`_exigir_pedido_entregado`). El vendedor no puede reseñar. Una
   segunda reseña se rechaza y se invita a `PUT/PATCH`.

3. **Gestión**: el autor edita su reseña; el vendedor dueño del puesto (o
   admin) responde; autor o admin eliminan. Las reglas viven en los services
   (`PermissionDenied` → 403).

4. **Visibilidad por rol**: admin ve todas; el vendedor ve (incluidas ocultas)
   las de sus puestos; el resto solo las `visible=True`. El listado público es
   `AllowAny`.

5. **Reputación calculada, no almacenada**: `anotar_reputacion` agrega
   `calificacion_promedio` (`Avg`) y `cantidad_resenas` (`Count`) **solo de las
   visibles**. El `PuestoSerializer` expone `calificacion_promedio`
   (`None` sin reseñas) y `cantidad_resenas` (0). Por eso el catálogo anota su
   queryset; el `distinct=True` del `Count` borra el `ordering` del `Meta`, así
   que el `ViewSet` reaplica `order_by("nombre")` cuando no hay `ordering`.

## Consecuencias

- `ResenaFactory` disponible para los tests; cobertura en
  `apps/reviews/tests/test_resenas.py` (services, visibilidad, reputación y
  endpoints).
- Ocultar una reseña (`visible=False`) la saca de la reputación sin borrarla.
