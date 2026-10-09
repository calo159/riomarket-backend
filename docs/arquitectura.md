# Arquitectura de RioMarket Backend

Documento de apoyo del [README](../README.md). Contiene el detalle que haría
ruido en la portada: dependencias entre apps, modelo entidad-relación completo
y matriz de permisos por rol.

## Dependencias entre apps

`accounts` es la base (usuarios y verificación); `catalog` depende de ella;
`orders` y `payments` de ambas; `common` es transversal (permisos, errores,
pricing, validación). `addresses`, `notifications`, `reviews`, `promotions` y
`audit` cuelgan de las anteriores.

```mermaid
flowchart TD
    common[(common)]
    accounts --> catalog
    catalog --> orders
    orders --> payments
    accounts --> addresses
    accounts --> notifications
    orders --> notifications
    catalog --> reviews
    orders --> reviews
    catalog --> promotions
    orders --> promotions
    orders --> audit
    payments --> audit
    promotions --> audit
    reviews --> audit

    common -. permisos / pricing / errores .-> accounts
    common -. permisos / pricing / errores .-> catalog
    common -. permisos / pricing / errores .-> orders
    common -. permisos / pricing / errores .-> payments
    common -. permisos / pricing / errores .-> addresses
    common -. permisos / pricing / errores .-> notifications
    common -. permisos / pricing / errores .-> reviews
    common -. permisos / pricing / errores .-> promotions
    common -. permisos / pricing / errores .-> audit
```

Las dependencias se rompen con **imports diferidos** cuando hace falta evitar
ciclos (por ejemplo, `orders.services` importa `notifications` y `audit` dentro
de la función).

## Modelo entidad-relación

Campos y relaciones tomados directamente de `apps/*/models.py`. Las claves
`PROTECT` preservan el historial; las `SET_NULL` dejan el rastro vivo aunque se
borre la entidad referenciada.

```mermaid
erDiagram
    USUARIO ||--o| VENDEDOR : "solicitud de verificacion"
    USUARIO ||--o{ DIRECCION : "tiene"
    USUARIO ||--o{ PUESTO : "es dueno"
    USUARIO ||--o{ PEDIDO : "compra"
    USUARIO ||--o{ NOTIFICACION : "recibe"
    USUARIO ||--o{ RESENA : "escribe"
    USUARIO ||--o{ USO_CUPON : "usa"
    USUARIO ||--o{ REGISTRO_AUDITORIA : "genera"
    VENDEDOR }o--|| USUARIO : "revisado por"

    CATEGORIA ||--o{ CATEGORIA : "subcategorias"
    PUESTO ||--o{ PUESTO_CATEGORIA : "clasifica"
    CATEGORIA ||--o{ PUESTO_CATEGORIA : "agrupa"
    PUESTO ||--o{ PRODUCTO : "ofrece"
    CATEGORIA ||--o{ PRODUCTO : "categoriza"
    PRODUCTO ||--o{ IMAGEN_PRODUCTO : "tiene"

    PUESTO ||--o{ PEDIDO : "recibe"
    PEDIDO ||--o{ ITEM_PEDIDO : "contiene"
    PRODUCTO ||--o{ ITEM_PEDIDO : "referenciado"
    PEDIDO ||--o| PAGO : "se paga con"
    PEDIDO }o--o| DIRECCION : "snapshot"
    PEDIDO }o--o| CUPON : "aplica"
    PEDIDO ||--o| USO_CUPON : "consume"

    PUESTO ||--o{ RESENA : "recibe"
    PEDIDO }o--o| RESENA : "origina"
    PUESTO ||--o{ CUPON : "limita a"
    CUPON ||--o{ USO_CUPON : "registra"

    USUARIO {
        bigint id PK
        string nombre
        string correo UK
        string celular UK
        string rol
        string estado
        bool is_staff
        bool is_superuser
    }
    VENDEDOR {
        bigint id PK
        bigint id_usuario FK
        binary numero_cedula
        string cedula_huella UK
        file foto_cedula
        string estado_verificacion
        bigint id_revisor FK
        string motivo_rechazo
    }
    DIRECCION {
        bigint id PK
        bigint id_usuario FK
        string alias
        string direccion
        string referencia
        decimal latitud
        decimal longitud
        bool es_predeterminada
        bool activa
    }
    PUESTO {
        bigint id PK
        bigint id_vendedor FK
        string nombre
        string descripcion
        string direccion
        decimal latitud
        decimal longitud
        string horario
        bool ofrece_domicilio
        string estado
    }
    CATEGORIA {
        bigint id PK
        string nombre UK
        bigint id_categoria_padre FK
        bool activa
    }
    PUESTO_CATEGORIA {
        bigint id PK
        bigint id_puesto FK
        bigint id_categoria FK
    }
    PRODUCTO {
        bigint id PK
        bigint id_puesto FK
        bigint id_categoria FK
        string nombre
        decimal precio
        int stock
        string unidad_medida
        string estado
    }
    IMAGEN_PRODUCTO {
        bigint id PK
        bigint id_producto FK
        file archivo
        int orden
    }
    PEDIDO {
        bigint id PK
        bigint id_comprador FK
        bigint id_puesto FK
        string tipo_entrega
        string estado
        string direccion_entrega
        bigint id_direccion FK
        decimal subtotal
        decimal tarifa_domicilio
        bigint id_cupon FK
        decimal descuento_cupon
        decimal total
    }
    ITEM_PEDIDO {
        bigint id PK
        bigint id_pedido FK
        bigint id_producto FK
        string nombre_producto
        string unidad_medida
        decimal precio_unitario
        int cantidad
    }
    PAGO {
        bigint id PK
        bigint id_pedido FK
        string metodo_pago
        string estado
        decimal subtotal_pedido
        decimal tarifa_domicilio_aplicada
        decimal comision_plataforma
        decimal descuento_aplicado
        decimal total_cobrado
        string referencia_gateway
        json datos_sandbox
    }
    NOTIFICACION {
        bigint id PK
        bigint id_usuario FK
        bigint id_pedido FK
        string tipo
        string titulo
        text mensaje
        bool leida
    }
    RESENA {
        bigint id PK
        bigint id_usuario FK
        bigint id_puesto FK
        bigint id_pedido FK
        int calificacion
        text comentario
        text respuesta
        bool visible
    }
    CUPON {
        bigint id PK
        string codigo UK
        bigint id_puesto FK
        string tipo_descuento
        decimal valor
        decimal monto_minimo_pedido
        decimal tope_descuento
        int usos_totales
        int usos_por_usuario
        datetime fecha_inicio
        datetime fecha_fin
        bool activo
    }
    USO_CUPON {
        bigint id PK
        bigint id_cupon FK
        bigint id_usuario FK
        bigint id_pedido FK
        decimal descuento_aplicado
    }
    REGISTRO_AUDITORIA {
        bigint id PK
        bigint id_usuario FK
        string accion
        string entidad
        bigint id_entidad
        json detalle
        string direccion_ip
    }
```

> El campo lógico `password_hash` se implementa con `password` de
> `AbstractBaseUser` (hash PBKDF2). Ver
> [ADR-001](ADR-001-enums.md#decisión-relacionada-password_hash).

## Matriz de permisos por rol

Roles reales: **anónimo**, **comprador**, **vendedor** (cuenta activa sin
verificación aprobada), **vendedor aprobado** y **administrador**. El
administrador puede todo lo que aparece abajo.

| Módulo / acción | Anónimo | Comprador | Vendedor | Vendedor aprobado | Admin |
| --- | :---: | :---: | :---: | :---: | :---: |
| Registro / login / refresh | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver y editar el propio perfil | ⬜ | ✅ | ✅ | ✅ | ✅ |
| Enviar solicitud de verificación | ⬜ | ⬜ | ✅ | ✅ | ⬜ |
| Cola de verificación y decisión | ⬜ | ⬜ | ⬜ | ⬜ | ✅ |
| Ver foto de cédula | ⬜ | ⬜ | ⬜ | ⬜ | ✅ (revisor) |
| Ver catálogo (categorías, puestos, productos, imágenes) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear/editar/borrar puesto y producto | ⬜ | ⬜ | ⬜ | ✅ (dueño) | ✅ |
| Gestionar categorías | ⬜ | ⬜ | ⬜ | ⬜ | ✅ |
| Crear pedido | ⬜ | ✅ | ⬜ | ⬜ | ⬜ |
| Ver/listar pedidos | ⬜ | ✅ (suyos) | ✅ (de sus puestos) | ✅ (de sus puestos) | ✅ |
| Confirmar / preparar / enviar pedido | ⬜ | ⬜ | ⬜ | ✅ (dueño) | ✅ |
| Entregar / cancelar pedido | ⬜ | ✅ (suyo) | ✅ (de sus puestos) | ✅ (de sus puestos) | ✅ |
| Registrar pago | ⬜ | ✅ (suyo) | ⬜ | ⬜ | ✅ |
| Simular pago (sandbox) | ⬜ | ✅ (suyo) | ⬜ | ⬜ | ✅ |
| Confirmar cobro en efectivo | ⬜ | ⬜ | ⬜ | ✅ (dueño) | ✅ |
| Reembolsar / anular pago | ⬜ | ⬜ | ⬜ | ⬜ | ✅ |
| Gestionar direcciones propias | ⬜ | ✅ | ✅ | ✅ | ✅ (todas) |
| Ver/marcar notificaciones propias | ⬜ | ✅ | ✅ | ✅ | ✅ (todas) |
| Listar reseñas públicas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear reseña (pedido entregado) | ⬜ | ✅ | ⬜ | ⬜ | ⬜ |
| Responder reseña | ⬜ | ⬜ | ⬜ | ✅ (dueño) | ✅ |
| Crear cupón de puesto | ⬜ | ⬜ | ⬜ | ✅ (dueño) | ✅ |
| Crear cupón global | ⬜ | ⬜ | ⬜ | ⬜ | ✅ |
| Validar cupón en checkout | ⬜ | ✅ | ✅ | ✅ | ✅ |
| Ver auditoría | ⬜ | ⬜ | ⬜ | ⬜ | ✅ |
| Health check | ✅ | ✅ | ✅ | ✅ | ✅ |
