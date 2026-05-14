variable "name_prefix" {
  description = "Short name prefix for all resources (3-12 chars, lowercase, no hyphens preferred for global-name resources)."
  type        = string
  default     = "hoptx"

  validation {
    condition     = can(regex("^[a-z][a-z0-9]{2,11}$", var.name_prefix))
    error_message = "name_prefix must be 3-12 chars, start with a letter, and contain only lowercase letters and digits."
  }
}

variable "env" {
  description = "Environment short name (prod, stage, dev)."
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["prod", "stage", "dev"], var.env)
    error_message = "env must be one of prod, stage, dev."
  }
}

variable "location" {
  description = "Azure region for all resources."
  type        = string
  default     = "eastus"
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default = {
    application = "HOPTranscribe"
    managedBy   = "terraform"
    component   = "v2"
  }
}

variable "log_retention_days" {
  description = "Log Analytics workspace retention in days."
  type        = number
  default     = 30
}

variable "openai_api_key" {
  description = "OpenAI API key (stored in Key Vault)."
  type        = string
  sensitive   = true
}

variable "jwt_signing_key" {
  description = "JWT HS256 signing key. If null, a 64-char random key is generated and stored in Key Vault."
  type        = string
  sensitive   = true
  default     = null
}

variable "matching_model" {
  description = "Primary OpenAI matching model."
  type        = string
  default     = "gpt-5-mini"
}

variable "matching_fallback_model" {
  description = "Fallback model if matching_model is unavailable."
  type        = string
  default     = "gpt-4o-mini"
}

variable "realtime_model" {
  description = "OpenAI realtime transcription model."
  type        = string
  default     = "gpt-realtime-whisper"
}

variable "api_image_repository" {
  description = "Image repository name in ACR for the API."
  type        = string
  default     = "hoptranscribe-api"
}

variable "web_image_repository" {
  description = "Image repository name in ACR for the web frontend."
  type        = string
  default     = "hoptranscribe-web"
}

variable "image_tag" {
  description = "Tag pushed to both API and web images during deploy."
  type        = string
  default     = "latest"
}

variable "allowed_origins" {
  description = "Comma-separated list of origins allowed by API CORS (e.g. https://app.example.com). The web container app's default URL is added automatically."
  type        = string
  default     = ""
}

variable "api_cpu" {
  description = "vCPU per API replica."
  type        = number
  default     = 0.5
}

variable "api_memory" {
  description = "Memory per API replica (e.g. 1Gi)."
  type        = string
  default     = "1Gi"
}

variable "api_min_replicas" {
  description = "Min replicas for the API container app."
  type        = number
  default     = 1
}

variable "api_max_replicas" {
  description = "Max replicas for the API container app."
  type        = number
  default     = 3
}

variable "web_cpu" {
  description = "vCPU per web replica."
  type        = number
  default     = 0.25
}

variable "web_memory" {
  description = "Memory per web replica."
  type        = string
  default     = "0.5Gi"
}

variable "web_min_replicas" {
  description = "Min replicas for the web container app."
  type        = number
  default     = 1
}

variable "web_max_replicas" {
  description = "Max replicas for the web container app."
  type        = number
  default     = 2
}

variable "key_vault_authorized_object_ids" {
  description = "Additional Entra object IDs (users/groups/SPNs) granted Key Vault Secrets Officer for operations like rotating secrets."
  type        = list(string)
  default     = []
}
