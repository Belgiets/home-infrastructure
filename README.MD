# Home Infrastructure Platform
A collection of microservices for home automation and monitoring.

## Services
- **Camera File Processor** — FTP server that receives files from home cameras, uploads them to Google Cloud Storage, and persists metadata (including GCS URIs) to MongoDB.
- **Dashboard** — web application for browsing camera captures. NestJS backend with JWT auth, Next.js frontend with image gallery and stats.

## Project Structure
```
home-infrastructure/
├── domains/
│   ├── camera-ingestion/          # Camera ingestion bounded context
│   │   └── watcher/               # TypeScript file watcher service
│   └── dashboard/                 # Dashboard web application
│       ├── backend/               # NestJS API (Cloud Run)
│       └── frontend/              # Next.js UI (Vercel)
├── iac/
│   └── terraform/                 # Infrastructure as Code
│       ├── modules/
│       │   ├── gcs-bucket/        # GCS bucket configuration
│       │   ├── mongodb-atlas/     # MongoDB Atlas integration
│       │   ├── dashboard/         # Dashboard backend (Cloud Run, Secret Manager)
│       │   └── vercel/            # Dashboard frontend (Vercel deployment)
│       ├── environments/
│       └── scripts/
```

## Features

### Camera Ingestion
- ✅ FTP server for camera uploads
- ✅ Automatic file watching and processing
- ✅ Upload to GCS with date-based folder structure (YYYY/MM/DD)
- ✅ MongoDB Atlas integration for file metadata persistence
- ✅ Secret Manager integration for credentials
- ✅ Artifact Registry for Docker images
- ✅ Cloud Logging integration
- ✅ Automatic file cleanup after upload

### Dashboard
- ✅ JWT authentication with HTTP-only cookies
- ✅ Camera file gallery with date filtering and pagination
- ✅ Signed GCS URLs for secure image viewing
- ✅ API proxy via Next.js rewrites (Vercel → Cloud Run)
- ✅ Vercel deployment managed by Terraform

### Infrastructure
- ✅ Terraform IaC for full deployment automation

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Camera Ingestion | Node.js, TypeScript, vsftpd, Docker |
| Dashboard Backend | NestJS, Prisma, PostgreSQL (Neon), MongoDB |
| Dashboard Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Infrastructure | Terraform, GCP (Compute Engine, Cloud Run, GCS, Secret Manager), MongoDB Atlas, Vercel |

## Prerequisites

- Google Cloud Platform account
- MongoDB Atlas account
- Vercel account (for dashboard frontend)
- Neon.tech account (for PostgreSQL — dashboard auth)
- Terraform >= 1.0
- Docker and Docker Compose
- gcloud CLI configured
- Node.js 20+ (for local development)

## Quick Start

### 1. Camera Ingestion (local)

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

### 2. Dashboard (local)

```bash
# Backend
cd domains/dashboard/backend
cp .env.example .env
npm install
npm run prisma:migrate:deploy
npm run start:dev

# Frontend (in a separate terminal)
cd domains/dashboard/frontend
cp .env.example .env
npm install
npm run dev
```

### 3. Deploy to GCP

See [iac/terraform/DEPLOYMENT.md](iac/terraform/DEPLOYMENT.md) for detailed deployment instructions.

Quick deployment:

```bash
# Enable APIs
gcloud services enable compute.googleapis.com storage.googleapis.com \
  iam.googleapis.com logging.googleapis.com \
  secretmanager.googleapis.com artifactregistry.googleapis.com \
  run.googleapis.com

# Install gcloud console and terraform(mac os)
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
brew install --cask google-cloud-sdk
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud auth application-default set-quota-project YOUR_PROJECT_ID

# Deploy infrastructure
cd iac/terraform
terraform init
terraform apply -var-file="environments/dev.tfvars"
```

## Contributing

This is a personal home infrastructure project. Feel free to fork and adapt for your own use.

## License

MIT

## Acknowledgments

- Built following Domain-Driven Design principles
- Infrastructure as Code with Terraform
- Security-first approach with Secret Manager
