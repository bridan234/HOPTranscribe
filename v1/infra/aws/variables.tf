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

variable "region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project   = "HOPTranscribe"
    ManagedBy = "Terraform"
  }
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for subnets"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# Logging
variable "log_retention_days" {
  description = "CloudWatch Logs retention in days"
  type        = number
  default     = 30
}

# Backend Configuration
variable "backend_cpu" {
  description = "CPU units for backend task (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 1024
  
  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.backend_cpu)
    error_message = "Backend CPU must be 256, 512, 1024, 2048, or 4096."
  }
}

variable "backend_memory" {
  description = "Memory for backend task in MB (512, 1024, 2048, 4096, 8192)"
  type        = number
  default     = 2048
  
  validation {
    condition     = contains([512, 1024, 2048, 4096, 8192, 16384, 30720], var.backend_memory)
    error_message = "Memory must be valid for selected CPU."
  }
}

variable "backend_desired_count" {
  description = "Desired number of backend tasks"
  type        = number
  default     = 1
}

variable "backend_min_capacity" {
  description = "Minimum number of backend tasks for auto-scaling"
  type        = number
  default     = 1
}

variable "backend_max_capacity" {
  description = "Maximum number of backend tasks for auto-scaling"
  type        = number
  default     = 3
}

# Frontend Configuration
variable "frontend_cpu" {
  description = "CPU units for frontend task"
  type        = number
  default     = 512
  
  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.frontend_cpu)
    error_message = "Frontend CPU must be 256, 512, 1024, 2048, or 4096."
  }
}

variable "frontend_memory" {
  description = "Memory for frontend task in MB"
  type        = number
  default     = 1024
  
  validation {
    condition     = contains([512, 1024, 2048, 4096, 8192, 16384, 30720], var.frontend_memory)
    error_message = "Memory must be valid for selected CPU."
  }
}

variable "frontend_desired_count" {
  description = "Desired number of frontend tasks"
  type        = number
  default     = 1
}

variable "frontend_min_capacity" {
  description = "Minimum number of frontend tasks for auto-scaling"
  type        = number
  default     = 1
}

variable "frontend_max_capacity" {
  description = "Maximum number of frontend tasks for auto-scaling"
  type        = number
  default     = 5
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
