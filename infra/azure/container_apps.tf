resource "azurerm_container_app_environment" "this" {
  name                       = local.names.cae
  resource_group_name        = azurerm_resource_group.this.name
  location                   = azurerm_resource_group.this.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
  tags                       = var.tags
}

# SMB file share registered with the env, mounted by the API container.
resource "azurerm_container_app_environment_storage" "sqlite" {
  name                         = "sqlite-share"
  container_app_environment_id = azurerm_container_app_environment.this.id
  account_name                 = azurerm_storage_account.this.name
  share_name                   = azurerm_storage_share.sqlite.name
  access_key                   = azurerm_storage_account.this.primary_access_key
  access_mode                  = "ReadWrite"
}

locals {
  # Container App revisions are immutable; if the image tag is "latest", baking
  # the env-vars set is sufficient because revision suffix changes will not be
  # auto-generated. For first-class CD you should push a tag like the git SHA
  # via image_tag and let terraform apply roll the revision.
  api_image = "${azurerm_container_registry.this.login_server}/${var.api_image_repository}:${var.image_tag}"
  web_image = "${azurerm_container_registry.this.login_server}/${var.web_image_repository}:${var.image_tag}"
}

resource "azurerm_container_app" "api" {
  name                         = local.names.api_app
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  revision_mode                = "Single"
  tags                         = var.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  registry {
    server   = azurerm_container_registry.this.login_server
    identity = azurerm_user_assigned_identity.app.id
  }

  secret {
    name                = "openai-api-key"
    key_vault_secret_id = azurerm_key_vault_secret.openai_api_key.versionless_id
    identity            = azurerm_user_assigned_identity.app.id
  }

  secret {
    name                = "jwt-signing-key"
    key_vault_secret_id = azurerm_key_vault_secret.jwt_signing_key.versionless_id
    identity            = azurerm_user_assigned_identity.app.id
  }

  template {
    min_replicas = var.api_min_replicas
    max_replicas = var.api_max_replicas

    container {
      name   = "api"
      image  = local.api_image
      cpu    = var.api_cpu
      memory = var.api_memory

      env {
        name  = "ASPNETCORE_ENVIRONMENT"
        value = "Production"
      }
      env {
        name  = "ASPNETCORE_URLS"
        value = "http://+:8080"
      }
      env {
        name  = "ConnectionStrings__SessionDb"
        value = "Data Source=/data/sessions.db;Cache=Shared"
      }
      env {
        name  = "OpenAI__RealtimeModel"
        value = var.realtime_model
      }
      env {
        name  = "OpenAI__MatchingModel"
        value = var.matching_model
      }
      env {
        name  = "OpenAI__MatchingFallbackModel"
        value = var.matching_fallback_model
      }
      env {
        name        = "OpenAI__ApiKey"
        secret_name = "openai-api-key"
      }
      env {
        name  = "Jwt__Issuer"
        value = "hoptranscribe"
      }
      env {
        name  = "Jwt__Audience"
        value = "hoptranscribe-web"
      }
      env {
        name        = "Jwt__SigningKey"
        secret_name = "jwt-signing-key"
      }
      # The API binds CORS origins from the AllowedOrigins:N array. Expand the
      # caller-supplied comma-separated list into one env var per index.
      dynamic "env" {
        for_each = { for i, origin in local.allowed_origins_list : "AllowedOrigins__${i}" => origin }
        content {
          name  = env.key
          value = env.value
        }
      }
      env {
        name  = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        value = azurerm_application_insights.this.connection_string
      }

      volume_mounts {
        name = "sqlite"
        path = "/data"
      }

      liveness_probe {
        path             = "/health/status"
        port             = 8080
        transport        = "HTTP"
        initial_delay    = 15
        interval_seconds = 30
      }

      readiness_probe {
        path             = "/health/status"
        port             = 8080
        transport        = "HTTP"
        interval_seconds = 15
      }
    }

    volume {
      name         = "sqlite"
      storage_type = "AzureFile"
      storage_name = azurerm_container_app_environment_storage.sqlite.name
    }
  }

  ingress {
    external_enabled           = true
    target_port                = 8080
    transport                  = "auto"
    allow_insecure_connections = false

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  depends_on = [
    azurerm_role_assignment.uami_acr_pull,
    azurerm_role_assignment.uami_kv_secrets_user,
  ]

  lifecycle {
    # Allow image to roll independently; terraform won't fight an out-of-band image push.
    ignore_changes = [template[0].container[0].image]
  }
}

resource "azurerm_container_app" "web" {
  name                         = local.names.web_app
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  revision_mode                = "Single"
  tags                         = var.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  registry {
    server   = azurerm_container_registry.this.login_server
    identity = azurerm_user_assigned_identity.app.id
  }

  template {
    min_replicas = var.web_min_replicas
    max_replicas = var.web_max_replicas

    container {
      name   = "web"
      image  = local.web_image
      cpu    = var.web_cpu
      memory = var.web_memory

      # API_BASE_URL is consumed at container start by web/docker-entrypoint.sh,
      # which renders /usr/share/nginx/html/config.js. The SPA reads it from
      # window.__APP_CONFIG__.apiBaseUrl at boot — no build-time wiring needed.
      env {
        name  = "API_BASE_URL"
        value = "https://${azurerm_container_app.api.ingress[0].fqdn}"
      }
    }
  }

  ingress {
    external_enabled           = true
    target_port                = 80
    transport                  = "auto"
    allow_insecure_connections = false

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  depends_on = [
    azurerm_role_assignment.uami_acr_pull,
  ]

  lifecycle {
    ignore_changes = [template[0].container[0].image]
  }
}
