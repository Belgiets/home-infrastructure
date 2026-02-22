terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 4.0"
    }
  }
}

# Vercel Project for Dashboard Frontend
resource "vercel_project" "dashboard_frontend" {
  name           = "home-infra-dashboard-${var.environment}"
  framework      = "nextjs"
  root_directory = "domains/dashboard/frontend"

  git_repository = {
    type              = "github"
    repo              = var.github_repo
    production_branch = "main"
  }
}

# BACKEND_URL — used by Next.js rewrites to proxy /api/* requests to Cloud Run
resource "vercel_project_environment_variable" "backend_url" {
  project_id = vercel_project.dashboard_frontend.id
  key        = "BACKEND_URL"
  value      = var.backend_url
  target     = ["production", "preview"]
}
