terraform {
  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.15"
    }
  }
}

# Reference to existing cluster (created via web GUI)
data "mongodbatlas_cluster" "existing" {
  project_id = var.atlas_project_id
  name       = var.existing_cluster_name
}

# Database User
resource "mongodbatlas_database_user" "app_user" {
  username           = var.db_username
  password           = var.db_password
  project_id         = var.atlas_project_id
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = var.database_name
  }

  scopes {
    name = data.mongodbatlas_cluster.existing.name
    type = "CLUSTER"
  }

  labels {
    key   = "environment"
    value = var.environment
  }
}

# IP Access List - Allow from GCE VM
resource "mongodbatlas_project_ip_access_list" "gce_vm" {
  project_id = var.atlas_project_id
  ip_address = var.vm_external_ip
  comment    = "GCE VM for camera ingestion (${var.environment})"
}

# IP Access List - Additional allowed IPs (optional)
resource "mongodbatlas_project_ip_access_list" "additional" {
  for_each = toset(var.additional_allowed_ips)

  project_id = var.atlas_project_id
  cidr_block = each.value
  comment    = "Additional allowed CIDR: ${each.value}"
}
