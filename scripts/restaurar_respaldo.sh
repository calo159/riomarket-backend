#!/usr/bin/env bash
# Restaura un respaldo cifrado hecho con respaldar_base.sh (ADR-023).
#
#   RESPALDO_CLAVE=... bash scripts/restaurar_respaldo.sh archivo.dump.gpg postgres://destino
#
# El destino debe ser una base VACÍA (nueva, creada para esto). Si ya tiene tablas se niega, para que un
# error de copiar y pegar no pise la base en uso. Quien sabe lo que hace y quiere restaurar encima de
# una base con datos puede poner RESTAURAR_SOBRE_BASE_CON_DATOS=si.
set -euo pipefail

archivo="${1:?Uso: restaurar_respaldo.sh <archivo.dump.gpg> <url de la base destino>}"
destino="${2:?Falta la URL de la base destino}"
: "${RESPALDO_CLAVE:?Falta RESPALDO_CLAVE (la frase con la que se cifró el respaldo)}"

if [ ! -s "$archivo" ]; then
  echo "No existe o está vacío: $archivo" >&2
  exit 1
fi

tablas="$(psql --no-psqlrc --tuples-only --no-align --dbname "$destino" \
  --command "select count(*) from information_schema.tables where table_schema = 'public'")"
if [ "$tablas" != "0" ] && [ "${RESTAURAR_SOBRE_BASE_CON_DATOS:-no}" != "si" ]; then
  echo "La base destino ya tiene $tablas tablas. Usa una base vacía (o RESTAURAR_SOBRE_BASE_CON_DATOS=si)." >&2
  exit 1
fi

gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 --decrypt "$archivo" 3<<<"$RESPALDO_CLAVE" \
  | pg_restore --no-owner --no-privileges --exit-on-error --dbname "$destino"
echo "Respaldo restaurado en la base destino." >&2
