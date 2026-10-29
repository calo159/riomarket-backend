# Flujo de prueba con curl (RioMarket)

Base: `http://127.0.0.1:8000`. Requiere una base sembrada con
`python manage.py seed_masivo` y `python` disponible para extraer IDs.

## 1. Login del comprador

```bash
COOKIE_COMP=cookies-comprador.txt
TOKEN=$(curl -s -c "$COOKIE_COMP" -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"correo":"luis@riomarket.test","password":"RioMarket2026!"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['access'])")
```

## 2. Elegir un producto del puesto 1 (Carmen)

```bash
PUESTO=1
PRODUCTO=$(curl -s "http://127.0.0.1:8000/api/catalog/productos/?puesto=1&page_size=1" \
  -H "Authorization: Bearer $TOKEN" \
  | python -c "import sys,json;print(json.load(sys.stdin)['results'][0]['id'])")
```

## 3. Crear pedido

```bash
PEDIDO=$(curl -s -X POST http://127.0.0.1:8000/api/orders/pedidos/ \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"id_puesto\": $PUESTO, \"tipo_entrega\": \"retiro\",
       \"items\": [{\"id_producto\": $PRODUCTO, \"cantidad\": 1}]}" \
  | python -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "pedido=$PEDIDO"
```

## 4. Registrar pago en efectivo

```bash
PAGO=$(curl -s -X POST http://127.0.0.1:8000/api/payments/pagos/ \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"pedido\": $PEDIDO, \"metodo_pago\": \"efectivo\"}" \
  | python -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "pago=$PAGO"
```

## 5. Login del vendedor y cobro en efectivo

```bash
COOKIE_VEND=cookies-vendedor.txt
TOKEN_VENDEDOR=$(curl -s -c "$COOKIE_VEND" \
  -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"correo":"carmen@riomarket.test","password":"RioMarket2026!"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['access'])")

curl -s -X POST "http://127.0.0.1:8000/api/payments/pagos/$PAGO/confirmar-efectivo/" \
  -H "Authorization: Bearer $TOKEN_VENDEDOR" \
  -H "Content-Type: application/json" -d '{}'
```

## 6. Confirmar y enviar (vendedor Carmen) y recibir (comprador)

```bash
for accion in confirmar en-preparacion enviar; do
  curl -s -X POST "http://127.0.0.1:8000/api/orders/pedidos/$PEDIDO/$accion/" \
    -H "Authorization: Bearer $TOKEN_VENDEDOR" \
    -H "Content-Type: application/json" -d '{}'
  echo
done

# Solo el comprador confirma que recibió el pedido
curl -s -X POST "http://127.0.0.1:8000/api/orders/pedidos/$PEDIDO/entregar/" \
  -H "Authorization: Bearer $TOKEN_COMPRADOR" \
  -H "Content-Type: application/json" -d '{}'
```

El pedido queda en `entregado` y el pago en `aprobado`. Para renovar el access
del comprador usa `POST /api/auth/token/refresh/` con `-b "$COOKIE_COMP"` y
`-H "X-Requested-With: XMLHttpRequest"`.
