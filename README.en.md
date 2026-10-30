# RioMarket

Local marketplace for the market stalls of Riohacha, Colombia: a **Django/DRF REST API** plus a
**React/Vite SPA** with catalog, orders, payments, seller verification, reviews, coupons,
notifications, audit logs and a full **role/resource administration** (RBAC).

> The Spanish [README.md](README.md) is the reference document; this page is a short English summary.

[![Python](https://img.shields.io/badge/python-3.12-blue)](https://www.python.org/) [![Django](https://img.shields.io/badge/django-5.2-092E20)](https://www.djangoproject.com/) [![React](https://img.shields.io/badge/react-18-61DAFB)](https://react.dev/) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192)](https://www.postgresql.org/)

Demo (Render): <https://riomarket.onrender.com>. The free service sleeps and the URL may change.

## What it does

- One order belongs to **one stall**; the server computes totals and updates stock transactionally.
- Order flow: `pendiente → confirmado → en_preparacion → en_camino → entregado` (or `cancelado`).
  The **seller** confirms, prepares and ships; only the **buyer** (or an admin) confirms delivery,
  and the buyer can report "it has not arrived".
- Sellers must be verified (encrypted ID number, private ID photo) before publishing.
- **RBAC**: users have a base role (buyer, seller, administrator) plus optional custom roles. Roles
  grant *resources* (screens/modules); the menu and the admin API are driven by them. System roles
  and resources are protected by lock-outs (e.g. the administrator role cannot lose `admin.roles`).
- Every sensitive admin action requires a reason, is audited and notifies the person affected.

## Quick start

```bash
cp .env.example .env            # fill SECRET_KEY and FERNET_KEY (the .env is NOT versioned)
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py seed_masivo    # demo data (password: see README.md)
python manage.py runserver

cd frontend && npm ci && npm run dev
```

## Tests and quality

```bash
pytest -q                       # backend (SQLite in memory; set TEST_DATABASE_URL for PostgreSQL)
ruff check apps tests && ruff format --check apps
cd frontend && npx tsc --noEmit && npx eslint src && npx vitest run && npm run build
```

CI (GitHub Actions) runs lint, migrations check, the backend suite against PostgreSQL, the
OpenAPI validation and the frontend lint, typecheck, tests and build.

## Deployment (Render + Supabase)

`render.yaml` builds `Dockerfile.render`; `scripts/render-start.sh` runs `collectstatic`, `migrate`,
`createcachetable` and (if `SEED_DEMO=true`) the demo seed. Set `DATABASE_URL`, `SECRET_KEY`,
`FERNET_KEY` and optionally the `STORAGE_S3_*` variables (a private bucket keeps the ID photos).
See `docs/despliegue.md` and `docs/AUDITORIA.md` (security notes and pending proposals).

## Documentation

`docs/README.md` is the index: architecture, ADRs, API examples, deployment and the audit report.
