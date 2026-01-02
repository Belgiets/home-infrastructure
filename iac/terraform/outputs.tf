output "vm_external_ip" {
  description = "External IP address of the camera ingestion VM"
  value       = google_compute_instance.camera_ingestion.network_interface[0].access_config[0].nat_ip
}

output "vm_name" {
  description = "Name of the VM instance"
  value       = google_compute_instance.camera_ingestion.name
}

output "gcs_bucket_name" {
  description = "Name of the GCS bucket for camera images"
  value       = module.camera_bucket.bucket_name
}

output "gcs_bucket_url" {
  description = "URL of the GCS bucket"
  value       = module.camera_bucket.bucket_url
}

output "service_account_email" {
  description = "Service account email"
  value       = google_service_account.camera_ingestion.email
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository for Docker images"
  value       = "${var.artifact_registry_location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.camera_ingestion.repository_id}"
}

output "ftp_connection_info" {
  description = "FTP connection information for camera configuration"
  value = {
    host     = google_compute_instance.camera_ingestion.network_interface[0].access_config[0].nat_ip
    port     = 21
    username = "Set via Secret Manager: ${google_secret_manager_secret.ftp_username.secret_id}"
    password = "Set via Secret Manager: ${google_secret_manager_secret.ftp_password.secret_id}"
    note     = "Set secret values via GCP Console or: gcloud secrets versions add SECRET_NAME --data-file=- <<< 'value'"
  }
}

output "secret_ids" {
  description = "Secret Manager secret IDs"
  value = {
    ftp_username = google_secret_manager_secret.ftp_username.secret_id
    ftp_password = google_secret_manager_secret.ftp_password.secret_id
  }
}