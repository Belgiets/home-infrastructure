variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "europe-west1-b"
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
  default     = "europe-west1"
}

# MongoDB Atlas API Credentials
variable "atlas_public_key" {
  description = "MongoDB Atlas API Public Key (from Service Account)"
  type        = string
  sensitive   = true
}

variable "atlas_private_key" {
  description = "MongoDB Atlas API Private Key (from Service Account)"
  type        = string
  sensitive   = true
}

variable "atlas_project_id" {
  description = "MongoDB Atlas Project ID"
  type        = string
}

variable "existing_cluster_name" {
  description = "Name of existing MongoDB Atlas cluster (created via web GUI)"
  type        = string
}

# MongoDB Database Configuration
variable "mongodb_database_name" {
  description = "MongoDB database name"
  type        = string
  default     = "camera_ingestion"
}

variable "mongodb_username" {
  description = "MongoDB database username"
  type        = string
  sensitive   = true
}

variable "mongodb_password" {
  description = "MongoDB database password"
  type        = string
  sensitive   = true
}

variable "mongodb_additional_allowed_ips" {
  description = "Additional IP addresses allowed to access MongoDB Atlas"
  type        = list(string)
  default     = []
}

# Vercel
variable "vercel_api_token" {
  description = "Vercel API token (generate at https://vercel.com/account/tokens)"
  type        = string
  sensitive   = true
}

# Dashboard Backend
variable "dashboard_cloud_run_image" {
  description = "Full Docker image URL for dashboard backend Cloud Run service"
  type        = string
}
