# Arquitectura de RioMarket Backend

Documento de apoyo del [README](../README.md). Contiene el detalle que haría
ruido en la portada: dependencias entre apps, modelo entidad-relación completo
y matriz de permisos por rol. Los diagramas de secuencia (checkout, retiro con
cobro, apartar con plazo, encargo), el de despliegue y los de estados están en
[diagramas.md](diagramas.md).

## Dependencias entre apps

Las apps forman **capas** y cada una importa solo de las de nivel menor; el detalle y las razones están en
[ADR-017](ADR-017-arquitectura-en-capas.md) y una prueba (`tests/test_arquitectura.py`) lo hace cumplir.

```mermaid
flowchart BT
    subgraph N0["Nivel 0 · núcleo (no conoce el dominio)"]
        common
    end
    subgraph N1["Nivel 1 · autorización"]
        rbac
    end
    subgraph N2["Nivel 2"]
        accounts
        audit
        notifications
    end
    subgraph N3["Nivel 3"]
        addresses
        catalog
    end
    subgraph N4["Nivel 4"]
        promotions
        sitio
    end
    subgraph N5["Nivel 5 · proceso de compra"]
        orders <--> payments
    end
    subgraph N6["Nivel 6"]
        reviews
    end
    subgraph N7["Nivel 7"]
        administration
    end
    subgraph N8["Nivel 8 · solo demostración"]
        demo
    end
    N1 --> N0
    N2 --> N1
    N3 --> N2
    N4 --> N3
    N5 --> N4
    N6 --> N5
    N7 --> N6
    N8 --> N7
```

Si una app de nivel bajo necesita algo de una de nivel alto, **no importa hacia arriba**: define un punto de
extensión y la app alta se registra al arrancar (`AppConfig.ready`). Hay dos:

- **Insignias del menú** (`rbac.menu.registrar_insignia`): `orders`, `payments`, `notifications` y `accounts`
  aportan los contadores de sus recursos.
- **Anotaciones del catálogo** (`catalog.anotaciones.registrar_anotador`): `reviews` aporta la reputación de los
  puestos y la calificación del puesto de cada producto.

`orders` ↔ `payments` es la única dependencia mutua aceptada (un pedido y su cobro son el mismo proceso). Ya no
hay imports diferidos para esquivar ciclos: todos los imports entre apps van al inicio del archivo.

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
        string modalidad "stock | encargo"
        int preparacion_horas "solo encargo, 1 a 336"
        bool pide_detalles
        string etiqueta_detalles
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
        datetime fecha_solicitada "solo con encargos"
    }
    ITEM_PEDIDO {
        bigint id PK
        bigint id_pedido FK
        bigint id_producto FK
        string nombre_producto
        string unidad_medida
        decimal precio_unitario
        int cantidad
        string modalidad "copia: decide si cancelar repone stock"
        string detalles "lo que escribió el comprador"
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
| Confirmar / preparar / enviar (domicilio) / marcar listo para recoger (retiro) | ⬜ | ⬜ | ⬜ | ✅ (dueño) | ✅ |
| Confirmar recepción (`entregado`) | ⬜ | ✅ (suyo; en retiro con efectivo sin cobrar no) | ⬜ | ✅ (solo retiro: entrega y cobra) | ✅ |
| Reportar `no-recibido` (domicilio en camino) | ⬜ | ✅ (suyo) | ⬜ | ⬜ | ✅ |
| Cancelar pedido | ⬜ | ✅ (suyo) | ✅ (de sus puestos) | ✅ (de sus puestos) | ✅ |
| Dar más tiempo a un retiro (`extender-plazo`, máx. 2 veces) | ⬜ | ⬜ | ⬜ | ✅ (dueño) | ✅ |
| Cancelado por el sistema (plazo vencido, auditoría «Sistema») | — | — | — | — | — |
| Registrar pago | ⬜ | ✅ (suyo) | ⬜ | ⬜ | ✅ |
| Simular pago (sandbox) | ⬜ | ✅ (suyo) | ⬜ | ⬜ | ✅ |
| Confirmar cobro en efectivo | ⬜ | ⬜ | ⬜ | ✅ (dueño) | ✅ |
| Reembolsar / anular pago | ⬜ | ⬜ | ⬜ | ⬜ | ✅ |
| Ver ventas (`/api/payments/ventas/`, recurso `vendedor.ventas`) | ⬜ | ⬜ | ⬜ | ✅ (solo sus puestos) | ✅ (todo el mercado) |
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
