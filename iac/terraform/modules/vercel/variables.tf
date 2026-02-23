variable "environment" {
  description = "Environment (dev, prod)"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository in format owner/repo"
  type        = string
  default     = "Belgiets/home-infrastructure"
}

variable "backend_url" {
  description = "Cloud Run backend URL for API proxy rewrites"
  type        = string
}
