#!/bin/bash
set -e

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh

    # Install Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Create application directory
mkdir -p /opt/camera-ingestion
cd /opt/camera-ingestion

# Get metadata
EXTERNAL_IP=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip" -H "Metadata-Flavor: Google")
GCS_BUCKET=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/attributes/gcs-bucket" -H "Metadata-Flavor: Google")
GCP_PROJECT=$(curl -s "http://metadata.google.internal/computeMetadata/v1/project/project-id" -H "Metadata-Flavor: Google")
ARTIFACT_REGISTRY_LOCATION=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/attributes/artifact-registry-location" -H "Metadata-Flavor: Google")
FTP_USERNAME_SECRET=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/attributes/ftp-username-secret" -H "Metadata-Flavor: Google")
FTP_PASSWORD_SECRET=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/attributes/ftp-password-secret" -H "Metadata-Flavor: Google")

# Install gcloud if not present
if ! command -v gcloud &> /dev/null; then
    echo "Installing gcloud..."
    curl https://sdk.cloud.google.com | bash
    exec -l $SHELL
fi

# Retrieve secrets from Secret Manager
FTP_USERNAME=$(gcloud secrets versions access latest --secret="${FTP_USERNAME_SECRET}" --project="${GCP_PROJECT}")
FTP_PASSWORD=$(gcloud secrets versions access latest --secret="${FTP_PASSWORD_SECRET}" --project="${GCP_PROJECT}")

# Configure Docker to use Artifact Registry
gcloud auth configure-docker ${ARTIFACT_REGISTRY_LOCATION}-docker.pkg.dev --quiet

# Create docker-compose.yml
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
    image: ${ARTIFACT_REGISTRY_LOCATION}-docker.pkg.dev/${GCP_PROJECT}/camera-ingestion/camera-watcher:latest
    container_name: camera-watcher
    volumes:
      - ftp-data:/watch-dir:ro
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

# Pull images and start services
docker-compose pull
docker-compose up -d

echo "Camera ingestion services started successfully"