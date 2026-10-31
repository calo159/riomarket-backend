#!/usr/bin/env bash
set -e
python manage.py collectstatic --noinput
python manage.py migrate --noinput
python manage.py createcachetable
# Render puede escribir "True"/"1"/"yes": normalizar antes de comparar.
seed_demo="$(printf '%s' "${SEED_DEMO:-false}" | tr '[:upper:]' '[:lower:]')"
case "$seed_demo" in
  1 | true | yes)
    python manage.py seed_masivo || true
    python manage.py seed_imagenes_demo || true
    ;;
esac
# Miniaturas y medidas de las fotos que no las tienen (idempotente; con --limite el arranque no se alarga).
python manage.py generar_miniaturas --limite 200 || true
# Apartar con plazo (ADR-012): Render gratis no tiene cron; cada arranque libera lo vencido (acotado).
python manage.py cancelar_pedidos_vencidos --limite 100 || true
exec gunicorn config.wsgi:application --bind 0.0.0.0:"$PORT" --workers 2 --threads 4 --timeout 120
