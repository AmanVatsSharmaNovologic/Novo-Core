#!/usr/bin/env bash
# Purpose: One-command update (new image) with healthcheck and rollback
set -Eeuo pipefail
set -x

rollback() {
  code=$?
  set +e
  echo "[rollback] exit code=$code"
  if [[ -n "${PREV_IMAGE:-}" ]]; then
    echo "[rollback] Reverting to $PREV_IMAGE"
    sed -i "s|image: .*|image: ${PREV_IMAGE}|" docker-compose.prod.yml || true
    docker pull "$PREV_IMAGE" || true
    docker compose -f docker-compose.prod.yml up -d || true
    for i in {1..12}; do
      if curl -fsS http://localhost:3000/health >/dev/null 2>&1; then
        echo "Rollback healthy"
        exit $code
      fi
      sleep 10
    end
  fi
  docker compose -f docker-compose.prod.yml logs --no-color --since=10m app || true
  exit $code
}
trap rollback ERR

cd /opt/novologic/app
test -f docker-compose.prod.yml

PREV_IMAGE=$(docker inspect --format='{{index .Config.Image}}' novologic-app 2>/dev/null || true)

if [[ -n "${APP_IMAGE:-}" ]]; then
  docker pull "$APP_IMAGE"
  sed -i "s|image: .*|image: ${APP_IMAGE}|" docker-compose.prod.yml
fi

docker compose -f docker-compose.prod.yml up -d

for i in {1..12}; do
  if curl -fsS http://localhost:3000/health >/dev/null 2>&1; then
    echo "Update healthy"
    docker compose -f docker-compose.prod.yml logs -f --since=5m app &
    exit 0
  fi
  echo "Waiting for health... ($i/12)"
  sleep 10
done

echo "New version failed healthcheck"
exit 1

