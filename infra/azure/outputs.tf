output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
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

output "application_insights_name" {
  description = "Application Insights resource name"
  value       = azurerm_application_insights.insights.name
}

output "application_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.insights.instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.insights.connection_string
  sensitive   = true
}

output "application_insights_app_id" {
  description = "Application Insights app ID"
  value       = azurerm_application_insights.insights.app_id
}

output "storage_account_name" {
  description = "Storage account name for sessions"
  value       = azurerm_storage_account.sessions.name
}

output "sessions_file_share_name" {
  description = "File share name for sessions database"
  value       = azurerm_storage_share.sessions_db.name
}

output "storage_account_primary_key" {
  description = "Storage account primary access key"
  value       = azurerm_storage_account.sessions.primary_access_key
  sensitive   = true
}
