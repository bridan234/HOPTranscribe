resource "azurerm_user_assigned_identity" "app" {
  name                = local.names.uami
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  tags                = var.tags
}

# Allow the workload identity to pull images from ACR.
resource "azurerm_role_assignment" "uami_acr_pull" {
  scope                = azurerm_container_registry.this.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# Allow the workload identity to read Key Vault secrets at runtime.
resource "azurerm_role_assignment" "uami_kv_secrets_user" {
  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}
