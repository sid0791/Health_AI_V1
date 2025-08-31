# HealthCoachAI Infrastructure

This directory contains Infrastructure-as-Code (IaC) templates for deploying HealthCoachAI across multiple cloud providers.

## Directory Structure

```
infra/
├── terraform/
│   ├── aws/                    # AWS deployment templates
│   ├── gcp/                    # Google Cloud Platform templates
│   └── azure/                  # Azure deployment templates
├── docker/                     # Docker configurations
├── kubernetes/                 # Kubernetes manifests
└── scripts/                    # Deployment and utility scripts
```

## Quick Start

### Prerequisites

- Terraform >= 1.6.0
- Cloud provider CLI tools (AWS CLI, gcloud, az CLI)
- Docker >= 24.0
- kubectl >= 1.28

### AWS Deployment

```bash
cd terraform/aws
terraform init
terraform plan -var-file="environments/production.tfvars"
terraform apply -var-file="environments/production.tfvars"
```

### Google Cloud Deployment

```bash
cd terraform/gcp
terraform init
terraform plan -var-file="environments/production.tfvars"
terraform apply -var-file="environments/production.tfvars"
```

## Environment Configuration

Each environment (development, staging, production) has its own variable file:

- `environments/development.tfvars`
- `environments/staging.tfvars`
- `environments/production.tfvars`

## Security Considerations

- All sensitive data is managed through cloud provider secret managers
- Network security groups follow least-privilege principles
- Data encryption at rest and in transit
- Regular security scanning and updates
- HIPAA compliance configurations included

## Monitoring and Logging

- Application logs centralized via CloudWatch/Stackdriver/Monitor
- Infrastructure metrics and alerting
- Health checks and automated scaling
- Performance monitoring and APM integration

## Cost Optimization

- Auto-scaling configurations
- Reserved instances for predictable workloads
- Spot instances for batch processing
- Storage lifecycle policies
- Regular cost analysis and optimization

## Disaster Recovery

- Multi-region deployment options
- Automated backups and point-in-time recovery
- Database replication and failover
- Infrastructure as code ensures consistent rebuilds

## Usage Examples

### Development Environment
```bash
# Deploy minimal development environment
terraform apply -var-file="environments/development.tfvars" -target=module.development
```

### Production Deployment
```bash
# Deploy full production environment with high availability
terraform apply -var-file="environments/production.tfvars"
```

### Blue-Green Deployment
```bash
# Deploy to staging slot for zero-downtime updates
terraform apply -var="deployment_slot=staging"
./scripts/blue-green-deploy.sh
```

## Maintenance

### Regular Updates
- Terraform state management
- Provider version updates
- Security patch deployment
- Performance optimization

### Backup Procedures
- Database backups
- Configuration backups
- Infrastructure state backups
- Disaster recovery testing