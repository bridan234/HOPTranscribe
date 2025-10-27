output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "ecs_cluster_name" {
  description = "ECS Cluster name"
  value       = aws_ecs_cluster.main.name
}

output "backend_ecr_repository_url" {
  description = "Backend ECR repository URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_repository_url" {
  description = "Frontend ECR repository URL"
  value       = aws_ecr_repository.frontend.repository_url
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.main.dns_name
}

output "backend_url" {
  description = "Backend API URL"
  value       = "http://${aws_lb.main.dns_name}/api"
}

output "frontend_url" {
  description = "Frontend application URL"
  value       = "http://${aws_lb.main.dns_name}"
}

output "backend_service_name" {
  description = "Backend ECS service name"
  value       = aws_ecs_service.backend.name
}

output "frontend_service_name" {
  description = "Frontend ECS service name"
  value       = aws_ecs_service.frontend.name
}

output "backend_log_group" {
  description = "Backend CloudWatch log group name"
  value       = aws_cloudwatch_log_group.backend.name
}

output "frontend_log_group" {
  description = "Frontend CloudWatch log group name"
  value       = aws_cloudwatch_log_group.frontend.name
}

output "openai_secret_arn" {
  description = "OpenAI API key Secrets Manager ARN"
  value       = aws_secretsmanager_secret.openai_key.arn
  sensitive   = true
}

output "region" {
  description = "AWS region"
  value       = var.region
}
