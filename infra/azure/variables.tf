# Project Configuration
variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "hoptranscribe"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "canadacentral"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project   = "HOPTranscribe"
    ManagedBy = "Terraform"
  }
}

# Docker Hub Configuration
variable "dockerhub_username" {
  description = "Docker Hub username"
  type        = string
  default     = "bridan"
}

variable "dockerhub_token" {
  description = "Docker Hub access token or password (sensitive)"
  type        = string
  sensitive   = true
}

# Logging
variable "log_retention_days" {
  description = "Log Analytics retention in days (must be 7 or between 30-730)"
  type        = number
  default     = 30

  validation {
    condition     = var.log_retention_days == 7 || (var.log_retention_days >= 30 && var.log_retention_days <= 730)
    error_message = "Log retention must be either 7 days (free tier) or between 30-730 days (paid retention)."
  }
}

# Backend Configuration
variable "backend_image_name" {
  description = "Backend container image name"
  type        = string
  default     = "hoptranscribe-backend"
}

variable "backend_min_replicas" {
  description = "Minimum number of backend replicas"
  type        = number
  default     = 0

  validation {
    condition     = var.backend_min_replicas >= 0 && var.backend_min_replicas <= 30
    error_message = "Min replicas must be between 0 and 30."
  }
}

variable "backend_max_replicas" {
  description = "Maximum number of backend replicas"
  type        = number
  default     = 2

  validation {
    condition     = var.backend_max_replicas >= 1 && var.backend_max_replicas <= 30
    error_message = "Max replicas must be between 1 and 30."
  }
}

variable "backend_cpu" {
  description = "CPU cores for backend container (0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0)"
  type        = number
  default     = 0.5
}

variable "backend_memory" {
  description = "Memory for backend container (e.g., 0.5Gi, 1Gi, 2Gi)"
  type        = string
  default     = "1Gi"
}

# Frontend Configuration
variable "frontend_image_name" {
  description = "Frontend container image name"
  type        = string
  default     = "hoptranscribe-frontend"
}

variable "frontend_min_replicas" {
  description = "Minimum number of frontend replicas"
  type        = number
  default     = 0

  validation {
    condition     = var.frontend_min_replicas >= 0 && var.frontend_min_replicas <= 30
    error_message = "Min replicas must be between 0 and 30."
  }
}

variable "frontend_max_replicas" {
  description = "Maximum number of frontend replicas"
  type        = number
  default     = 2

  validation {
    condition     = var.frontend_max_replicas >= 1 && var.frontend_max_replicas <= 30
    error_message = "Max replicas must be between 1 and 30."
  }
}

variable "frontend_cpu" {
  description = "CPU cores for frontend container"
  type        = number
  default     = 0.5
}

variable "frontend_memory" {
  description = "Memory for frontend container"
  type        = string
  default     = "1Gi"
}

# OpenAI Configuration
variable "openai_api_key" {
  description = "OpenAI API key (sensitive)"
  type        = string
  sensitive   = true
}

variable "openai_voice" {
  description = "OpenAI voice model"
  type        = string
  default     = "alloy"
}

# Storage Configuration
variable "storage_account_replication" {
  description = "Storage account replication type (LRS, GRS, RAGRS, ZRS)"
  type        = string
  default     = "LRS"

  validation {
    condition     = contains(["LRS", "GRS", "RAGRS", "ZRS", "GZRS", "RAGZRS"], var.storage_account_replication)
    error_message = "Must be one of: LRS, GRS, RAGRS, ZRS, GZRS, RAGZRS."
  }
}

variable "sessions_db_quota_gb" {
  description = "File share quota in GB for sessions database"
  type        = number
  default     = 10

  validation {
    condition     = var.sessions_db_quota_gb >= 1 && var.sessions_db_quota_gb <= 102400
    error_message = "Quota must be between 1 and 102400 GB."
  }
}
