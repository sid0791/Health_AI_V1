# AI Router Integration Test Script

This script tests the integration between the AI routing service and n8n workflows.

## Prerequisites

1. n8n instance running with workflows imported
2. Backend service running
3. Environment variables configured

## Test Scenarios

### 1. Daily Quota Reset
```bash
# Trigger quota reset workflow
curl -X POST http://localhost:5678/webhook/ai-quota-reset \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 2. Provider Failover
```bash
# Trigger provider failover
curl -X POST http://localhost:5678/webhook/ai-provider-failover \
  -H "Content-Type: application/json" \
  -H "X-N8N-Signature: sha256=calculated_signature" \
  -d '{
    "provider": "openai",
    "reason": "API rate limit exceeded",
    "timestamp": "2024-08-30T19:40:00Z"
  }'
```

### 3. AI Routing Request
```bash
# Test AI routing with DLP
curl -X POST http://localhost:8080/ai-routing/route \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "requestType": "health_report_analysis",
    "content": "Patient John Doe (john.doe@email.com, phone: +91-9876543210) has elevated blood pressure 140/90 mmHg and requires medication adjustment.",
    "contextTokens": 1000,
    "maxResponseTokens": 500,
    "sessionId": "test-session-123"
  }'
```

### 4. Webhook Routing
```bash
# Test n8n webhook routing
curl -X POST http://localhost:8080/webhooks/ai-routing/route \
  -H "Content-Type: application/json" \
  -H "X-N8N-Signature: sha256=calculated_signature" \
  -d '{
    "requestType": "nutrition_advice",
    "content": "I need help with a diet plan for diabetes management",
    "userId": "test-user-456",
    "contextTokens": 500,
    "maxResponseTokens": 1000
  }'
```

### 5. Analytics Dashboard
```bash
# Get routing analytics
curl -X GET "http://localhost:8080/ai-routing/analytics?startDate=2024-08-01&endDate=2024-08-30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Expected Results

1. **Quota Reset**: Should return `{"success": true}` and trigger Slack notifications
2. **Provider Failover**: Should activate alternative providers and send alerts
3. **AI Routing**: Should return routing decision with DLP-processed content
4. **Webhook Routing**: Should process request and return structured response
5. **Analytics**: Should return comprehensive routing metrics and cost data

## Monitoring

Monitor the following during tests:

- n8n workflow execution logs
- Backend service logs for routing decisions
- DLP processing results and risk scores
- Cache hit/miss rates
- Provider availability and failover triggers
- Cost tracking and quota usage

## Validation Checklist

- [ ] All Phase 10 components are functional
- [ ] DLP integration processes sensitive data correctly
- [ ] Step-down quota logic works as expected
- [ ] n8n workflows execute without errors
- [ ] Webhook signatures are validated properly
- [ ] Cost optimization selects appropriate models
- [ ] Failover mechanisms activate correctly
- [ ] Analytics provide comprehensive insights
- [ ] No hardcoded secrets are present
- [ ] All GitHub security checks pass