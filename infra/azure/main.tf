data "azurerm_client_config" "current" {}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
  numeric = true
}

resource "random_password" "jwt" {
  count   = var.jwt_signing_key == null ? 1 : 0
  length  = 64
  special = false
}

locals {
  suffix = random_string.suffix.result

  base = "${var.name_prefix}-${var.env}"
  # Global-name resources (ACR, KV, Storage) cannot contain hyphens and must be globally unique.
  base_compact = lower(replace(local.base, "-", ""))

  names = {
    rg            = "rg-${local.base}"
    acr           = substr("cr${local.base_compact}${local.suffix}", 0, 50)
    kv            = substr("kv-${local.base}-${local.suffix}", 0, 24)
    uami          = "id-${local.base}"
    law           = "log-${local.base}"
    appi          = "appi-${local.base}"
    cae           = "cae-${local.base}"
    api_app       = "ca-${local.base}-api"
    web_app       = "ca-${local.base}-web"
    keepalive_job = "job-${local.base}-keepalive"
  }

  effective_jwt_signing_key = coalesce(var.jwt_signing_key, try(random_password.jwt[0].result, ""))

  allowed_origins_list = compact(split(",", var.allowed_origins))

  # Supabase Postgres connection string. Sent into Key Vault as a single secret
  # (db-connection-string) and consumed by the API as ConnectionStrings__SessionDb.
  db_connection_string = "Host=${var.db_host};Port=${var.db_port};Database=${var.db_name};Username=${var.db_user};Password=${var.db_password};SSL Mode=Require;Trust Server Certificate=true"
}

resource "azurerm_resource_group" "this" {
  name     = local.names.rg
  location = var.location
  tags     = var.tags
}
