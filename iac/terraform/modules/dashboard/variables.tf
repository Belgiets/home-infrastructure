variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Environment (dev, prod)"
  type        = string
}

variable "region" {
  description = "Cloud Run region"
  type        = string
  default     = "europe-west1"
}

variable "artifact_registry_location" {
  description = "Location for Artifact Registry repository"
  type        = string
  default     = "europe-west1"
}

variable "cloud_run_image" {
  description = "Full Docker image URL for Cloud Run deployment"
  type        = string
}

variable "gcs_bucket_name" {
  description = "GCS bucket name for camera images (passed from camera_bucket module)"
  type        = string
}
