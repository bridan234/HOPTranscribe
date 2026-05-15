resource "azurerm_container_app_job" "supabase_keepalive" {
  count                        = var.keepalive_enabled ? 1 : 0
  name                         = local.names.keepalive_job
  resource_group_name          = azurerm_resource_group.this.name
  location                     = azurerm_resource_group.this.location
  container_app_environment_id = azurerm_container_app_environment.this.id
  replica_timeout_in_seconds   = 300
  replica_retry_limit          = 1
  tags                         = var.tags

  schedule_trigger_config {
    cron_expression          = var.keepalive_cron_expression
    parallelism              = 1
    replica_completion_count = 1
  }

  template {
    container {
      name   = "keepalive"
      image  = var.keepalive_image
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "API_URL"
        value = "https://${azurerm_container_app.api.ingress[0].fqdn}"
      }

      command = ["/bin/sh", "-c"]
      args = [<<-EOT
        set -eu

        api_url="$${API_URL%/}"

        token="$$(curl --fail --silent --show-error \
          -X POST "$${api_url}/api/auth/claim" \
          -H 'content-type: application/json' \
          --data '{"username":"keepalive"}' \
          | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"

        if [ -z "$${token}" ]; then
          echo "Failed to parse keepalive auth token" >&2
          exit 1
        fi

        curl --fail --silent --show-error \
          "$${api_url}/api/sessions?page=1&pageSize=1" \
          -H "authorization: Bearer $${token}" \
          >/dev/null

        echo "Supabase keepalive completed"
      EOT
      ]
    }
  }

  depends_on = [azurerm_container_app.api]
}
