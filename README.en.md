# RioMarket

Local marketplace for the market stalls of Riohacha, Colombia. It contains the
**Django/DRF REST API** and the **React/Vite SPA**: catalog, orders, payments,
seller verification, reviews, coupons, notifications and audit logs.

[![Python](https://img.shields.io/badge/python-3.12-blue)](https://www.python.org/) [![Django](https://img.shields.io/badge/django-5.2-092E20)](https://www.djangoproject.com/) [![DRF](https://img.shields.io/badge/DRF-3.18-red)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/react-18-61DAFB)](https://react.dev/) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192)](https://www.postgresql.org/)

> Demo: <https://riomarket.onrender.com>. Default Blueprint URL; it may change and
> the free service sleeps. No live deployment was verified from this environment.

## Overview

RioMarket connects stall vendors with local buyers. One order belongs to **one
stall**; the server calculates totals and updates stock transactionally. Roles
are buyer, seller and administrator; sellers must be verified to publish.
Stack: Python 3.12, Django 5.2, DRF, SimpleJWT, PostgreSQL 16, React 18, strict
TypeScript, Vite 5, TanStack Query, Tailwind, pytest, ruff and Vitest.

| Area | Status | Notes |
| --- | --- | --- |
| Session | Ready | Access JWT in memory + refresh in an HttpOnly cookie |
| Catalog and checkout | Ready | Stalls, products, filters, cart and checkout |
| Orders and payments | Ready | States, transactional stock and sandbox payments |
| Reviews and coupons | Ready | Delivered orders only; coupons scoped to a stall |
| Panels | Ready | Buyer, seller and admin in one SPA |
Not included: a real payment gateway, user administration and password changes.

## Quick start

The repository includes a `.env` for the demo; back it up before replacing it.

```bash
# Docker
docker compose up --build -d
docker compose exec web sh -c "python manage.py migrate && python manage.py seed_masivo"
cd frontend && npm ci && cp .env.example .env && npm run dev
```

```bash
# Without Docker; activate the line for your OS
python -m venv .venv
.venv\Scripts\Activate.ps1    # Windows PowerShell
source .venv/bin/activate     # Linux/macOS
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py seed_masivo
python manage.py runserver
```

API: <http://127.0.0.1:8000>; SPA: <http://127.0.0.1:3000>; Swagger: `/api/docs/`; health: `/api/health/`.

## Demo data

Password for all demo accounts: `RioMarket2026!`.

| Role | Email |
| --- | --- |
| Administrator | `admin@riomarket.test` |
| Approved sellers | `carmen@riomarket.test`, `diego@riomarket.test` |
| Buyer | `luis@riomarket.test` |

`seed_masivo` creates **15 users and 522 domain records** on a clean database; `seed_demo` creates **28 records**. Render runs `seed_masivo --if-empty`.

## Authentication

- The short-lived **access** JWT is sent as `Authorization: Bearer` and kept only in memory by the SPA.
- The **refresh** token lives in the `rm_refresh` cookie: `HttpOnly`, `SameSite=Strict`, `Secure` outside development, path `/api/auth/`. It is not returned in the login body.
- Refresh/logout require `X-Requested-With: XMLHttpRequest`; tokens rotate and the previous one is blacklisted. See [`docs/api-ejemplos.md`](docs/api-ejemplos.md).

## API, frontend and tests

Prefixes: `/api/auth/`, `/api/catalog/`, `/api/orders/`, `/api/payments/`,
`/api/addresses/`, `/api/verificacion/`, `/api/reviews/`, `/api/promotions/`,
`/api/notifications/`, `/api/audit/` and `/api/health/`. The SPA lives in
[`frontend/`](frontend/README.md#estado-de-cumplimiento) and Vite proxies `/api`
and `/media`; if you set `VITE_API_URL`, keep the same host as the SPA.

Backend: `pytest -q`, ruff, `makemigrations --check --dry-run` and `spectacular --validate`; **483 tests passing**, no pending migrations and one enum warning. Frontend: lint, typecheck, `npm test` and build; **10 tests passing** in 3 files.

## Deployment and security

`render.yaml` creates a Docker web service and a free PostgreSQL 16 database.
`scripts/render-start.sh` runs `collectstatic`, `migrate`, `seed_masivo --if-empty`
and gunicorn. The free service sleeps and media is ephemeral; see
[`docs/despliegue.md`](docs/despliegue.md).

There is no real payment gateway, user administration or password-change endpoint,
and email delivery is optional. The ID photo is encrypted and served through an
authorized view. `.env` is committed intentionally for the academic delivery and
contains demo credentials: rotate the database password or make the repository
private afterward. There is no `LICENSE` file yet. Maintainer: `calo159`
(<https://github.com/calo159>).

## Documentation

- [Index](docs/README.md), [architecture](docs/arquitectura.md), [API](docs/api-ejemplos.md), [deployment](docs/despliegue.md)
- [Frontend scope](docs/alcance-frontend.md), [maintenance](docs/MANTENIMIENTO.md), [security](SEGURIDAD.md), [presentation](docs/PRESENTACION.md)
- [Delivery guide](entrega/LEEME_ENTREGA.md), [curl flow](entrega/flujo_prueba.curl.md), [Postman](entrega/riomarket_postman.json)
