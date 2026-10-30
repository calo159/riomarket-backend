# Ejemplos de uso de la API

Flujo validado con `django.test.Client` sobre una copia de una base sembrada con
`python manage.py seed_masivo`. Las respuestas son extractos reales; los campos
omitidos no cambian el contrato. Los usuarios demo son:

| Usuario | Correo | Rol |
| --- | --- | --- |
| Admin | `admin@riomarket.test` | administrador |
| Carmen | `carmen@riomarket.test` | vendedor (aprobado) |
| Diego | `diego@riomarket.test` | vendedor (aprobado) |
| Luis | `luis@riomarket.test` | comprador |

Contraseña por defecto de todos: `RioMarket2026!` (cámbiala con
`--password`). Base de la API: `http://127.0.0.1:8000`.

> Los IDs siguientes corresponden a una base limpia sembrada con `seed_masivo`.
> Si tu base ya tenía datos, consulta los IDs reales antes de ejecutar el flujo.
> Domicilio: `DOMICILIO_TARIFA_BASE` (3000.00); comisión:
> `PLATFORM_COMMISSION_PERCENTAGE` (5.00). Para retiro la tarifa es 0.00.

## 1. Login

Cada rol usa su propio cookie jar para que el refresh no se mezcle:

```bash
BASE=http://127.0.0.1:8000
COOKIE_COMP=cookies-comprador.txt
COOKIE_VEND=cookies-vendedor.txt
COOKIE_ADMIN=cookies-admin.txt

curl -s -c "$COOKIE_VEND" -X POST "$BASE/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"correo":"carmen@riomarket.test","password":"RioMarket2026!"}'
```

```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 2,
    "nombre": "Carmen Sofía Iguarán",
    "correo": "carmen@riomarket.test",
    "celular": "3000000002",
    "rol": "vendedor",
    "estado": "activo"
  }
}
```

El `refresh` queda en la cookie `rm_refresh`; no aparece en el JSON. Guarda los
tres `access` en variables y reutiliza cada cookie con `-b`:

```bash
TOKEN_COMP=$(curl -s -c "$COOKIE_COMP" -X POST "$BASE/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"correo":"luis@riomarket.test","password":"RioMarket2026!"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['access'])")

TOKEN_VEND=$(curl -s -c "$COOKIE_VEND" -X POST "$BASE/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"correo":"carmen@riomarket.test","password":"RioMarket2026!"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['access'])")

TOKEN_ADMIN=$(curl -s -c "$COOKIE_ADMIN" -X POST "$BASE/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@riomarket.test","password":"RioMarket2026!"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['access'])")
```

Renovar el access y cerrar sesión. La cookie y `X-Requested-With` son
obligatorias en ambas rutas:

```bash
curl -s -b "$COOKIE_VEND" -c "$COOKIE_VEND" -X POST "$BASE/api/auth/token/refresh/" \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{}'

curl -s -b "$COOKIE_VEND" -X POST "$BASE/api/auth/logout/" \
  -H "Authorization: Bearer $TOKEN_VEND" \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{}'   # 204 No Content (revoca el refresh)
```

## 2. Crear un puesto (vendedor aprobado)

```bash
curl -s -X POST "$BASE/api/catalog/puestos/" \
  -H "Authorization: Bearer $TOKEN_VEND" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Frutas del Caribe",
    "descripcion": "Frutas frescas",
    "direccion": "Mercado Nuevo, local 5",
    "latitud": "11.544000",
    "longitud": "-72.907000",
    "horario": "Lun-Sab 6:00-18:00",
    "ofrece_domicilio": true
  }'
```

```json
{
  "id": 7,
  "id_vendedor": 2,
  "nombre": "Frutas del Caribe",
  "descripcion": "Frutas frescas",
  "direccion": "Mercado Nuevo, local 5",
  "latitud": "11.544000",
  "longitud": "-72.907000",
  "horario": "Lun-Sab 6:00-18:00",
  "ofrece_domicilio": true,
  "estado": "activo",
  "calificacion_promedio": null,
  "cantidad_resenas": 0,
  "categorias": []
}
```

## 3. Crear categoría (admin) y asignarla al puesto

```bash
curl -s -X POST "$BASE/api/catalog/categorias/" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Frutas"}'
# Respuesta: {"id": 9, "nombre": "Frutas", ...}

# Asignar la categoría 9 al puesto 7
curl -s -X POST "$BASE/api/catalog/puestos/7/categorias/" \
  -H "Authorization: Bearer $TOKEN_VEND" \
  -H "Content-Type: application/json" \
  -d '{"categoria": 9}'
```

## 4. Crear un producto

La categoría debe estar asignada al puesto antes de publicar el producto
(regla 2).

```bash
curl -s -X POST "$BASE/api/catalog/productos/" \
  -H "Authorization: Bearer $TOKEN_VEND" \
  -H "Content-Type: application/json" \
  -d '{
    "id_puesto": 7,
    "id_categoria": 9,
    "nombre": "Mango tommy",
    "descripcion": "Mango dulce",
    "precio": "5000.00",
    "stock": 50,
    "unidad_medida": "unidad"
  }'
```

```json
{
  "id": 41,
  "id_puesto": 7,
  "id_categoria": 9,
  "nombre": "Mango tommy",
  "descripcion": "Mango dulce",
  "precio": "5000.00",
  "stock": 50,
  "unidad_medida": "unidad",
  "estado": "activo",
  "imagenes": []
}
```

## 5. Crear un pedido (comprador)

El servidor calcula los montos y descuenta el stock. El comprador solo envía
producto y cantidad.

```bash
curl -s -X POST "$BASE/api/orders/pedidos/" \
  -H "Authorization: Bearer $TOKEN_COMP" \
  -H "Content-Type: application/json" \
  -d '{
    "id_puesto": 7,
    "tipo_entrega": "domicilio",
    "direccion_entrega": "Calle 15 #12-30",
    "referencia_entrega": "Portón azul",
    "notas": "Dejar en la portería",
    "items": [{"id_producto": 41, "cantidad": 3}]
  }'
```

```json
{
  "id": 31,
  "id_comprador": 6,
  "id_puesto": 7,
  "tipo_entrega": "domicilio",
  "estado": "pendiente",
  "subtotal": "15000.00",
  "tarifa_domicilio": "3000.00",
  "descuento_cupon": "0.00",
  "total": "18000.00",
  "items": [
    {
      "id": 32,
      "id_producto": 41,
      "nombre_producto": "Mango tommy",
      "unidad_medida": "unidad",
      "precio_unitario": "5000.00",
      "cantidad": 3,
      "subtotal": "15000.00"
    }
  ]
}
```

## 6. Registrar el pago y cobrar en efectivo

```bash
# El comprador registra el pago
curl -s -X POST "$BASE/api/payments/pagos/" \
  -H "Authorization: Bearer $TOKEN_COMP" \
  -H "Content-Type: application/json" \
  -d '{"pedido": 31, "metodo_pago": "efectivo"}'

# El vendedor confirma el cobro (pasa a aprobado)
curl -s -X POST "$BASE/api/payments/pagos/29/confirmar-efectivo/" \
  -H "Authorization: Bearer $TOKEN_VEND" \
  -H "Content-Type: application/json" \
  -d '{}'
```

La respuesta del vendedor incluye `comision_plataforma` y `neto_vendedor`:

```json
{
  "id": 29,
  "id_pedido": 31,
  "metodo_pago": "efectivo",
  "estado": "aprobado",
  "subtotal_pedido": "15000.00",
  "tarifa_domicilio_aplicada": "3000.00",
  "descuento_aplicado": "0.00",
  "total_cobrado": "18000.00",
  "referencia_gateway": "efectivo-cobrado",
  "comision_plataforma": "750.00",
  "neto_vendedor": "14250.00"
}
```

En sandbox también puedes simular con `POST /api/payments/pagos/29/simular/`
(`{"accion":"aprobar"}`) si `PAYMENTS_SANDBOX_ENABLED=True`.

## 7. Avanzar el pedido

Confirmar exige un pago en estado `aprobado`.

```bash
# El vendedor confirma, prepara y lo marca en camino.
for accion in confirmar en-preparacion enviar; do
  curl -s -X POST "$BASE/api/orders/pedidos/31/$accion/" \
    -H "Authorization: Bearer $TOKEN_VEND" \
    -H "Content-Type: application/json" -d '{}'
  echo
done

# Solo el comprador confirma la recepción.
curl -s -X POST "$BASE/api/orders/pedidos/31/entregar/" \
  -H "Authorization: Bearer $TOKEN_COMP" \
  -H "Content-Type: application/json" -d '{}'
```

Secuencia de `estado`: `pendiente ��' confirmado ��' en_preparacion ��' en_camino ��'
entregado`. Si no llega, el comprador puede usar
`POST /api/orders/pedidos/31/no-recibido/` con `{"motivo": "..."}` (opcional); el
pedido sigue en `en_camino` y el comprador aún puede confirmarlo después.

## 8. Formato de error

Todas las respuestas de error usan el mismo envoltorio. Ejemplo real al pedir
más stock del disponible (`400`):

```bash
curl -s -X POST "$BASE/api/orders/pedidos/" \
  -H "Authorization: Bearer $TOKEN_COMP" \
  -H "Content-Type: application/json" \
  -d '{"id_puesto":7,"tipo_entrega":"retiro","items":[{"id_producto":41,"cantidad":99999}]}'
```

```json
{
  "success": false,
  "status_code": 400,
  "errors": {
    "items": ["Stock insuficiente para 'Mango tommy': quedan 47 unidades."]
  }
}
```

## 9. Paginación

```bash
curl -s "$BASE/api/catalog/productos/?page_size=2&ordering=precio" \
  -H "Authorization: Bearer $TOKEN_COMP"
```

```json
{
  "count": 41,
  "next": "http://127.0.0.1:8000/api/catalog/productos/?page=2&page_size=2",
  "previous": null,
  "results": ["..."]
}
```

Parámetros: `page`, `page_size` (máximo 100, por defecto 20) y `ordering`
(whitelist por módulo).

## 10. Verificación de identidad (vendedor)

```bash
# Enviar la solicitud (multipart: número + foto de cédula)
curl -s -X POST "$BASE/api/verificacion/mi-verificacion/" \
  -H "Authorization: Bearer $TOKEN_VEND" \
  -F "numero_cedula=1122334455" \
  -F "foto_cedula=@cedula.jpg"

# Consultar el estado de la propia solicitud
curl -s "$BASE/api/verificacion/mi-verificacion/" \
  -H "Authorization: Bearer $TOKEN_VEND"

# El admin lista y decide
curl -s "$BASE/api/verificacion/solicitudes/?estado=pendiente" \
  -H "Authorization: Bearer $TOKEN_ADMIN"

# Usa el id devuelto por el listado anterior
ID_SOLICITUD=1
curl -s -X PATCH "$BASE/api/verificacion/solicitudes/$ID_SOLICITUD/" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"estado":"aprobado"}'
```

## 11. Cupones (promociones)

```bash
# El vendedor crea un cupón de su puesto (5% con tope)
curl -s -X POST "$BASE/api/promotions/cupones/" \
  -H "Authorization: Bearer $TOKEN_VEND" \
  -H "Content-Type: application/json" \
  -d '{
    "codigo": "CARIBE5",
    "id_puesto": 7,
    "tipo_descuento": "porcentaje",
    "valor": "5.00",
    "monto_minimo_pedido": "10000.00",
    "tope_descuento": "2000.00"
  }'

# Validar sin consumir (checkout)
curl -s -X POST "$BASE/api/promotions/cupones/validar/" \
  -H "Authorization: Bearer $TOKEN_COMP" \
  -H "Content-Type: application/json" \
  -d '{"codigo": "CARIBE5", "id_puesto": 7, "subtotal": "15000.00"}'
```

Al crear el pedido se puede enviar `"codigo_cupon": "CARIBE5"` en el cuerpo.

## 12. Direcciones, reseñas y notificaciones

```bash
# Direcciones del comprador
curl -s -X POST "$BASE/api/addresses/direcciones/" \
  -H "Authorization: Bearer $TOKEN_COMP" \
  -H "Content-Type: application/json" \
  -d '{"alias":"Casa","direccion":"Calle 15 #12-30","referencia":"Portón azul","es_predeterminada":true}'

# Reseña tras un pedido entregado
curl -s -X POST "$BASE/api/reviews/resenas/" \
  -H "Authorization: Bearer $TOKEN_COMP" \
  -H "Content-Type: application/json" \
  -d '{"id_puesto": 7, "id_pedido": 31, "calificacion": 5, "comentario": "Fruta fresca y puntual"}'

# El vendedor responde; usa el id devuelto al crear la reseña
ID_RESENA=16
curl -s -X POST "$BASE/api/reviews/resenas/$ID_RESENA/responder/" \
  -H "Authorization: Bearer $TOKEN_VEND" \
  -H "Content-Type: application/json" \
  -d '{"respuesta": "¡Gracias por preferirnos!"}'

# Notificaciones del usuario
curl -s "$BASE/api/notifications/notificaciones/contador/" \
  -H "Authorization: Bearer $TOKEN_COMP"
```

## 13. Auditoría (solo admin)

```bash
curl -s "$BASE/api/audit/registros/?entidad=pedido&accion=transicion&ordering=-fecha_creacion" \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```
