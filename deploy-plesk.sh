#!/bin/sh
set -eu

case "$0" in
  */*) SCRIPT_DIR=${0%/*} ;;
  *) SCRIPT_DIR=. ;;
esac
cd "$SCRIPT_DIR"

for node_dir in /opt/plesk/node/20/bin /opt/plesk/node/22/bin /opt/plesk/node/26/bin; do
  if [ -x "$node_dir/npm" ]; then
    PATH="$node_dir:$PATH"
    export PATH
    break
  fi
done

if ! command -v npm >/dev/null 2>&1; then
  echo "No se encontro npm de Plesk. Revisa la version Node.js de la aplicacion."
  exit 1
fi

echo "Usando npm: $(command -v npm)"
npm install
npm run build

echo "Despliegue completado: backend/dist y frontend/dist fueron generados."
