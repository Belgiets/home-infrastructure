variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-central2"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "europe-central2-a"
}

variable "environment" {
  description = "Environment (dev, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be either 'dev' or 'prod'."
  }
}

variable "vm_machine_type" {
  description = "Machine type for camera ingestion VM"
  type        = string
  default     = "e2-micro" # Free tier eligible
}

variable "allowed_ftp_cidrs" {
  description = "CIDR blocks allowed to connect to FTP server"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Allow all by default, restrict in production
}

variable "artifact_registry_location" {
  description = "Location for Artifact Registry repository"
  type        = string
  default     = "europe-central2"
}