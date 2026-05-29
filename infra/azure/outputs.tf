output "resource_group_name" {
  description = "Resource group containing all v2 resources."
  value       = azurerm_resource_group.this.name
}

output "location" {
  description = "Azure region used for the deployment."
  value       = azurerm_resource_group.this.location
}

output "acr_login_server" {
  description = "ACR login server (use with docker push)."
  value       = azurerm_container_registry.this.login_server
}

output "acr_name" {
  description = "ACR resource name."
  value       = azurerm_container_registry.this.name
}

output "api_image_reference" {
  description = "Full image reference for the API."
  value       = "${azurerm_container_registry.this.login_server}/${var.api_image_repository}:${var.image_tag}"
}

output "web_image_reference" {
  description = "Full image reference for the web."
  value       = "${azurerm_container_registry.this.login_server}/${var.web_image_repository}:${var.image_tag}"
}

output "api_fqdn" {
  description = "External FQDN of the API container app."
  value       = try(azurerm_container_app.api.ingress[0].fqdn, null)
}

output "api_url" {
  description = "Public HTTPS URL of the API."
  value       = try("https://${azurerm_container_app.api.ingress[0].fqdn}", null)
}

output "web_fqdn" {
  description = "External FQDN of the web container app."
  value       = try(azurerm_container_app.web.ingress[0].fqdn, null)
}

output "web_url" {
  description = "Public HTTPS URL of the web frontend."
  value       = try("https://${azurerm_container_app.web.ingress[0].fqdn}", null)
}

output "key_vault_name" {
  description = "Key Vault holding OpenAI and JWT secrets."
  value       = azurerm_key_vault.this.name
}

output "key_vault_uri" {
  description = "Key Vault URI."
  value       = azurerm_key_vault.this.vault_uri
}

output "managed_identity_client_id" {
  description = "Client ID of the workload managed identity (used by Container Apps to pull from ACR and read KV)."
  value       = azurerm_user_assigned_identity.app.client_id
}

output "application_insights_connection_string" {
  description = "Application Insights connection string injected into the API."
  value       = azurerm_application_insights.this.connection_string
  sensitive   = true
}

output "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID for the Container Apps environment."
  value       = azurerm_log_analytics_workspace.this.workspace_id
}

output "db_host" {
  description = "Postgres host the API points at (sourced from var.db_host)."
  value       = var.db_host
}
