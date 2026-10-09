# RioMarket — Backend (English summary)

REST API for the marketplace of the market stalls of Riohacha, Colombia:
catalog, orders, payments, seller identity verification, reviews and
notifications. **This repository is the backend only.**

> Full documentation is in Spanish: see [README.md](README.md).

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Django 5.1 + Django REST Framework 3.17 |
| Auth | JWT (simplejwt) with refresh rotation + blacklist |
| Database | PostgreSQL 16 (SQLite for tests on a clean machine) |
| Cache | Redis 7 (production only) |
| Docs | drf-spectacular (Swagger UI, Redoc, OpenAPI schema) |
| Quality | ruff, pytest + pytest-django + factory_boy |
| Containers | Docker Compose (postgres, redis, web) |

## Features

- JWT auth, roles (buyer, seller, admin) and seller identity verification.
- Catalog: categories, stalls, products and images.
- Orders tied to a single stall, with atomic stock and a state machine.
- Payments: cash, sandbox + signed webhook, platform fee and refunds.
- Delivery addresses, in-app notifications, reviews and coupons.
- Action audit log (admin-only) and OpenAPI documentation.

## Quick start (Docker)

```bash
git clone https://github.com/calo159/riomarket-backend.git
cd riomarket-backend
cp .env.example .env          # Windows: copy .env.example .env
docker compose up --build -d
docker compose exec web python manage.py migrate
docker compose exec web python manage.py seed_demo
```

- Health: <http://localhost:8000/api/health/>
- Swagger UI: <http://localhost:8000/api/docs/>
- Django admin: <http://localhost:8000/admin/>

## Tests

```bash
pytest        # 473 tests
```

## License

There is **no `LICENSE` file yet**; the owner must choose one. See the Spanish
[README](README.md#contribuir-licencia-y-autores) for details.
