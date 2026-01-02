variable "bucket_name" {
  description = "Name of the GCS bucket"
  type        = string
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "location" {
  description = "Bucket location"
  type        = string
  default     = "US"
}

variable "force_destroy" {
  description = "Allow bucket to be destroyed even if it contains objects"
  type        = bool
  default     = false
}

variable "versioning_enabled" {
  description = "Enable versioning"
  type        = bool
  default     = false
}

variable "lifecycle_age_days" {
  description = "Delete objects older than this many days"
  type        = number
  default     = 90
}

variable "service_account_email" {
  description = "Service account email to grant permissions"
  type        = string
}

variable "labels" {
  description = "Labels to apply to the bucket"
  type        = map(string)
  default     = {}
}