# VPC Module - Networking Infrastructure
module "vpc" {
  source = "./modules/vpc"

  project_name         = var.project_name
  environment         = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  enable_nat_gateway = var.enable_nat_gateway
  enable_flow_logs   = var.enable_flow_logs

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# Security Groups Module
module "security" {
  source = "./modules/security"

  project_name        = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  app_port           = var.app_port
  allowed_cidr_blocks = var.allowed_cidr_blocks

  depends_on = [module.vpc]
}

# Application Load Balancer Module
module "alb" {
  source = "./modules/alb"

  project_name            = var.project_name
  environment            = var.environment
  vpc_id                 = module.vpc.vpc_id
  public_subnet_ids      = module.vpc.public_subnet_ids
  security_group_ids     = [module.security.alb_security_group_id]
  certificate_arn        = var.certificate_arn
  enable_waf            = var.enable_waf
  health_check_path     = var.health_check_path

  depends_on = [module.vpc, module.security]
}

# ECS Cluster and Service Module
module "ecs" {
  source = "./modules/ecs"

  project_name               = var.project_name
  environment               = var.environment
  vpc_id                    = module.vpc.vpc_id
  private_subnet_ids        = module.vpc.private_subnet_ids
  security_group_ids        = [module.security.app_security_group_id]
  target_group_arn          = module.alb.target_group_arn
  
  task_cpu                  = var.ecs_task_cpu
  task_memory              = var.ecs_task_memory
  desired_count            = var.ecs_desired_count
  min_capacity             = var.ecs_min_capacity
  max_capacity             = var.ecs_max_capacity
  
  target_cpu_utilization   = var.target_cpu_utilization
  target_memory_utilization = var.target_memory_utilization
  
  app_port                 = var.app_port
  log_group_name           = module.monitoring.log_group_name
  
  # Environment variables for the container
  environment_variables = [
    {
      name  = "NODE_ENV"
      value = var.environment
    },
    {
      name  = "DATABASE_URL"
      value = "postgresql://healthcoachai:${random_password.db_password.result}@${module.database.endpoint}:${module.database.port}/healthcoachai"
    },
    {
      name  = "REDIS_URL"
      value = "redis://${module.redis.endpoint}:${module.redis.port}"
    }
  ]

  depends_on = [module.vpc, module.security, module.alb, module.database, module.redis, module.monitoring]
}

# RDS Database Module
module "database" {
  source = "./modules/database"

  project_name              = var.project_name
  environment              = var.environment
  vpc_id                   = module.vpc.vpc_id
  private_subnet_ids       = module.vpc.private_subnet_ids
  security_group_ids       = [module.security.db_security_group_id]
  
  instance_class           = var.db_instance_class
  allocated_storage        = var.db_allocated_storage
  max_allocated_storage    = var.db_max_allocated_storage
  backup_retention_period  = var.db_backup_retention_period
  
  master_password          = random_password.db_password.result
  enable_encryption        = var.enable_encryption

  depends_on = [module.vpc, module.security]
}

# ElastiCache Redis Module
module "redis" {
  source = "./modules/redis"

  project_name       = var.project_name
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_ids = [module.security.redis_security_group_id]
  
  node_type         = var.redis_node_type
  num_cache_nodes   = var.redis_num_cache_nodes
  enable_encryption = var.enable_encryption

  depends_on = [module.vpc, module.security]
}

# S3 Buckets Module
module "s3" {
  source = "./modules/s3"

  project_name          = var.project_name
  environment          = var.environment
  versioning_enabled   = var.s3_versioning_enabled
  lifecycle_enabled    = var.s3_lifecycle_enabled
  enable_encryption    = var.enable_encryption

  # Bucket purposes
  create_app_bucket    = true
  create_backup_bucket = true
  create_logs_bucket   = true
}

# CloudWatch Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"

  project_name              = var.project_name
  environment              = var.environment
  log_retention_days       = var.log_retention_days
  enable_detailed_monitoring = var.enable_detailed_monitoring
  
  # Resources to monitor
  ecs_cluster_name = module.ecs.cluster_name
  ecs_service_name = module.ecs.service_name
  db_instance_id   = module.database.instance_id
  alb_arn_suffix   = module.alb.arn_suffix

  depends_on = [module.ecs, module.database, module.alb]
}

# AWS Backup Module
module "backup" {
  source = "./modules/backup"

  project_name           = var.project_name
  environment           = var.environment
  backup_retention_period = var.backup_retention_period
  backup_schedule        = var.backup_schedule
  
  # Resources to backup
  db_instance_arn = module.database.instance_arn
  s3_bucket_arns  = [
    module.s3.app_bucket_arn,
    module.s3.backup_bucket_arn
  ]

  depends_on = [module.database, module.s3]
}

# CloudFront CDN Module (Optional)
module "cloudfront" {
  source = "./modules/cloudfront"
  count  = var.enable_cloudfront ? 1 : 0

  project_name         = var.project_name
  environment         = var.environment
  origin_domain_name   = module.alb.dns_name
  certificate_arn      = var.certificate_arn
  s3_logs_bucket       = module.s3.logs_bucket_name

  depends_on = [module.alb, module.s3]
}

# WAF Module (Optional)
module "waf" {
  source = "./modules/waf"
  count  = var.enable_waf ? 1 : 0

  project_name    = var.project_name
  environment    = var.environment
  alb_arn        = module.alb.arn
  
  # WAF rules
  enable_rate_limiting     = true
  enable_geo_blocking     = true
  enable_sql_injection    = true
  enable_xss_protection   = true

  depends_on = [module.alb]
}