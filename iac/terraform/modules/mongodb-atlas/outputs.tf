output "cluster_id" {
  description = "MongoDB Atlas Cluster ID"
  value       = data.mongodbatlas_cluster.existing.id
}

output "cluster_name" {
  description = "MongoDB Atlas Cluster Name"
  value       = data.mongodbatlas_cluster.existing.name
}

output "connection_string_standard" {
  description = "Standard connection string"
  value       = data.mongodbatlas_cluster.existing.connection_strings[0].standard
  sensitive   = true
}

output "connection_string_standard_srv" {
  description = "Standard SRV connection string"
  value       = data.mongodbatlas_cluster.existing.connection_strings[0].standard_srv
  sensitive   = true
}

output "mongo_uri" {
  description = "Complete MongoDB URI with credentials"
  value       = "mongodb+srv://${var.db_username}:${var.db_password}@${replace(data.mongodbatlas_cluster.existing.connection_strings[0].standard_srv, "mongodb+srv://", "")}/${var.database_name}?retryWrites=true&w=majority"
  sensitive   = true
}

output "mongo_db_version" {
  description = "MongoDB version"
  value       = data.mongodbatlas_cluster.existing.mongo_db_version
}

output "database_name" {
  description = "Database name"
  value       = var.database_name
}

output "state_name" {
  description = "Current state of the cluster"
  value       = data.mongodbatlas_cluster.existing.state_name
}
