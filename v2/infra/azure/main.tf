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
    rg      = "rg-${local.base}"
    acr     = substr("cr${local.base_compact}${local.suffix}", 0, 50)
    kv      = substr("kv-${local.base}-${local.suffix}", 0, 24)
    uami    = "id-${local.base}"
    law     = "log-${local.base}"
    appi    = "appi-${local.base}"
    storage = substr("st${local.base_compact}${local.suffix}", 0, 24)
    share   = "sqlite"
    cae     = "cae-${local.base}"
    api_app = "ca-${local.base}-api"
    web_app = "ca-${local.base}-web"
  }

  effective_jwt_signing_key = coalesce(var.jwt_signing_key, try(random_password.jwt[0].result, ""))

  allowed_origins_list = compact(split(",", var.allowed_origins))
}

resource "azurerm_resource_group" "this" {
  name     = local.names.rg
  location = var.location
  tags     = var.tags
}
