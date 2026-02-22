output "project_url" {
  description = "Vercel dashboard frontend URL"
  value       = "https://${vercel_project.dashboard_frontend.name}.vercel.app"
}

output "project_id" {
  description = "Vercel project ID"
  value       = vercel_project.dashboard_frontend.id
}
