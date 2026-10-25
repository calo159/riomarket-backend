# RioMarket

Local marketplace for the market stalls of Riohacha, Colombia. This repository
contains the **Django/DRF REST API** and the **React/Vite SPA**: catalog, orders,
payments, seller verification, reviews, coupons, notifications and audit logs.

## Quick start

```bash
git clone https://github.com/calo159/riomarket-backend.git
cd riomarket-backend
cp .env.example .env          # Windows: copy .env.example .env
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py seed_masivo
python manage.py runserver
```

The API is available at <http://127.0.0.1:8000>; Swagger is at `/api/docs/`.
The SPA runs separately with `cd frontend`, `npm ci`, `cp .env.example .env`
and `npm run dev`, then opens at <http://127.0.0.1:3000>.

## Demo users

Password for all accounts: `RioMarket2026!`.

| Role | Email |
| --- | --- |
| Administrator | `admin@riomarket.test` |
| Approved seller | `carmen@riomarket.test` |
| Approved seller | `diego@riomarket.test` |
| Buyer | `luis@riomarket.test` |

`seed_masivo` creates 15 users and 522 domain records on a clean database.
`seed_demo` provides a minimal dataset. Render runs `seed_masivo --if-empty`, so
it only seeds a database with fewer than 100 records.

## Authentication

- The short-lived **access** token is sent as `Authorization: Bearer` and kept
  only in memory by the SPA.
- The **refresh** token lives in the `rm_refresh` cookie: `HttpOnly`,
  `SameSite=Strict`, `Secure` outside development, path `/api/auth/`. It is not
  returned in the login response body.
- Refresh and logout require `X-Requested-With: XMLHttpRequest`; tokens rotate
  and the previous token is blacklisted.
- The backend enforces authorization; the frontend only hides routes and actions.

See [`docs/api-ejemplos.md`](docs/api-ejemplos.md) for the complete `curl` flow.

## Tests

Backend:

```bash
pytest -q
ruff check apps config tests --no-cache
python manage.py makemigrations --check --dry-run
python manage.py spectacular --file schema.yaml --validate
```

Current result: **483 backend tests passing**, no pending migrations, and no
OpenAPI errors (one enum-naming warning). Tests use in-memory SQLite; set
`TEST_DATABASE_URL` to run against PostgreSQL.

Frontend (`cd frontend`): `npm run lint`, `npm run typecheck`, `npm test` and
`npm run build`. Current result: **10 tests passing** in 3 files, all green.
`npm run test:e2e` runs the Playwright smoke tests after `npx playwright install
chromium`.

## Deployment

`render.yaml` creates a Docker web service and a free PostgreSQL database.
`scripts/render-start.sh` runs `collectstatic`, `migrate` and
`seed_masivo --if-empty`, then starts gunicorn. `Dockerfile.render` builds the
SPA and WhiteNoise serves the assets.

The free plan sleeps after 15 minutes of inactivity, the database expires after
30 days and uploaded media is lost on redeploy. See
[`docs/despliegue.md`](docs/despliegue.md) for Supabase and production notes.

## Documentation

- [Documentation index](docs/README.md) and
  [architecture/permissions](docs/arquitectura.md)
- [API examples](docs/api-ejemplos.md) and [deployment](docs/despliegue.md)
- [Frontend scope](docs/alcance-frontend.md) and
  [maintenance audit](docs/MANTENIMIENTO.md)
- [Security](SEGURIDAD.md) and [presentation guide](docs/PRESENTACION.md)

## Known limitations

- There is no real payment gateway; only `PasarelaSandbox` exists. Disable
  `PAYMENTS_SANDBOX_ENABLED` in production.
- Email delivery is optional and requires SMTP configuration.
- There is no user-administration or password-change endpoint.
- `media/` and `media_privado/` use local disk and are ephemeral on Render.
- `.env` is committed intentionally for the academic delivery and contains
  Supabase credentials. Rotate them or make the repository private afterwards.
