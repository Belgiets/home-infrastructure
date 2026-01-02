#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-dev}"

if [[ ! "$ENVIRONMENT" =~ ^(dev|prod)$ ]]; then
    echo "Error: Environment must be 'dev' or 'prod'"
    echo "Usage: $0 [dev|prod]"
    exit 1
fi

echo "Building and pushing camera-watcher for environment: $ENVIRONMENT"

TERRAFORM_DIR="$SCRIPT_DIR/../../iac/terraform"
cd "$TERRAFORM_DIR"

if [ ! -f "terraform.tfstate" ]; then
    echo "Error: Terraform state not found. Run 'terraform apply' first."
    exit 1
fi

AR_REPO=$(terraform output -raw artifact_registry_repository 2>/dev/null)
if [ -z "$AR_REPO" ]; then
    echo "Error: Could not get Artifact Registry repository from Terraform output"
    exit 1
fi

echo "Artifact Registry repository: $AR_REPO"

AR_LOCATION=$(echo "$AR_REPO" | cut -d'-' -f1-2)

echo "Configuring Docker authentication for Artifact Registry..."
gcloud auth configure-docker ${AR_LOCATION}-docker.pkg.dev --quiet

cd "$SCRIPT_DIR/watcher"

echo "Building and pushing Docker image..."
IMAGE_TAG="${AR_REPO}/camera-watcher:latest"
docker buildx build \
  --platform linux/amd64 \
  -t "$IMAGE_TAG" \
  --push \
  .

echo "✓ Successfully built and pushed: $IMAGE_TAG"