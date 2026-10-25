#!/usr/bin/env bash
set -e
python manage.py collectstatic --noinput
python manage.py migrate --noinput
if [ "${SEED_DEMO:-false}" = "true" ]; then
  python manage.py seed_demo --if-empty
fi
exec gunicorn config.wsgi:application --bind 0.0.0.0:"$PORT" --workers 2 --threads 4 --timeout 120
