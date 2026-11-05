#!/usr/bin/env bash
# Respaldo CIFRADO de la base de datos (ADR-023).
#
#   DATABASE_URL=postgres://... RESPALDO_CLAVE=... bash scripts/respaldar_base.sh [carpeta]
#
# Vuelca solo el esquema `public` (los datos de RioMarket; no las tablas internas de Supabase) en el
# formato personalizado de pg_dump y lo cifra con AES-256 antes de que toque el disco: el archivo
# contiene correos, celulares y direcciones de personas y no debe quedar en claro en ninguna parte.
# Escribe en la carpeta (por defecto `respaldos/`) y su última línea de salida es la ruta del archivo.
# Nunca imprime la URL ni la clave.
set -euo pipefail

: "${DATABASE_URL:?Falta DATABASE_URL (la base que se respalda)}"
: "${RESPALDO_CLAVE:?Falta RESPALDO_CLAVE (la frase con la que se cifra el respaldo)}"

carpeta="${1:-respaldos}"
mkdir -p "$carpeta"
archivo="$carpeta/riomarket-$(date -u +%Y%m%d-%H%M%S).dump.gpg"

# pipefail hace que falle todo si pg_dump falla a medias (un archivo truncado no es un respaldo).
pg_dump --format=custom --compress=6 --schema=public --no-owner --no-privileges \
  --dbname "$DATABASE_URL" \
  | gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
      --symmetric --cipher-algo AES256 --output "$archivo" 3<<<"$RESPALDO_CLAVE"

if [ ! -s "$archivo" ]; then
  echo "El respaldo quedó vacío: $archivo" >&2
  rm -f "$archivo"
  exit 1
fi
echo "Respaldo creado ($(wc -c < "$archivo") bytes)" >&2
echo "$archivo"
