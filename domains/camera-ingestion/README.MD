# Home Infrastructure - Camera Ingestion

Automated camera image ingestion system for Hikvision cameras, uploading images via FTP to Google Cloud Storage.

## Architecture

```
Hikvision Camera → FTP Server (Docker) → File Watcher (TypeScript) → Google Cloud Storage
```

## Project Structure

```
home-infrastructure/
├── domains/
│   └── camera-ingestion/          # Camera ingestion bounded context
│       ├── watcher/                # TypeScript file watcher service
│       ├── docker-compose.local.yml
│       ├── docker-compose.yml
│       └── build-and-push.sh
├── iac/
│   └── terraform/                  # Infrastructure as Code
│       ├── modules/
│       ├── environments/
│       └── scripts/
└── docs/                           # Documentation
```

## Features

- ✅ FTP server for camera uploads
- ✅ Automatic file watching and processing
- ✅ Upload to GCS with date-based folder structure (YYYY/MM/DD)
- ✅ Secret Manager integration for credentials
- ✅ Artifact Registry for Docker images
- ✅ Cloud Logging integration
- ✅ Automatic file cleanup after upload
- ✅ Terraform IaC for full deployment automation

## Prerequisites

- Google Cloud Platform account
- Terraform >= 1.0
- Docker and Docker Compose
- gcloud CLI configured
- Node.js 20+ (for local development)

## Quick Start

### 1. Local Development

```bash
# Create .env file
cd domains/camera-ingestion
cp .env.example .env
# Edit .env with your values

# Install dependencies
cd watcher
npm install

# Start services locally
cd ..
docker-compose -f docker-compose.local.yml up
```

### 2. Deploy to GCP

See [iac/terraform/DEPLOYMENT.md](iac/terraform/DEPLOYMENT.md) for detailed deployment instructions.

Quick deployment:

```bash
# Enable APIs
gcloud services enable compute.googleapis.com storage.googleapis.com \
  iam.googleapis.com logging.googleapis.com \
  secretmanager.googleapis.com artifactregistry.googleapis.com

# Deploy infrastructure
cd iac/terraform
terraform init
terraform apply -var-file="environments/dev.tfvars"

# Set secrets via GCP Console
# https://console.cloud.google.com/security/secret-manager

# Build and push Docker image
cd ../../domains/camera-ingestion
./build-and-push.sh dev

# Create VM
cd ../../iac/terraform
terraform apply -var-file="environments/dev.tfvars"
```

## Documentation

- [Deployment Guide](iac/terraform/DEPLOYMENT.md) - Complete deployment instructions
- [Secrets Setup](iac/terraform/SECRETS_SETUP.md) - How to configure FTP credentials
- [Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md) - Step-by-step deployment checklist

## Configuration

### Camera Setup (Hikvision DS-2CD2443G0-IW)

1. Get VM IP: `terraform output vm_external_ip`
2. Camera web interface → Configuration → Network → Advanced Settings → FTP
3. Configure:
    - Server: VM IP
    - Port: 21
    - Username: camera
    - Password: (from Secret Manager)
    - Directory: `/` (or empty)
    - Enable "Upload Picture"

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GCP_PROJECT_ID` | Google Cloud project ID | Yes |
| `GCS_BUCKET_DEV` | Development GCS bucket | Yes |
| `WATCH_DIR` | Directory to watch for files | Yes (set by Docker) |
| `DELETE_AFTER_UPLOAD` | Delete files after upload | No (default: true) |

## Tech Stack

- **Infrastructure**: Terraform, Google Cloud Platform
- **Compute**: Google Compute Engine (Ubuntu)
- **Storage**: Google Cloud Storage, Artifact Registry
- **Secrets**: Secret Manager
- **Containers**: Docker, Docker Compose
- **FTP Server**: vsftpd (fauria/vsftpd)
- **Watcher**: Node.js 20, TypeScript
- **Monitoring**: Cloud Logging

## Cost Estimate

**Development (e2-micro):**
- VM: ~$6-7/month (or free with always-free tier)
- Storage: ~$0.02/GB/month
- Artifact Registry: ~$0.10/month
- Secret Manager: Free (within free tier)

**Total: ~$6-7/month** (or ~$0.12/month if using free tier VM)

## Security

- ✅ Credentials stored in Secret Manager (not in code)
- ✅ Service account with least-privilege IAM roles
- ✅ Firewall rules restricting FTP access
- ✅ All secrets excluded from version control
- ✅ Audit logging enabled

## Monitoring

View logs:
```bash
# Watcher logs
gcloud compute ssh camera-ingestion-dev --zone=us-central1-a \
  --command="sudo docker logs camera-watcher -f"

# FTP logs
gcloud compute ssh camera-ingestion-dev --zone=us-central1-a \
  --command="sudo docker logs camera-ftp -f"

# Or via Cloud Logging
gcloud logging read "resource.type=gce_instance" --limit 50
```

## Troubleshooting

See [iac/terraform/DEPLOYMENT.md#troubleshooting](iac/terraform/DEPLOYMENT.md#troubleshooting)

## Contributing

This is a personal home infrastructure project. Feel free to fork and adapt for your own use.

## License

MIT

## Acknowledgments

- Built following Domain-Driven Design principles
- Infrastructure as Code with Terraform
- Security-first approach with Secret Manager