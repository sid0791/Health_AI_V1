# VPC
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

# Subnets
output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

# Load Balancer
output "load_balancer_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.alb.dns_name
}

output "load_balancer_zone_id" {
  description = "Zone ID of the load balancer"
  value       = module.alb.zone_id
}

output "load_balancer_arn" {
  description = "ARN of the load balancer"
  value       = module.alb.arn
}

# ECS Cluster
output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = module.ecs.cluster_id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = module.ecs.service_name
}

# Database
output "db_endpoint" {
  description = "RDS instance endpoint"
  value       = module.database.endpoint
  sensitive   = true
}

output "db_port" {
  description = "RDS instance port"
  value       = module.database.port
}

output "db_instance_id" {
  description = "RDS instance ID"
  value       = module.database.instance_id
}

# Redis
output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.redis.endpoint
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = module.redis.port
}

# S3 Buckets
output "app_bucket_name" {
  description = "Name of the application S3 bucket"
  value       = module.s3.app_bucket_name
}

output "backup_bucket_name" {
  description = "Name of the backup S3 bucket"
  value       = module.s3.backup_bucket_name
}

output "logs_bucket_name" {
  description = "Name of the logs S3 bucket"
  value       = module.s3.logs_bucket_name
}

# CloudWatch
output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = module.monitoring.log_group_name
}

# Secrets Manager
output "db_password_secret_arn" {
  description = "ARN of the database password secret"
  value       = aws_secretsmanager_secret.db_password.arn
  sensitive   = true
}

# Security Groups
output "app_security_group_id" {
  description = "ID of the application security group"
  value       = module.security.app_security_group_id
}

output "db_security_group_id" {
  description = "ID of the database security group"
  value       = module.security.db_security_group_id
}

output "redis_security_group_id" {
  description = "ID of the Redis security group"
  value       = module.security.redis_security_group_id
}

# Application URL
output "application_url" {
  description = "URL of the application"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "http://${module.alb.dns_name}"
}

# CloudFront (if enabled)
output "cloudfront_domain_name" {
  description = "Domain name of CloudFront distribution"
  value       = var.enable_cloudfront ? module.cloudfront[0].domain_name : null
}

# Environment Information
output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
}

output "account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

# Cost Estimation
output "estimated_monthly_cost" {
  description = "Estimated monthly cost in USD"
  value = {
    ecs_tasks     = var.ecs_desired_count * 30 * 24 * 0.04  # Rough estimate
    rds_instance  = var.db_instance_class == "db.t3.medium" ? 50 : 100
    elasticache   = var.redis_node_type == "cache.t3.medium" ? 40 : 80
    load_balancer = 20
    nat_gateway   = var.enable_nat_gateway ? 45 : 0
    s3_storage    = 10  # Estimate
    cloudwatch    = 5
    total         = "~$170-300/month (varies by usage)"
  }
}

# Health Check
output "health_check_url" {
  description = "Health check URL"
  value       = "${var.domain_name != "" ? "https://${var.domain_name}" : "http://${module.alb.dns_name}"}${var.health_check_path}"
}