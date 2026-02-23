output "cloud_run_url" {
  description = "Cloud Run service URL for dashboard backend"
  value       = google_cloud_run_v2_service.dashboard_backend.uri
}

output "service_account_email" {
  description = "Service account email for dashboard backend"
  value       = google_service_account.dashboard_backend.email
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository path for dashboard backend Docker images"
  value       = "${var.artifact_registry_location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.dashboard_backend.repository_id}"
}

output "secret_ids" {
  description = "Secret Manager secret IDs for dashboard backend"
  value = {
    database_url       = google_secret_manager_secret.database_url.secret_id
    mongodb_uri        = google_secret_manager_secret.mongodb_uri.secret_id
    jwt_access_secret  = google_secret_manager_secret.jwt_access_secret.secret_id
    jwt_refresh_secret = google_secret_manager_secret.jwt_refresh_secret.secret_id
    frontend_url       = google_secret_manager_secret.frontend_url.secret_id
  }
}
