# Flujo de prueba con curl (RioMarket)

Base: `http://127.0.0.1:8000`

## 1. Login (comprador)
```bash
curl -s -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"correo":"luis@riomarket.test","password":"RioMarket2026!"}'
# Copia el valor de "access" de la respuesta.
```

## 2. Listar productos
```bash
curl -s "http://127.0.0.1:8000/api/catalog/productos/?page=1" \
  -H "Authorization: Bearer $TOKEN"
# Anota el id de un producto y su id_puesto.
```

## 3. Crear pedido
```bash
curl -s -X POST http://127.0.0.1:8000/api/orders/pedidos/ \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id_puesto": 1, "tipo_entrega": "retiro",
       "items": [{"id_producto": 1, "cantidad": 1}]}'
# Anota el id del pedido.
```

## 4. Registrar pago
```bash
curl -s -X POST http://127.0.0.1:8000/api/payments/pagos/ \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"pedido": 1, "metodo_pago": "simulado"}'
# Anota el id del pago.
```

## 5. Aprobar pago (sandbox)
```bash
curl -s -X POST http://127.0.0.1:8000/api/payments/pagos/1/simular/ \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"accion": "aprobar"}'
```

## 6. Confirmar y entregar (vendedor carmen)
```bash
# Login como vendedor
curl -s -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"correo":"carmen@riomarket.test","password":"RioMarket2026!"}'
# usa el access como $TOKEN_VENDEDOR

curl -s -X POST http://127.0.0.1:8000/api/orders/pedidos/1/confirmar/ \
  -H "Authorization: Bearer $TOKEN_VENDEDOR"
curl -s -X POST http://127.0.0.1:8000/api/orders/pedidos/1/en-preparacion/ \
  -H "Authorization: Bearer $TOKEN_VENDEDOR"
curl -s -X POST http://127.0.0.1:8000/api/orders/pedidos/1/enviar/ \
  -H "Authorization: Bearer $TOKEN_VENDEDOR"
curl -s -X POST http://127.0.0.1:8000/api/orders/pedidos/1/entregar/ \
  -H "Authorization: Bearer $TOKEN_VENDEDOR"
```
