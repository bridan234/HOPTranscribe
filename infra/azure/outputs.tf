output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "acr_login_server" {
  description = "ACR login server URL"
  value       = azurerm_container_registry.acr.login_server
}

output "acr_admin_username" {
  description = "ACR admin username"
  value       = azurerm_container_registry.acr.admin_username
  sensitive   = true
}

output "acr_admin_password" {
  description = "ACR admin password"
  value       = azurerm_container_registry.acr.admin_password
  sensitive   = true
}

output "backend_url" {
  description = "Backend application URL"
  value       = "https://${azurerm_container_app.backend.ingress[0].fqdn}"
}

output "frontend_url" {
  description = "Frontend application URL"
  value       = "https://${azurerm_container_app.frontend.ingress[0].fqdn}"
}

output "backend_fqdn" {
  description = "Backend FQDN"
  value       = azurerm_container_app.backend.ingress[0].fqdn
}

output "frontend_fqdn" {
  description = "Frontend FQDN"
  value       = azurerm_container_app.frontend.ingress[0].fqdn
}

output "container_app_environment_id" {
  description = "Container Apps Environment ID"
  value       = azurerm_container_app_environment.env.id
}

output "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID"
  value       = azurerm_log_analytics_workspace.logs.id
}
