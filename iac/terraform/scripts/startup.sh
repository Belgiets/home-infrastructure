#!/bin/bash
set -euo pipefail

# Log everything to both a file and the serial console/syslog (useful for debugging)
exec > >(tee -a /var/log/camera-ingestion-startup.log | logger -t startup-script) 2>&1

echo "=== Camera ingestion startup begin ==="
date -Is

# --- Helpers ---
retry() {
  # retry <attempts> <sleep_seconds> <command...>
  local attempts="$1"
  local sleep_seconds="$2"
  shift 2

  local i=1
  while true; do
    echo "Attempt $i/$attempts: $*"
    if "$@"; then
      return 0
    fi
    if [[ "$i" -ge "$attempts" ]]; then
      echo "ERROR: command failed after $attempts attempts: $*"
      return 1
    fi
    i=$((i + 1))
    echo "Retrying in ${sleep_seconds}s..."
    sleep "$sleep_seconds"
  done
}

curl_retry() {
  # curl_retry <url> <output_path>
  local url="$1"
  local out="$2"

  # -f: fail on HTTP errors
  # -L: follow redirects
  # --retry-all-errors: retry on connection resets, 5xx, etc.
  # -C -: resume partial downloads (important for large GitHub binaries)
  retry 10 3 curl \
    --fail --location --show-error --silent \
    --retry 10 --retry-all-errors --retry-delay 3 \
    --connect-timeout 10 --max-time 300 \
    -C - \
    "$url" -o "$out"
}

metadata_get() {
  # metadata_get <path>
  curl --fail --silent --show-error \
    -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/${1}"
}

echo "Checking dpkg/apt state..."
dpkg --configure -a 2>/dev/null || true
retry 10 3 apt-get update -y

# Install prerequisites for robust downloads/https
retry 10 3 apt-get install -y ca-certificates curl gnupg lsb-release

# --- Install Docker if missing ---
if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker via get.docker.com..."
  curl_retry "https://get.docker.com" "/tmp/get-docker.sh"
  sh /tmp/get-docker.sh
  rm -f /tmp/get-docker.sh

  echo "Enabling and starting Docker..."
  systemctl enable --now docker
else
  echo "Docker already installed."
  systemctl enable --now docker || true
fi

echo "Docker version (client/server):"
sh -c "docker version" || true

# --- Install Docker Compose (GitHub binary) with retry/resume ---
# Your earlier failure was here; this version retries and resumes.
if ! command -v docker-compose >/dev/null 2>&1; then
  echo "Installing docker-compose from GitHub (with retry/resume)..."
  COMPOSE_URL="https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)"
  curl_retry "$COMPOSE_URL" "/usr/local/bin/docker-compose"
  chmod +x /usr/local/bin/docker-compose

  echo "docker-compose version:"
  /usr/local/bin/docker-compose version
else
  echo "docker-compose already installed."
  docker-compose version || true
fi

# --- Wait for gcloud (you said it is pre-installed on your image) ---
echo "Waiting for gcloud to be available..."
retry 60 2 bash -lc 'command -v gcloud >/dev/null 2>&1'

echo "gcloud version:"
gcloud --version || true

# --- Create application directory ---
mkdir -p /opt/camera-ingestion
cd /opt/camera-ingestion

# --- Metadata ---
echo "Reading instance metadata..."
EXTERNAL_IP="$(metadata_get 'instance/network-interfaces/0/access-configs/0/external-ip')"
GCS_BUCKET="$(metadata_get 'instance/attributes/gcs-bucket')"
GCP_PROJECT="$(metadata_get 'project/project-id')"
ARTIFACT_REGISTRY_LOCATION="$(metadata_get 'instance/attributes/artifact-registry-location')"
FTP_USERNAME_SECRET="$(metadata_get 'instance/attributes/ftp-username-secret')"
FTP_PASSWORD_SECRET="$(metadata_get 'instance/attributes/ftp-password-secret')"

echo "Metadata:"
echo "  EXTERNAL_IP=$EXTERNAL_IP"
echo "  GCS_BUCKET=$GCS_BUCKET"
echo "  GCP_PROJECT=$GCP_PROJECT"
echo "  ARTIFACT_REGISTRY_LOCATION=$ARTIFACT_REGISTRY_LOCATION"
echo "  FTP_USERNAME_SECRET=$FTP_USERNAME_SECRET"
echo "  FTP_PASSWORD_SECRET=$FTP_PASSWORD_SECRET"

# --- Secrets ---
echo "Retrieving secrets from Secret Manager..."
FTP_USERNAME="$(gcloud secrets versions access latest --secret="${FTP_USERNAME_SECRET}" --project="${GCP_PROJECT}")"
FTP_PASSWORD="$(gcloud secrets versions access latest --secret="${FTP_PASSWORD_SECRET}" --project="${GCP_PROJECT}")"

# --- Docker auth for Artifact Registry ---
echo "Configuring Docker authentication for Artifact Registry..."
gcloud auth configure-docker "${ARTIFACT_REGISTRY_LOCATION}-docker.pkg.dev" --quiet

# --- Write docker-compose.yml ---
echo "Creating docker-compose.yml..."
cat > docker-compose.yml <<EOF
version: '3.8'

services:
  ftp-server:
    image: fauria/vsftpd:latest
    container_name: camera-ftp
    ports:
      - "20:20"
      - "21:21"
      - "21100-21110:21100-21110"
    volumes:
      - ftp-data:/home/vsftpd/${FTP_USERNAME}
    environment:
      FTP_USER: ${FTP_USERNAME}
      FTP_PASS: ${FTP_PASSWORD}
      PASV_ADDRESS: ${EXTERNAL_IP}
      PASV_MIN_PORT: 21100
      PASV_MAX_PORT: 21110
      LOCAL_UMASK: 022
    restart: always
    networks:
      - camera-network
    logging:
      driver: "gcplogs"

  watcher:
    image: ${ARTIFACT_REGISTRY_LOCATION}-docker.pkg.dev/${GCP_PROJECT}/camera-ingestion-dev/camera-watcher:latest
    container_name: camera-watcher
    volumes:
      - ftp-data:/watch-dir
    environment:
      - NODE_ENV=production
      - WATCH_DIR=/watch-dir
      - GCS_BUCKET=${GCS_BUCKET}
      - GOOGLE_CLOUD_PROJECT=${GCP_PROJECT}
      - DELETE_AFTER_UPLOAD=true
      - LOG_LEVEL=info
    depends_on:
      - ftp-server
    restart: always
    networks:
      - camera-network
    logging:
      driver: "gcplogs"

volumes:
  ftp-data:

networks:
  camera-network:
    driver: bridge
EOF

# --- Pull and start ---
echo "Pulling images..."
docker-compose pull

echo "Starting services..."
docker-compose up -d

echo "Current containers:"
docker ps -a || true

echo "=== Camera ingestion startup done ==="
date -Is
