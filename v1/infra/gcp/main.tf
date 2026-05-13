terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Uncomment for remote state
  # backend "gcs" {
  #   bucket = "terraform-state-hoptranscribe"
  #   prefix = "terraform/state"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "compute.googleapis.com",
    "vpcaccess.googleapis.com",
  ])
  
  service            = each.value
  disable_on_destroy = false
}

# Artifact Registry for Docker images
resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = "${var.project_name}-${var.environment}"
  description   = "Docker repository for ${var.project_name}"
  format        = "DOCKER"
  
  labels = var.labels
  
  depends_on = [google_project_service.apis]
}

# Secret Manager for OpenAI API Key
resource "google_secret_manager_secret" "openai_key" {
  secret_id = "${var.project_name}-${var.environment}-openai-key"
  
  replication {
    auto {}
  }
  
  labels = var.labels
  
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "openai_key" {
  secret      = google_secret_manager_secret.openai_key.id
  secret_data = var.openai_api_key
}

# Service Account for Cloud Run
resource "google_service_account" "cloudrun" {
  account_id   = "${var.project_name}-${var.environment}-sa"
  display_name = "Service Account for ${var.project_name} Cloud Run"
  description  = "Used by Cloud Run services to access secrets and other resources"
}

# Grant access to Secret Manager
resource "google_secret_manager_secret_iam_member" "cloudrun_secret_access" {
  secret_id = google_secret_manager_secret.openai_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloudrun.email}"
}

# Grant access to Artifact Registry
resource "google_artifact_registry_repository_iam_member" "cloudrun_repo_access" {
  location   = google_artifact_registry_repository.repo.location
  repository = google_artifact_registry_repository.repo.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.cloudrun.email}"
}

# Backend Cloud Run Service
resource "google_cloud_run_v2_service" "backend" {
  name     = "${var.project_name}-${var.environment}-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"
  
  template {
    service_account = google_service_account.cloudrun.email
    
    scaling {
      min_instance_count = var.backend_min_instances
      max_instance_count = var.backend_max_instances
    }
    
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.repository_id}/${var.backend_image_name}:latest"
      
      resources {
        limits = {
          cpu    = var.backend_cpu
          memory = var.backend_memory
        }
        cpu_idle = var.backend_min_instances == 0
      }
      
      ports {
        container_port = 8080
      }
      
      env {
        name  = "ASPNETCORE_ENVIRONMENT"
        value = var.environment == "prod" ? "Production" : "Development"
      }
      
      env {
        name = "OpenAI__ApiKey"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.openai_key.secret_id
            version = "latest"
          }
        }
      }
      
      env {
        name  = "OpenAI__TimeoutSeconds"
        value = "30"
      }
      
      env {
        name  = "OpenAI__Voice"
        value = var.openai_voice
      }
      
      startup_probe {
        http_get {
          path = "/health/status"
          port = 8080
        }
        initial_delay_seconds = 10
        timeout_seconds       = 5
        period_seconds        = 10
        failure_threshold     = 3
      }
      
      liveness_probe {
        http_get {
          path = "/health/status"
          port = 8080
        }
        initial_delay_seconds = 30
        timeout_seconds       = 5
        period_seconds        = 30
        failure_threshold     = 3
      }
    }
    
    timeout = "300s"
  }
  
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
  
  labels = var.labels
  
  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_version.openai_key,
  ]
}

# Backend IAM Policy - Allow public access
resource "google_cloud_run_service_iam_member" "backend_public" {
  location = google_cloud_run_v2_service.backend.location
  service  = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Frontend Cloud Run Service
resource "google_cloud_run_v2_service" "frontend" {
  name     = "${var.project_name}-${var.environment}-frontend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"
  
  template {
    service_account = google_service_account.cloudrun.email
    
    scaling {
      min_instance_count = var.frontend_min_instances
      max_instance_count = var.frontend_max_instances
    }
    
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.repository_id}/${var.frontend_image_name}:latest"
      
      resources {
        limits = {
          cpu    = var.frontend_cpu
          memory = var.frontend_memory
        }
        cpu_idle = var.frontend_min_instances == 0
      }
      
      ports {
        container_port = 80
      }
      
      env {
        name  = "VITE_API_URL"
        value = google_cloud_run_v2_service.backend.uri
      }
      
      startup_probe {
        http_get {
          path = "/"
          port = 80
        }
        initial_delay_seconds = 5
        timeout_seconds       = 5
        period_seconds        = 10
        failure_threshold     = 3
      }
      
      liveness_probe {
        http_get {
          path = "/"
          port = 80
        }
        initial_delay_seconds = 10
        timeout_seconds       = 5
        period_seconds        = 30
        failure_threshold     = 3
      }
    }
    
    timeout = "300s"
  }
  
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
  
  labels = var.labels
  
  depends_on = [
    google_project_service.apis,
    google_cloud_run_v2_service.backend,
  ]
}

# Frontend IAM Policy - Allow public access
resource "google_cloud_run_service_iam_member" "frontend_public" {
  location = google_cloud_run_v2_service.frontend.location
  service  = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Load Balancer (optional - for custom domain)
resource "google_compute_global_address" "default" {
  count = var.enable_load_balancer ? 1 : 0
  name  = "${var.project_name}-${var.environment}-ip"
}

# Backend Service for Load Balancer
resource "google_compute_backend_service" "frontend_backend" {
  count       = var.enable_load_balancer ? 1 : 0
  name        = "${var.project_name}-${var.environment}-frontend-backend"
  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 30
  
  backend {
    group = google_compute_region_network_endpoint_group.frontend_neg[0].id
  }
  
  log_config {
    enable = true
  }
}

# Network Endpoint Group for Cloud Run
resource "google_compute_region_network_endpoint_group" "frontend_neg" {
  count                 = var.enable_load_balancer ? 1 : 0
  name                  = "${var.project_name}-${var.environment}-frontend-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  
  cloud_run {
    service = google_cloud_run_v2_service.frontend.name
  }
}

# URL Map for Load Balancer
resource "google_compute_url_map" "default" {
  count           = var.enable_load_balancer ? 1 : 0
  name            = "${var.project_name}-${var.environment}-url-map"
  default_service = google_compute_backend_service.frontend_backend[0].id
}

# HTTP Proxy
resource "google_compute_target_http_proxy" "default" {
  count   = var.enable_load_balancer ? 1 : 0
  name    = "${var.project_name}-${var.environment}-http-proxy"
  url_map = google_compute_url_map.default[0].id
}

# Forwarding Rule
resource "google_compute_global_forwarding_rule" "default" {
  count                 = var.enable_load_balancer ? 1 : 0
  name                  = "${var.project_name}-${var.environment}-forwarding-rule"
  target                = google_compute_target_http_proxy.default[0].id
  port_range            = "80"
  ip_address            = google_compute_global_address.default[0].address
  load_balancing_scheme = "EXTERNAL"
}
