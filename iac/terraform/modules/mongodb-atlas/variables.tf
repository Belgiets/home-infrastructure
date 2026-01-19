variable "atlas_project_id" {
  description = "MongoDB Atlas Project ID"
  type        = string
}

variable "existing_cluster_name" {
  description = "Name of the existing MongoDB Atlas cluster (created via web GUI)"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "camera_ingestion"
}

variable "db_username" {
  description = "Database username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "vm_external_ip" {
  description = "External IP of the GCE VM to allow access"
  type        = string
}

variable "additional_allowed_ips" {
  description = "Additional IP addresses to allow access to MongoDB"
  type        = list(string)
  default     = []
}
