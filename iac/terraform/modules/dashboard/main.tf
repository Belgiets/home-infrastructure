# Artifact Registry Repository for dashboard backend Docker images
resource "google_artifact_registry_repository" "dashboard_backend" {
  location      = var.artifact_registry_location
  repository_id = "dashboard-backend-${var.environment}"
  description   = "Docker images for dashboard backend (${var.environment})"
  format        = "DOCKER"

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    domain      = "dashboard"
  }
}

# Service Account for Cloud Run
resource "google_service_account" "dashboard_backend" {
  account_id   = "dashboard-backend-${var.environment}"
  display_name = "Dashboard Backend Service Account (${var.environment})"
  description  = "Service account for dashboard backend Cloud Run service"
}

# IAM: Read secrets from Secret Manager
resource "google_project_iam_member" "dashboard_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.dashboard_backend.email}"
}

# IAM: Read GCS objects (camera images)
resource "google_project_iam_member" "dashboard_storage_viewer" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.dashboard_backend.email}"
}

# IAM: Sign GCS URLs (required for signed URL generation via ADC)
resource "google_project_iam_member" "dashboard_token_creator" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:${google_service_account.dashboard_backend.email}"
}

# IAM: Write logs
resource "google_project_iam_member" "dashboard_logging_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.dashboard_backend.email}"
}

# Secret Manager Secrets (empty shells — values set manually after terraform apply)
# See README for commands to populate secret values.

resource "google_secret_manager_secret" "database_url" {
  secret_id = "dashboard-database-url-${var.environment}"

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    domain      = "dashboard"
  }
}

resource "google_secret_manager_secret" "mongodb_uri" {
  secret_id = "dashboard-mongodb-uri-${var.environment}"

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    domain      = "dashboard"
  }
}

resource "google_secret_manager_secret" "jwt_access_secret" {
  secret_id = "dashboard-jwt-access-secret-${var.environment}"

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    domain      = "dashboard"
  }
}

resource "google_secret_manager_secret" "jwt_refresh_secret" {
  secret_id = "dashboard-jwt-refresh-secret-${var.environment}"

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    domain      = "dashboard"
  }
}

resource "google_secret_manager_secret" "frontend_url" {
  secret_id = "dashboard-frontend-url-${var.environment}"

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    domain      = "dashboard"
  }
}

# Cloud Run Service
resource "google_cloud_run_v2_service" "dashboard_backend" {
  name     = "dashboard-backend-${var.environment}"
  location = var.region

  template {
    service_account = google_service_account.dashboard_backend.email

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    containers {
      image = var.cloud_run_image

      # Secrets mounted as environment variables
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "MONGODB_URI"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.mongodb_uri.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "JWT_ACCESS_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_access_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "JWT_REFRESH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_refresh_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "FRONTEND_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.frontend_url.secret_id
            version = "latest"
          }
        }
      }

      # Non-sensitive environment variables
      env {
        name  = "GCS_BUCKET"
        value = var.gcs_bucket_name
      }

      env {
        name  = "GCS_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "JWT_ACCESS_EXPIRATION"
        value = "15"
      }

      env {
        name  = "JWT_REFRESH_EXPIRATION"
        value = "30"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    domain      = "dashboard"
  }

  depends_on = [
    google_project_iam_member.dashboard_secret_accessor,
  ]
}

# Allow unauthenticated access — JWT auth is handled by the app itself
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.dashboard_backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
