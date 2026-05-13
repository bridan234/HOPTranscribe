output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP Region"
  value       = var.region
}

output "artifact_registry_url" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.repository_id}"
}

output "backend_url" {
  description = "Backend Cloud Run service URL"
  value       = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  description = "Frontend Cloud Run service URL"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "backend_service_name" {
  description = "Backend Cloud Run service name"
  value       = google_cloud_run_v2_service.backend.name
}

output "frontend_service_name" {
  description = "Frontend Cloud Run service name"
  value       = google_cloud_run_v2_service.frontend.name
}

output "service_account_email" {
  description = "Service Account email for Cloud Run"
  value       = google_service_account.cloudrun.email
}

output "openai_secret_id" {
  description = "Secret Manager secret ID for OpenAI key"
  value       = google_secret_manager_secret.openai_key.secret_id
  sensitive   = true
}

output "load_balancer_ip" {
  description = "Load Balancer IP address (if enabled)"
  value       = var.enable_load_balancer ? google_compute_global_address.default[0].address : null
}

output "load_balancer_url" {
  description = "Load Balancer URL (if enabled)"
  value       = var.enable_load_balancer ? "http://${google_compute_global_address.default[0].address}" : null
}
