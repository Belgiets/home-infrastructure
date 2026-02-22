terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }

    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.15"
    }

    vercel = {
      source  = "vercel/vercel"
      version = "~> 4.0"
    }
  }

  # Uncomment to use GCS backend
  # backend "gcs" {
  #   bucket = "your-terraform-state-bucket"
  #   prefix = "camera-ingestion"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "mongodbatlas" {
  public_key  = var.atlas_public_key
  private_key = var.atlas_private_key
}

provider "vercel" {
  api_token = var.vercel_api_token
}

# Artifact Registry Repository
resource "google_artifact_registry_repository" "camera_ingestion" {
  location      = var.artifact_registry_location
  repository_id = "camera-ingestion-${var.environment}"
  description   = "Docker images for camera ingestion service (${var.environment})"
  format        = "DOCKER"

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    domain      = "camera-ingestion"
  }
}

# Secret Manager Secrets
resource "google_secret_manager_secret" "ftp_username" {
  secret_id = "camera-ftp-username-${var.environment}"

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    domain      = "camera-ingestion"
  }
}

# Note: Secret values should be set manually via GCP Console or gcloud CLI
# Example: gcloud secrets versions add camera-ftp-username-dev --data-file=- <<< "camera"

resource "google_secret_manager_secret" "ftp_password" {
  secret_id = "camera-ftp-password-${var.environment}"

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    domain      = "camera-ingestion"
  }
}

# MongoDB URI Secret
resource "google_secret_manager_secret" "mongodb_uri" {
  secret_id = "camera-mongodb-uri-${var.environment}"

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    domain      = "camera-ingestion"
  }
}

# Note: Secret values should be set manually via GCP Console or gcloud CLI
# Example: gcloud secrets versions add camera-ftp-password-dev --data-file=- <<< "your_secure_password"

# Service Account for VM
resource "google_service_account" "camera_ingestion" {
  account_id   = "camera-ingestion-${var.environment}"
  display_name = "Camera Ingestion Service Account (${var.environment})"
  description  = "Service account for camera ingestion VM"
}

# Grant permissions to service account
resource "google_project_iam_member" "storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.camera_ingestion.email}"
}

resource "google_project_iam_member" "logging_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.camera_ingestion.email}"
}

resource "google_project_iam_member" "monitoring_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.camera_ingestion.email}"
}

resource "google_project_iam_member" "artifact_registry_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.camera_ingestion.email}"
}

# Grant service account access to secrets
resource "google_secret_manager_secret_iam_member" "ftp_username_accessor" {
  secret_id = google_secret_manager_secret.ftp_username.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.camera_ingestion.email}"
}

resource "google_secret_manager_secret_iam_member" "ftp_password_accessor" {
  secret_id = google_secret_manager_secret.ftp_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.camera_ingestion.email}"
}

# IAM permission for MongoDB secret
resource "google_secret_manager_secret_iam_member" "mongodb_uri_accessor" {
  secret_id = google_secret_manager_secret.mongodb_uri.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.camera_ingestion.email}"
}

# GCS Bucket
module "camera_bucket" {
  source = "./modules/gcs-bucket"

  bucket_name           = "${var.project_id}-${var.environment}-camera-ingestion"
  project_id            = var.project_id
  location              = var.region
  force_destroy         = var.environment == "dev" ? true : false
  versioning_enabled    = var.environment == "prod" ? true : false
  lifecycle_age_days    = var.environment == "dev" ? 30 : 90
  service_account_email = google_service_account.camera_ingestion.email

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    domain      = "camera-ingestion"
  }
}

# Firewall rule for FTP
resource "google_compute_firewall" "ftp" {
  name    = "camera-ingestion-ftp-${var.environment}"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["20", "21", "21100-21110"]
  }

  source_ranges = var.allowed_ftp_cidrs
  target_tags   = ["camera-ftp-${var.environment}"]

  description = "Allow FTP traffic for camera ingestion (${var.environment})"
}

# Compute Engine VM
resource "google_compute_instance" "camera_ingestion" {
  name         = "camera-ingestion-${var.environment}"
  machine_type = var.vm_machine_type
  zone         = var.zone

  tags = ["camera-ftp-${var.environment}"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = 20
      type  = "pd-standard"
    }
  }

  network_interface {
    network = "default"
    access_config {
      nat_ip = google_compute_address.camera_ingestion.address  # Use static IP
    }
  }

  service_account {
    email  = google_service_account.camera_ingestion.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    gcs-bucket              = module.camera_bucket.bucket_name
    artifact-registry-repo  = google_artifact_registry_repository.camera_ingestion.name
    artifact-registry-location = var.artifact_registry_location
    ftp-username-secret     = google_secret_manager_secret.ftp_username.secret_id
    ftp-password-secret     = google_secret_manager_secret.ftp_password.secret_id
    mongodb-uri-secret      = google_secret_manager_secret.mongodb_uri.secret_id
    mongodb-database        = module.mongodb_atlas.database_name
  }

  metadata_startup_script = file("${path.module}/scripts/startup.sh")

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    domain      = "camera-ingestion"
  }

  # Allow stopping for updates
  allow_stopping_for_update = true

  # depends_on = [
  #   module.mongodb_atlas
  # ]
}

# Reserve static IP
resource "google_compute_address" "camera_ingestion" {
  name   = "camera-ingestion-${var.environment}-ip"
  region = var.region
}

resource "google_secret_manager_secret_version" "mongodb_uri" {
  secret      = google_secret_manager_secret.mongodb_uri.id
  secret_data = module.mongodb_atlas.mongo_uri
}

# 6. ADD the MongoDB Atlas module call (at the end of your main.tf)
module "mongodb_atlas" {
  source = "./modules/mongodb-atlas"

  atlas_project_id       = var.atlas_project_id
  existing_cluster_name  = var.existing_cluster_name  # Name of your existing cluster
  environment            = var.environment
  database_name          = var.mongodb_database_name

  db_username = var.mongodb_username
  db_password = var.mongodb_password

  # Allow access from the VM's external IP
  vm_external_ip = google_compute_address.camera_ingestion.address

  # Additional IPs that need access (e.g., your office, CI/CD)
  additional_allowed_ips = var.mongodb_additional_allowed_ips
}

# Dashboard Backend (Cloud Run)
module "dashboard" {
  source = "./modules/dashboard"

  project_id                 = var.project_id
  environment                = var.environment
  region                     = var.region
  artifact_registry_location = var.artifact_registry_location
  cloud_run_image            = var.dashboard_cloud_run_image
  gcs_bucket_name            = module.camera_bucket.bucket_name
}

# Dashboard Frontend (Vercel)
module "vercel" {
  source = "./modules/vercel"

  environment = var.environment
  github_repo = "Belgiets/home-infrastructure"
  backend_url = module.dashboard.cloud_run_url
}
