# n8n Workflow Orchestration Setup

## Overview

This document provides instructions for setting up and configuring n8n for
HealthCoachAI workflow orchestration, including AI routing, quota management,
external integrations, and scheduled jobs.

## Prerequisites

- Docker and Docker Compose installed
- Basic understanding of n8n workflows
- Access to HealthCoachAI backend API
- Environment variables configured

## Quick Start

### 1. Local Development Setup

```bash
# Start n8n with Docker Compose
cd n8n/
docker-compose up -d

# Access n8n UI
open http://localhost:5678
```

### 2. Initial Configuration

1. **Access n8n UI** at `http://localhost:5678`
2. **Create admin account** with secure credentials
3. **Configure environment variables** in the n8n settings
4. **Import base workflows** from the `workflows/` directory

### 3. Environment Variables

Copy the environment template:

```bash
cp .env.example .env
```

Configure the following variables:

```env
# n8n Configuration
N8N_HOST=localhost
N8N_PROTOCOL=http
N8N_PORT=5678
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=secure-password

# HealthCoachAI Backend
HEALTHCOACHAI_API_BASE_URL=http://localhost:8080
HEALTHCOACHAI_API_KEY=your-api-key

# AI Providers
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_VERTEX_PROJECT=your-project-id

# External Services
WEATHER_API_KEY=your-weather-api-key
FITBIT_CLIENT_ID=your-fitbit-client-id
```

## Core Workflows

### 1. AI Routing and Quota Management

**Workflow: `ai-routing-quota-management.json`**

This workflow handles intelligent AI model routing based on user tier, quota
availability, and accuracy requirements.

#### Features:

- **Level 1 Routing**: High-accuracy models for health reports
- **Level 2 Routing**: Cost-optimized models for general chat
- **Quota Management**: Daily step-down quota enforcement
- **Fallback Logic**: Automatic fallback to available models
- **Performance Tracking**: Model response time and accuracy logging

#### Flow:

```
Request → Classify Level → Check Quota → Select Model → DLP Processing → AI Call → Response Processing
```

#### Configuration:

```json
{
  "level1_models": ["gpt-4-turbo", "claude-3-opus", "gemini-pro"],
  "level2_models": ["gpt-3.5-turbo", "claude-3-haiku", "llama-3-70b"],
  "daily_quotas": {
    "level1": [100, 200, 500],
    "level2": [1000, 2000, 5000]
  },
  "accuracy_threshold": 0.05
}
```

### 2. Health Report Processing Pipeline

**Workflow: `health-report-processing.json`**

Automated processing pipeline for health reports including OCR, NER, and
interpretation.

#### Features:

- **OCR Processing**: Extract text from medical reports and lab results
- **Named Entity Recognition**: Identify medical entities and values
- **Data Validation**: Validate extracted data against medical standards
- **Insight Generation**: Generate health insights using Level 1 AI models
- **Notification System**: Alert users about important findings

#### Flow:

```
Upload → OCR → NER → Validation → Insight Generation → Storage → Notification
```

### 3. Scheduled Jobs and Maintenance

**Workflow: `scheduled-jobs.json`**

Handles all scheduled operations including data cleanup, health checks, and
report generation.

#### Jobs:

- **Daily Health Summary**: Generate daily health insights for active users
- **Weekly Progress Reports**: Create weekly progress summaries
- **Data Cleanup**: Remove expired temporary data and optimize storage
- **Health Checks**: Monitor system health and performance metrics
- **Backup Verification**: Verify backup integrity and compliance

#### Schedule:

```json
{
  "daily_summary": "0 8 * * *",
  "weekly_report": "0 9 * * 1",
  "data_cleanup": "0 2 * * *",
  "health_checks": "*/15 * * * *",
  "backup_verification": "0 4 * * *"
}
```

### 4. External Integrations

**Workflow: `external-integrations.json`**

Manages integrations with health platforms, weather services, and fitness
trackers.

#### Integrations:

- **HealthKit/Google Fit**: Sync health and fitness data
- **Weather APIs**: Fetch weather and AQI data for activity recommendations
- **Payment Processing**: Handle subscription and payment webhooks
- **Push Notifications**: Send targeted notifications to users

## Workflow Development

### 1. Workflow Structure

```
workflows/
├── core/
│   ├── ai-routing-quota-management.json
│   ├── health-report-processing.json
│   └── scheduled-jobs.json
├── integrations/
│   ├── healthkit-sync.json
│   ├── weather-integration.json
│   └── payment-webhooks.json
├── utilities/
│   ├── data-validation.json
│   ├── notification-sender.json
│   └── error-handler.json
└── templates/
    ├── webhook-template.json
    └── scheduled-job-template.json
```

### 2. Development Guidelines

#### Naming Conventions

- **Workflows**: `kebab-case` (e.g., `ai-routing-quota-management`)
- **Nodes**: `PascalCase` (e.g., `ClassifyUserRequest`)
- **Variables**: `snake_case` (e.g., `user_tier_level`)

#### Error Handling

- Always include error handling nodes
- Log errors with appropriate detail level
- Implement retry logic for transient failures
- Use dead letter queues for failed messages

#### Security Best Practices

- Store sensitive data in environment variables
- Use webhook authentication for external calls
- Validate all incoming data
- Implement rate limiting for webhook endpoints

### 3. Testing Workflows

#### Unit Testing

```bash
# Test individual nodes
n8n execute --workflow=1 --input='test-data.json'
```

#### Integration Testing

```bash
# Test full workflow execution
curl -X POST http://localhost:5678/webhook/test-ai-routing \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user", "message": "Test message"}'
```

#### Load Testing

```bash
# Use Artillery or similar tool for load testing
artillery run load-test-config.yml
```

## Security Configuration

### 1. Authentication Setup

#### Basic Authentication

```env
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=secure-password
```

#### JWT Authentication (Production)

```env
N8N_JWT_AUTH_ACTIVE=true
N8N_JWT_AUTH_HEADER=authorization
N8N_JWT_AUTH_HEADER_VALUE_PREFIX=Bearer
N8N_JWKS_URI=https://your-auth-provider.com/.well-known/jwks.json
```

### 2. Webhook Security

#### HMAC Signature Validation

```javascript
// In webhook node
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(JSON.stringify($binary.data))
  .digest('hex');

if (signature !== $headers['x-signature']) {
  throw new Error('Invalid webhook signature');
}
```

#### IP Whitelisting

```json
{
  "allowed_ips": ["192.168.1.0/24", "10.0.0.0/8", "172.16.0.0/12"]
}
```

### 3. Data Protection

#### Sensitive Data Handling

- Never log sensitive data (PII, PHI, API keys)
- Use secure variables for credentials
- Implement data masking for debug logs
- Encrypt sensitive data at rest

#### GDPR Compliance

- Implement data retention policies
- Provide data export capabilities
- Support data deletion requests
- Maintain audit trails

## Monitoring and Observability

### 1. Workflow Monitoring

#### Health Checks

```json
{
  "workflow_health": {
    "check_interval": "5m",
    "success_threshold": 0.95,
    "response_time_threshold": "30s"
  }
}
```

#### Performance Metrics

- Workflow execution time
- Success/failure rates
- Resource utilization
- Queue depth and processing time

### 2. Alerting

#### Alert Rules

```yaml
alerts:
  - name: workflow_failure_rate
    condition: failure_rate > 0.1
    severity: warning

  - name: workflow_execution_time
    condition: avg_execution_time > 60s
    severity: warning

  - name: webhook_endpoint_down
    condition: endpoint_status != 200
    severity: critical
```

#### Notification Channels

- Slack integration for team notifications
- Email alerts for critical issues
- PagerDuty for on-call escalation
- Webhook notifications to monitoring systems

### 3. Logging and Debugging

#### Log Levels

```javascript
// In workflow nodes
console.log('INFO: Processing user request');
console.warn('WARN: Quota limit approaching');
console.error('ERROR: AI provider unavailable');
```

#### Debug Mode

```env
N8N_LOG_LEVEL=debug
N8N_LOG_OUTPUT=console,file
N8N_LOG_FILE_LOCATION=/var/log/n8n/
```

## Deployment

### 1. Development Deployment

```bash
# Using Docker Compose
docker-compose up -d

# Import workflows
./scripts/import-workflows.sh
```

### 2. Production Deployment

#### Using Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: n8n
spec:
  replicas: 2
  selector:
    matchLabels:
      app: n8n
  template:
    metadata:
      labels:
        app: n8n
    spec:
      containers:
        - name: n8n
          image: n8nio/n8n:latest
          ports:
            - containerPort: 5678
          env:
            - name: DB_TYPE
              value: 'postgresdb'
            - name: DB_POSTGRESDB_HOST
              value: 'postgres-service'
            - name: DB_POSTGRESDB_DATABASE
              value: 'n8n'
            - name: N8N_BASIC_AUTH_ACTIVE
              value: 'true'
          volumeMounts:
            - name: n8n-data
              mountPath: /home/node/.n8n
```

#### Environment-Specific Configuration

```bash
# Staging
kubectl apply -f k8s/staging/
kubectl create secret generic n8n-secrets \
  --from-env-file=.env.staging

# Production
kubectl apply -f k8s/production/
kubectl create secret generic n8n-secrets \
  --from-env-file=.env.production
```

### 3. CI/CD Integration

#### Workflow Testing Pipeline

```yaml
# .github/workflows/n8n-test.yml
name: Test n8n Workflows
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Start n8n
        run: docker-compose up -d
      - name: Import workflows
        run: ./scripts/import-workflows.sh
      - name: Run tests
        run: ./scripts/test-workflows.sh
```

#### Deployment Pipeline

```yaml
# .github/workflows/n8n-deploy.yml
name: Deploy n8n Workflows
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to staging
        run: ./scripts/deploy-staging.sh
      - name: Run integration tests
        run: ./scripts/integration-tests.sh
      - name: Deploy to production
        if: success()
        run: ./scripts/deploy-production.sh
```

## Troubleshooting

### 1. Common Issues

#### Workflow Execution Failures

```bash
# Check workflow logs
docker logs n8n_n8n_1

# Check database connectivity
docker exec -it n8n_n8n_1 n8n health
```

#### Performance Issues

```bash
# Monitor resource usage
docker stats n8n_n8n_1

# Check workflow execution times
curl -X GET http://localhost:5678/api/v1/executions
```

#### Integration Failures

```bash
# Test external API connectivity
curl -X GET "https://api.openai.com/v1/models" \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Validate webhook endpoints
curl -X POST http://localhost:5678/webhook/health-check
```

### 2. Debugging Techniques

#### Workflow Debugging

- Use "Sticky" nodes to pause execution
- Add logging nodes to trace data flow
- Use the "Execute Workflow" feature for testing
- Check webhook delivery logs

#### Data Validation

- Validate JSON schemas in webhook nodes
- Use expression nodes to check data types
- Implement data sanitization steps
- Log data at key transformation points

### 3. Support Resources

#### Documentation

- [n8n Official Documentation](https://docs.n8n.io/)
- [HealthCoachAI Workflow Patterns](./workflow-patterns.md)
- [API Integration Guide](./api-integration.md)

#### Community Support

- n8n Community Forum
- HealthCoachAI Internal Slack
- GitHub Issues for workflow templates

This n8n setup provides a robust foundation for workflow orchestration in the
HealthCoachAI application, enabling scalable AI routing, automated health
processing, and seamless external integrations.
