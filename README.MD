# Home Infrastructure Platform  
A collection of microservices for home automation and monitoring.

## Services  
- Camera File Processor — FTP server that receives files from home cameras, uploads them to Google Cloud Storage, and persists metadata (including GCS URIs) to MongoDB.

## Project Structure
```
home-infrastructure/
├── domains/
│   └── camera-ingestion/          # Camera ingestion bounded context
│       ├── watcher/                # TypeScript file watcher service
├── iac/
│   └── terraform/                  # Infrastructure as Code
│       ├── modules/
│       ├── environments/
│       └── scripts/
```

## Features

- ✅ FTP server for camera uploads
- ✅ Automatic file watching and processing
- ✅ Upload to GCS with date-based folder structure (YYYY/MM/DD)
- ✅ MongoDB Atlas integration for file metadata persistence
- ✅ Secret Manager integration for credentials
- ✅ Artifact Registry for Docker images
- ✅ Cloud Logging integration
- ✅ Automatic file cleanup after upload
- ✅ Terraform IaC for full deployment automation

## Prerequisites

- Google Cloud Platform account
- MongoDB Atlas account
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
  
# Install gcloud console and terraform(mac os)
``brew tap hashicorp/tap``  
``brew install hashicorp/tap/terraform``  
``terraform -version``  
``brew install --cask google-cloud-sdk``  
``gcloud auth login``  
``gcloud config set project YOUR_PROJECT_ID``  
``gcloud auth application-default set-quota-project YOUR_PROJECT_ID``

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