terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  # Remote state backend
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "statefilesbdn"
    container_name       = "ct-hoptranscribe-state"
    key                  = "azure.tfstate"
  }
}

provider "azurerm" {
  features {}
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "${var.project_name}-${var.environment}-rg"
  location = var.location

  tags = var.tags
}

# Log Analytics Workspace for Container Apps
resource "azurerm_log_analytics_workspace" "logs" {
  name                = "${var.project_name}-${var.environment}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_retention_days

  tags = var.tags
}

# Application Insights for monitoring user analytics and custom events
resource "azurerm_application_insights" "insights" {
  name                = "${var.project_name}-${var.environment}-insights"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.logs.id
  application_type    = "web"

  tags = var.tags
}

# Storage Account for SQLite database file
resource "azurerm_storage_account" "sessions" {
  name                     = "${replace(var.project_name, "-", "")}${var.environment}st"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = var.storage_account_replication

  tags = var.tags
}

# File Share for session database
resource "azurerm_storage_share" "sessions_db" {
  name                 = "sessions-db"
  storage_account_name = azurerm_storage_account.sessions.name
  quota                = var.sessions_db_quota_gb
}

# Container Apps Environment Storage - mounts the file share
resource "azurerm_container_app_environment_storage" "sessions_storage" {
  name                         = "sessions-storage"
  container_app_environment_id = azurerm_container_app_environment.env.id
  account_name                 = azurerm_storage_account.sessions.name
  share_name                   = azurerm_storage_share.sessions_db.name
  access_key                   = azurerm_storage_account.sessions.primary_access_key
  access_mode                  = "ReadWrite"
}

# Container Apps Environment
resource "azurerm_container_app_environment" "env" {
  name                       = "${var.project_name}-${var.environment}-env"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.logs.id

  tags = var.tags
}

# Backend Container App
resource "azurerm_container_app" "backend" {
  name                         = "${var.project_name}-api"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  identity {
    type = "SystemAssigned"
  }

  registry {
    server               = "docker.io"
    username             = var.dockerhub_username
    password_secret_name = "dockerhub-password"
  }

  secret {
    name  = "dockerhub-password"
    value = var.dockerhub_token
  }

  secret {
    name  = "openai-api-key"
    value = var.openai_api_key
  }

  secret {
    name  = "appinsights-connection-string"
    value = azurerm_application_insights.insights.connection_string
  }

  secret {
    name  = "storage-account-key"
    value = azurerm_storage_account.sessions.primary_access_key
  }

  template {
    min_replicas = var.backend_min_replicas
    max_replicas = var.backend_max_replicas

    volume {
      name         = "sessions-data"
      storage_type = "AzureFile"
      storage_name = azurerm_container_app_environment_storage.sessions_storage.name
    }

    container {
      name   = "backend"
      image  = "bridan/${var.backend_image_name}:latest"
      cpu    = var.backend_cpu
      memory = var.backend_memory

      env {
        name  = "ASPNETCORE_ENVIRONMENT"
        value = var.environment == "prod" ? "Production" : "Development"
      }

      env {
        name  = "SessionStorage__ConnectionString"
        value = "Data Source=/data/sessions.db;Cache=Shared;Mode=ReadWriteCreate"
      }

      env {
        name        = "OpenAI__ApiKey"
        secret_name = "openai-api-key"
      }

      env {
        name  = "OpenAI__TimeoutSeconds"
        value = "30"
      }

      env {
        name  = "OpenAI__Voice"
        value = var.openai_voice
      }

      env {
        name        = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        secret_name = "appinsights-connection-string"
      }

      volume_mounts {
        name = "sessions-data"
        path = "/data"
      }

      liveness_probe {
        transport = "HTTP"
        port      = 8080
        path      = "/health/status"
      }

      readiness_probe {
        transport = "HTTP"
        port      = 8080
        path      = "/health/status"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  tags = var.tags
}

# Role assignment for backend to access storage account
resource "azurerm_role_assignment" "backend_storage" {
  scope                = azurerm_storage_account.sessions.id
  role_definition_name = "Storage File Data SMB Share Contributor"
  principal_id         = azurerm_container_app.backend.identity.0.principal_id
}

# Frontend Container App
resource "azurerm_container_app" "frontend" {
  name                         = "${var.project_name}-web"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  registry {
    server               = "docker.io"
    username             = var.dockerhub_username
    password_secret_name = "dockerhub-password"
  }

  secret {
    name  = "dockerhub-password"
    value = var.dockerhub_token
  }

  secret {
    name  = "appinsights-connection-string"
    value = azurerm_application_insights.insights.connection_string
  }

  template {
    min_replicas = var.frontend_min_replicas
    max_replicas = var.frontend_max_replicas

    container {
      name   = "frontend"
      image  = "bridan/${var.frontend_image_name}:latest"
      cpu    = var.frontend_cpu
      memory = var.frontend_memory

      env {
        name  = "VITE_API_BASE_URL"
        value = "https://${azurerm_container_app.backend.ingress[0].fqdn}"
      }

      env {
        name        = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        secret_name = "appinsights-connection-string"
      }

      liveness_probe {
        transport = "HTTP"
        port      = 80
        path      = "/"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 80

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  tags = var.tags

  depends_on = [azurerm_container_app.backend]
}
