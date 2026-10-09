# Ejemplos de uso de la API

Flujo completo probado contra un servidor con `python manage.py seed_demo`. Los
usuarios demo son:

| Usuario | Correo | Rol |
| --- | --- | --- |
| Admin | `admin@riomarket.test` | administrador |
| Carmen | `carmen@riomarket.test` | vendedor (aprobado) |
| Diego | `diego@riomarket.test` | vendedor (aprobado) |
| Luis | `luis@riomarket.test` | comprador |

Contraseña por defecto de todos: `RioMarket2026!` (cámbiala con
`--password`). Base de la API: `http://localhost:8000`.

> Los montos de domicilio usan `DOMICILIO_TARIFA_BASE`, que por defecto es
> `0.00`. Con la variable sin ajustar verás `tarifa_domicilio` y
> `total_cobrado` iguales al subtotal.

## 1. Login

```bash
BASE=http://localhost:8000

curl -s -X POST "$BASE/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"correo":"carmen@riomarket.test","password":"RioMarket2026!"}'
```

```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 4,
    "nombre": "Carmen Sofía Iguarán",
    "correo": "carmen@riomarket.test",
    "celular": "3000000002",
    "rol": "vendedor",
    "estado": "activo"
  }
}
```

Guarda el `access` y el `refresh` en variables:

```bash
TOKEN_COMP=$(curl -s -X POST "$BASE/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"correo":"luis@riomarket.test","password":"RioMarket2026!"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['access'])")

TOKEN_VEND=$(curl -s -X POST "$BASE/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"correo":"carmen@riomarket.test","password":"RioMarket2026!"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['access'])")
```

Renovar el access y cerrar sesión:

```bash
curl -s -X POST "$BASE/api/auth/token/refresh/" \
  -H "Content-Type: application/json" \
  -d '{"refresh":"<refresh>"}'

curl -s -X POST "$BASE/api/auth/logout/" \
  -H "Authorization: Bearer $TOKEN_COMP" \
  -H "Content-Type: application/json" \
  -d '{"refresh":"<refresh>"}'   # 204 No Content (revoca el refresh)
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
  "id": 6,
  "id_vendedor": 4,
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
TOKEN_ADMIN=$(curl -s -X POST "$BASE/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@riomarket.test","password":"RioMarket2026!"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['access'])")

curl -s -X POST "$BASE/api/catalog/categorias/" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Frutas"}'

# Asignar la categoría 5 al puesto 6
curl -s -X POST "$BASE/api/catalog/puestos/6/categorias/" \
  -H "Authorization: Bearer $TOKEN_VEND" \
  -H "Content-Type: application/json" \
  -d '{"categoria": 5}'
```

## 4. Crear un producto

La categoría debe estar asignada al puesto antes de publicar el producto
(regla 2).

```bash
curl -s -X POST "$BASE/api/catalog/productos/" \
  -H "Authorization: Bearer $TOKEN_VEND" \
  -H "Content-Type: application/json" \
  -d '{
    "id_puesto": 6,
    "id_categoria": 5,
    "nombre": "Mango tommy",
    "descripcion": "Mango dulce",
    "precio": "5000.00",
    "stock": 50,
    "unidad_medida": "unidad"
  }'
```

```json
{
  "id": 6,
  "id_puesto": 6,
  "id_categoria": 5,
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
    "id_puesto": 6,
    "tipo_entrega": "domicilio",
    "direccion_entrega": "Calle 15 #12-30",
    "referencia_entrega": "Portón azul",
    "notas": "Dejar en la portería",
    "items": [{"id_producto": 6, "cantidad": 3}]
  }'
```

```json
{
  "id": 4,
  "id_comprador": 6,
  "id_puesto": 6,
  "tipo_entrega": "domicilio",
  "estado": "pendiente",
  "subtotal": "15000.00",
  "tarifa_domicilio": "0.00",
  "descuento_cupon": "0.00",
  "total": "15000.00",
  "items": [
    {
      "id_producto": 6,
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
  -d '{"pedido": 4, "metodo_pago": "efectivo"}'

# El vendedor confirma el cobro (pasa a aprobado)
curl -s -X POST "$BASE/api/payments/pagos/1/confirmar-efectivo/" \
  -H "Authorization: Bearer $TOKEN_VEND" \
  -H "Content-Type: application/json" \
  -d '{}'
```

La respuesta del vendedor incluye `comision_plataforma` y `neto_vendedor`:

```json
{
  "id": 1,
  "id_pedido": 4,
  "metodo_pago": "efectivo",
  "estado": "aprobado",
  "subtotal_pedido": "15000.00",
  "tarifa_domicilio_aplicada": "0.00",
  "descuento_aplicado": "0.00",
  "total_cobrado": "15000.00",
  "referencia_gateway": "efectivo-cobrado",
  "comision_plataforma": "0.00",
  "neto_vendedor": "15000.00"
}
```

En sandbox también puedes simular con `POST /api/payments/pagos/1/simular/`
(`{"accion":"aprobar"}`) si `PAYMENTS_SANDBOX_ENABLED=True`.

## 7. Avanzar el pedido

Confirmar exige un pago en estado `aprobado`.

```bash
for accion in confirmar en-preparacion enviar entregar; do
  curl -s -X POST "$BASE/api/orders/pedidos/4/$accion/" \
    -H "Authorization: Bearer $TOKEN_VEND" \
    -H "Content-Type: application/json" -d '{}'
  echo
done
```

Secuencia de `estado`: `pendiente → confirmado → en_preparacion → en_camino →
entregado`.

## 8. Formato de error

Todas las respuestas de error usan el mismo envoltorio. Ejemplo real al pedir
más stock del disponible (`400`):

```bash
curl -s -X POST "$BASE/api/orders/pedidos/" \
  -H "Authorization: Bearer $TOKEN_COMP" \
  -H "Content-Type: application/json" \
  -d '{"id_puesto":6,"tipo_entrega":"retiro","items":[{"id_producto":6,"cantidad":99999}]}'
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
  "count": 6,
  "next": "http://localhost:8000/api/catalog/productos/?page=2&page_size=2",
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

curl -s -X PATCH "$BASE/api/verificacion/solicitudes/3/" \
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
    "id_puesto": 6,
    "tipo_descuento": "porcentaje",
    "valor": "5.00",
    "monto_minimo_pedido": "10000.00",
    "tope_descuento": "2000.00"
  }'

# Validar sin consumir (checkout)
curl -s -X POST "$BASE/api/promotions/cupones/validar/" \
  -H "Authorization: Bearer $TOKEN_COMP" \
  -H "Content-Type: application/json" \
  -d '{"codigo": "CARIBE5", "id_puesto": 6, "subtotal": "15000.00"}'
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
  -d '{"id_puesto": 6, "calificacion": 5, "comentario": "Fruta fresca y puntual"}'

# El vendedor responde
curl -s -X POST "$BASE/api/reviews/resenas/1/responder/" \
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
