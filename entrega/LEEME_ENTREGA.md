# RioMarket — Guía de entrega

Backend de marketplace local de Riohacha (Django 5 + Django REST Framework).
Incluye 10 apps, documentación Swagger y una base de datos cargada con **522 registros**.

## 1. Requisitos
- Python 3.12
- pip
- No requiere PostgreSQL local: el `.env` incluido apunta a una base **PostgreSQL en la nube (Supabase)**.

## 2. Instalación y ejecución
```bash
pip install -r requirements.txt
python manage.py migrate        # aplica migraciones (la nube ya migró y tiene datos)
python manage.py runserver      # http://127.0.0.1:8000/
```

> El archivo **`.env` viene incluido y versionado** en la raíz del repo (credenciales
> desechables para esta entrega). Trae `SECRET_KEY`, `FERNET_KEY`, `DATABASE_URL`
> (Supabase, con `sslmode=require` y `CONN_MAX_AGE=0` para el pooler), `DEBUG=True`,
> CORS y variables de pagos. `DEBUG=True` se deja a propósito para no exigir
> HTTPS/HSTS en una entrega académica.

Si la base en la nube no estuviera disponible, se puede recargar localmente:
```bash
# Opción A: restaurar el volcado SQL sobre tu PostgreSQL
psql "TU_DATABASE_URL" -f entrega/datos_riomarket.sql
# Opción B: recargar con el comando de seed (idempotente)
python manage.py seed_masivo
```

## 3. URLs
- Swagger UI: http://127.0.0.1:8000/api/docs/
- Redoc: http://127.0.0.1:8000/api/docs/redoc/
- Admin: http://127.0.0.1:8000/admin/
- Health: http://127.0.0.1:8000/api/health/

## 4. Usuarios de prueba (contraseña para todos: `RioMarket2026!`)
| Rol | Correo |
| --- | --- |
| Administrador (superusuario) | `admin@riomarket.test` |
| Vendedor (aprobado) | `carmen@riomarket.test` |
| Comprador | `luis@riomarket.test` |

(15 usuarios en total: 1 admin, 4 vendedores, 10 compradores.)

## 5. Flujo de prueba en Swagger (6 pasos)
1. **Login** → `POST /api/auth/login/` con `{"correo":"luis@riomarket.test","password":"RioMarket2026!"}`. Copia el `access`.
2. Autoriza Swagger con `Bearer <access>`; **lista productos** → `GET /api/catalog/productos/`. Anota el `id` de un producto y su `id_puesto`.
3. **Crear pedido** → `POST /api/orders/pedidos/` con
   `{"id_puesto": <id_puesto>, "tipo_entrega": "retiro", "items":[{"id_producto": <id>, "cantidad": 1}]}`.
4. **Registrar pago** → `POST /api/payments/pagos/` con `{"pedido": <id_pedido>, "metodo_pago": "simulado"}`.
5. **Aprobar pago (sandbox)** → `POST /api/payments/pagos/{id}/simular/` con `{"accion":"aprobar"}`.
6. **Confirmar y entregar (como vendedor `carmen`)** → `POST /api/orders/pedidos/{id}/confirmar/`,
   luego `POST /api/orders/pedidos/{id}/en-preparacion/`, `.../enviar/`, `.../entregar/`.

## 6. Archivos de respaldo
- `entrega/datos_riomarket.sql` — volcado completo (esquema + datos) de la base cargada.
- `entrega/datos_riomarket.json` — respaldo de datos (Django `dumpdata`).
- `entrega/flujo_prueba.curl.md` — mismos 6 pasos con `curl`.
- `entrega/riomarket_postman.json` — colección Postman opcional.
