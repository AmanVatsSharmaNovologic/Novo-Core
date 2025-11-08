#!/usr/bin/env bash
# Purpose: One-command first-time deploy via Docker Compose with healthcheck & rollback
set -Eeuo pipefail
set -x

rollback() {
  code=$?
  set +e
  echo "[rollback] exit code=$code"
  if [[ -n "${PREV_IMAGE:-}" ]]; then
    echo "[rollback] Restoring previous image $PREV_IMAGE"
    sed -i "s|image: .*|image: ${PREV_IMAGE}|" docker-compose.prod.yml || true
    docker compose -f docker-compose.prod.yml up -d || true
  fi
  docker compose -f docker-compose.prod.yml logs --no-color --since=10m app || true
  exit $code
}
trap rollback ERR

APP_DIR="/opt/novologic/app"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Ensure env file exists. If ENV_INLINE is provided, write it.
if [[ -n "${ENV_INLINE:-}" ]]; then
  echo "$ENV_INLINE" > app.env
fi
if [[ ! -f app.env ]]; then
  echo "Missing app.env. Provide ENV_INLINE or pre-provision /opt/novologic/app/app.env" >&2
  exit 1
fi

# Write compose if not present
if [[ ! -f docker-compose.prod.yml ]]; then
  cat > docker-compose.prod.yml <<'YML'
version: "3.9"
networks:
  novologic_net:
    external: true
services:
  app:
    container_name: novologic-app
    image: ${APP_IMAGE:-ghcr.io/novologic/novo-core:main}
    restart: always
    env_file:
      - /opt/novologic/app/app.env
    ports:
      - "127.0.0.1:3000:3000"
    networks:
      - novologic_net
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/health || exit 1"]
      interval: 15s
      timeout: 3s
      retries: 6
      start_period: 20s
YML
fi

# Record previous image (if any)
PREV_IMAGE=$(docker inspect --format='{{index .Config.Image}}' novologic-app 2>/dev/null || true)

# Pull desired image if specified
if [[ -n "${APP_IMAGE:-}" ]]; then
  docker pull "$APP_IMAGE"
  sed -i "s|image: .*|image: ${APP_IMAGE}|" docker-compose.prod.yml
fi

docker compose -f docker-compose.prod.yml up -d

# Healthcheck with retries
for i in {1..12}; do
  if curl -fsS http://localhost:3000/health >/dev/null 2>&1; then
    echo "App healthy"
    docker compose -f docker-compose.prod.yml logs -f --since=5m app &
    exit 0
  fi
  echo "Waiting for health... ($i/12)"
  sleep 10
done

echo "App failed healthcheck"
exit 1

