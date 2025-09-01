# Production AI API Integration Guide

This document provides instructions for integrating real AI APIs with the HealthCoach AI system.

## Current Implementation Status

The system is designed with intelligent fallbacks:
- **Development Mode**: Uses enhanced mock responses for reliable development
- **Production Mode**: Attempts real API calls, falls back to mock if APIs unavailable
- **Gradual Migration**: Can mix real and mock responses based on API availability

## API Integration Steps

### 1. OpenAI Integration

```bash
# Set environment variables
export OPENAI_API_KEY="sk-your-actual-openai-key-here"
export NODE_ENV="production"
```

The `EnhancedAIProviderService` will automatically:
- Detect valid API keys (not demo keys)
- Make real API calls in production mode
- Track costs and usage
- Fall back to mock responses on failure

### 2. Google Gemini Integration

```bash
export GOOGLE_AI_API_KEY="AIzaSy-your-actual-gemini-key-here"
```

### 3. Anthropic Claude Integration

```bash
export ANTHROPIC_API_KEY="sk-ant-your-actual-claude-key-here"
```

## Implementation Details

### AI Provider Service (`enhanced-ai-provider.service.ts`)

```typescript
// Real API call example
private async callOpenAI(model: string, prompt: string): Promise<any> {
  const response = await this.openaiClient.chat.completions.create({
    model: model || 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are HealthCoach AI, a nutrition and wellness expert.'
      },
      {
        role: 'user', 
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1500
  });

  return {
    content: response.choices[0].message.content,
    confidence: 0.95,
    usage: response.usage,
    model: response.model,
    cost: this.calculateOpenAICost(response.usage, response.model)
  };
}
```

### Fallback Strategy

1. **Primary**: Real API call (if keys configured)
2. **Secondary**: Try fallback providers 
3. **Tertiary**: Enhanced mock response

### Cost Tracking

The system automatically tracks:
- Token usage per request
- Cost per API call
- Provider performance metrics
- Fallback frequency

## Testing Real APIs

### 1. Health Check Endpoint

```bash
curl -X GET "https://api.healthcoachai.com/api/ai/health"
```

Expected response:
```json
{
  "providers": {
    "openai": true,
    "gemini": true, 
    "anthropic": false
  },
  "status": "healthy"
}
```

### 2. Test Meal Planning

```bash
curl -X POST "https://api.healthcoachai.com/api/meal-planning/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "userProfile": {
      "age": 30,
      "gender": "female", 
      "weight": 65,
      "height": 165,
      "goals": ["weight_loss"],
      "dietaryPreferences": ["vegetarian"]
    },
    "planPreferences": {
      "duration": 7,
      "targetCalories": 1800
    }
  }'
```

## Monitoring and Metrics

### Provider Health Monitoring

The system includes automatic health checks:

```typescript
async checkProviderHealth(): Promise<Record<string, boolean>> {
  const health = {
    openai: false,
    gemini: false, 
    anthropic: false
  };

  // Test each provider with minimal requests
  // Returns true/false for each provider
  return health;
}
```

### Cost Optimization

- Automatic provider selection based on cost and performance
- Request caching to reduce API calls
- Intelligent fallbacks to prevent service disruption

## Security Considerations

1. **API Key Management**
   - Never commit API keys to version control
   - Use environment variables or secure vaults
   - Rotate keys regularly

2. **Rate Limiting**
   - Implement client-side rate limiting
   - Monitor usage to prevent overages
   - Set up alerts for unusual usage patterns

3. **Error Handling**
   - Never expose API errors to end users
   - Log errors securely for debugging
   - Maintain service availability with fallbacks

## Production Checklist

- [ ] Set production API keys
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerts
- [ ] Test fallback scenarios
- [ ] Verify cost tracking
- [ ] Enable production logging
- [ ] Configure backup providers

## Gradual Rollout Strategy

1. **Phase 1**: Deploy with mock responses (current state)
2. **Phase 2**: Enable real APIs for internal testing
3. **Phase 3**: Gradual rollout to percentage of users
4. **Phase 4**: Full production with real APIs

This approach ensures zero downtime and allows for safe testing of real API integration.