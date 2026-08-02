#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: deploy-vps.sh ghcr-image-with-immutable-sha" >&2
  exit 2
fi

image="$1"
container_name="${DEPLOY_CONTAINER_NAME:-uuyp}"
host_port="${DEPLOY_HOST_PORT:-127.0.0.1:8765:8765}"
health_url="${DEPLOY_HEALTH_URL:-http://127.0.0.1:8765/api/status}"
health_attempts="${DEPLOY_HEALTH_ATTEMPTS:-30}"

if [[ ! "$image" =~ ^ghcr\.io/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+:[0-9a-f]{40}$ ]]; then
  echo "refusing non-immutable GHCR image: $image" >&2
  exit 2
fi

if [[ ! "$health_attempts" =~ ^[1-9][0-9]*$ ]]; then
  echo "DEPLOY_HEALTH_ATTEMPTS must be a positive integer" >&2
  exit 2
fi

previous_image="$(docker inspect --format '{{.Config.Image}}' "$container_name" 2>/dev/null || true)"

wait_for_health() {
  local attempt
  for ((attempt = 1; attempt <= health_attempts; attempt++)); do
    if curl --fail --silent --max-time 5 "$health_url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

start_container() {
  local image_to_start="$1"
  docker run \
    --detach \
    --restart=always \
    --name "$container_name" \
    --publish "$host_port" \
    "$image_to_start" >/dev/null
}

echo "pulling $image"
docker pull "$image" >/dev/null

echo "replacing $container_name"
docker rm --force "$container_name" >/dev/null 2>&1 || true
start_container "$image"

if wait_for_health; then
  echo "deployment healthy: $image"
  exit 0
fi

echo "new deployment failed health check" >&2
docker logs --tail 100 "$container_name" >&2 || true
docker rm --force "$container_name" >/dev/null 2>&1 || true

if [[ -z "$previous_image" ]]; then
  echo "no previous image available for rollback" >&2
  exit 1
fi

echo "rolling back to $previous_image" >&2
start_container "$previous_image"
if wait_for_health; then
  echo "rollback healthy: $previous_image" >&2
else
  echo "rollback failed health check" >&2
  docker logs --tail 100 "$container_name" >&2 || true
  docker rm --force "$container_name" >/dev/null 2>&1 || true
fi
exit 1
