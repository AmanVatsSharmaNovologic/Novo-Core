#!/usr/bin/env bash
# Purpose: One-command Nginx + Let's Encrypt (api.novologic.co) with rollback
set -Eeuo pipefail
set -x

rollback() {
  code=$?
  set +e
  echo "[rollback] exit code=$code"
  if [[ -d "$BACKUP_DIR" ]]; then
    rsync -a --delete "$BACKUP_DIR/conf.d/" "$NGINX_CONF/" || true
    rsync -a --delete "$BACKUP_DIR/letsencrypt/" "/etc/letsencrypt/" || true
  fi
  docker rm -f novologic-nginx || true
  exit $code
}
trap rollback ERR

: "${HOSTS:?HOSTS is required (e.g., api.novologic.co)}"
: "${EMAIL:?EMAIL is required (e.g., aman@novologic.co)}"
: "${NGINX_CONF:=/opt/novologic/nginx/conf.d}"
HTML_ROOT="/opt/novologic/nginx/html"
NETWORK="novologic_net"
BACKUP_DIR="/opt/novologic/nginx/.backup-$(date +%s)"

mkdir -p "$NGINX_CONF" "$HTML_ROOT"
mkdir -p "$BACKUP_DIR/conf.d" "$BACKUP_DIR/letsencrypt"
if [[ -d "$NGINX_CONF" ]]; then rsync -a "$NGINX_CONF/" "$BACKUP_DIR/conf.d/" || true; fi
if [[ -d "/etc/letsencrypt" ]]; then rsync -a "/etc/letsencrypt/" "$BACKUP_DIR/letsencrypt/" || true; fi

# Ensure network exists
docker network inspect "$NETWORK" >/dev/null 2>&1 || docker network create "$NETWORK"

# Initial HTTP config (for webroot challenge)
cat > "$NGINX_CONF/api.novologic.co.conf" <<'CONF'
server {
  listen 80;
  server_name api.novologic.co;

  root /usr/share/nginx/html;
  location /.well-known/acme-challenge/ {
    allow all;
  }

  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://app:3000;
  }
}
CONF

# Start nginx
docker rm -f novologic-nginx || true
docker run -d --name novologic-nginx --restart=always \
  -p 80:80 -p 443:443 \
  -v "$NGINX_CONF":/etc/nginx/conf.d \
  -v "$HTML_ROOT":/usr/share/nginx/html \
  -v /etc/letsencrypt:/etc/letsencrypt \
  --network "$NETWORK" \
  nginx:alpine

# Obtain certificate (webroot)
docker run --rm \
  -v "$HTML_ROOT":/var/www/certbot \
  -v /etc/letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d $HOSTS --email "$EMAIL" --agree-tos --no-eff-email --non-interactive

# TLS config
cat > "$NGINX_CONF/api.novologic.co.conf" <<'CONF'
server {
  listen 80;
  server_name api.novologic.co;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.novologic.co;

  ssl_certificate     /etc/letsencrypt/live/api.novologic.co/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.novologic.co/privkey.pem;
  ssl_protocols       TLSv1.2 TLSv1.3;
  ssl_ciphers         HIGH:!aNULL:!MD5;

  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://app:3000;
  }
}
CONF

docker exec novologic-nginx nginx -t
docker exec novologic-nginx nginx -s reload

# Success: prune backup
rm -rf "$BACKUP_DIR" || true
echo "Nginx + SSL ready for api.novologic.co"

