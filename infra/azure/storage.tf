resource "azurerm_storage_account" "this" {
  name                     = local.names.storage
  resource_group_name      = azurerm_resource_group.this.name
  location                 = azurerm_resource_group.this.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"
  min_tls_version          = "TLS1_2"

  # File shares require shared key access for the Container Apps SMB mount.
  shared_access_key_enabled = true
  tags                      = var.tags
}

resource "azurerm_storage_share" "sqlite" {
  name               = local.names.share
  storage_account_id = azurerm_storage_account.this.id
  quota              = 5 # GiB
}
