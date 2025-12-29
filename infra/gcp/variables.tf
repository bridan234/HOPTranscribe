# Project Configuration
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

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

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "labels" {
  description = "Labels to apply to all resources"
  type        = map(string)
  default = {
    project    = "hoptranscribe"
    managed-by = "terraform"
  }
}

# Backend Configuration
variable "backend_image_name" {
  description = "Backend container image name"
  type        = string
  default     = "hoptranscribe-backend"
}

variable "backend_min_instances" {
  description = "Minimum number of backend instances (0 for scale-to-zero)"
  type        = number
  default     = 1
  
  validation {
    condition     = var.backend_min_instances >= 0 && var.backend_min_instances <= 100
    error_message = "Min instances must be between 0 and 100."
  }
}

variable "backend_max_instances" {
  description = "Maximum number of backend instances"
  type        = number
  default     = 3
  
  validation {
    condition     = var.backend_max_instances >= 1 && var.backend_max_instances <= 1000
    error_message = "Max instances must be between 1 and 1000."
  }
}

variable "backend_cpu" {
  description = "CPU for backend (1, 2, 4, 6, 8)"
  type        = string
  default     = "1"
  
  validation {
    condition     = contains(["1", "2", "4", "6", "8"], var.backend_cpu)
    error_message = "Backend CPU must be 1, 2, 4, 6, or 8."
  }
}

variable "backend_memory" {
  description = "Memory for backend (e.g., 512Mi, 1Gi, 2Gi, 4Gi, 8Gi)"
  type        = string
  default     = "2Gi"
}

# Frontend Configuration
variable "frontend_image_name" {
  description = "Frontend container image name"
  type        = string
  default     = "hoptranscribe-frontend"
}

variable "frontend_min_instances" {
  description = "Minimum number of frontend instances (0 for scale-to-zero)"
  type        = number
  default     = 1
  
  validation {
    condition     = var.frontend_min_instances >= 0 && var.frontend_min_instances <= 100
    error_message = "Min instances must be between 0 and 100."
  }
}

variable "frontend_max_instances" {
  description = "Maximum number of frontend instances"
  type        = number
  default     = 5
  
  validation {
    condition     = var.frontend_max_instances >= 1 && var.frontend_max_instances <= 1000
    error_message = "Max instances must be between 1 and 1000."
  }
}

variable "frontend_cpu" {
  description = "CPU for frontend"
  type        = string
  default     = "1"
  
  validation {
    condition     = contains(["1", "2", "4", "6", "8"], var.frontend_cpu)
    error_message = "Frontend CPU must be 1, 2, 4, 6, or 8."
  }
}

variable "frontend_memory" {
  description = "Memory for frontend"
  type        = string
  default     = "512Mi"
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

# Deepgram Configuration
variable "deepgram_api_key" {
  description = "Deepgram API key for streaming transcription (sensitive)"
  type        = string
  sensitive   = true
}

variable "deepgram_model" {
  description = "Deepgram model for transcription"
  type        = string
  default     = "nova-2"
}

variable "deepgram_language" {
  description = "Deepgram language for transcription"
  type        = string
  default     = "en-US"
}

# Ollama Configuration (sidecar)
variable "ollama_model" {
  description = "Ollama model for scripture detection"
  type        = string
  default     = "gpt-oss:20b"
}

variable "ollama_cpu" {
  description = "CPU for Ollama sidecar"
  type        = string
  default     = "8"
}

variable "ollama_memory" {
  description = "Memory for Ollama sidecar"
  type        = string
  default     = "24Gi"
}

# Load Balancer Configuration
variable "enable_load_balancer" {
  description = "Enable Cloud Load Balancer (for custom domain)"
  type        = bool
  default     = false
}
