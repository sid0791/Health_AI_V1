# Level 1/Level 2 AI Routing Test Examples

This document demonstrates how the implemented system works with real examples.

## Example 1: Level 1 Query (Health Report Analysis)

**User Query**: "What micronutrients am I lacking according to my health report?"

**System Behavior**:
1. **Routing Decision**: Query contains "micronutrients" and "health report" → Level 1 AI
2. **Rate Limit Check**: Validates user hasn't exceeded 3/min, 15/hr, 50/day limits
3. **Cache Check**: First time → Cache miss, proceed to AI call
4. **AI Processing**: High-accuracy analysis using GPT-4/Claude ($0.025 cost)
5. **Response Storage**: Structured health insights cached for future reuse
6. **Rate Limit Recording**: Request counted toward user's Level 1 limits

**First Response** (AI Generated):
```
Based on your health report analysis:

**Vitamin D Deficiency**
Your vitamin D levels are significantly low at 15 ng/mL, below the normal range of 30-100 ng/mL.

💡 **Recommendation:** Increase sun exposure, consume vitamin D rich foods like fatty fish, and consider supplementation. Expected improvement within 45 days.
```

**Cost**: $0.025

---

**Same User Query 1 Hour Later**: "What micronutrients am I lacking?"

**System Behavior**:
1. **Routing Decision**: Level 1 AI routing
2. **Rate Limit Check**: Within limits (user has made 1/3 requests this minute)
3. **Cache Check**: Cache hit! Matching insight found
4. **Instant Response**: Returns cached analysis with zero AI cost

**Cached Response** (Instant):
```
According to your health report, Your vitamin D levels are significantly low at 15 ng/mL, below the normal range of 30-100 ng/mL.

To address this: Increase sun exposure, consume vitamin D rich foods like fatty fish, and consider supplementation. Expected improvement within 45 days.
```

**Cost**: $0.00 (80%+ savings achieved!)

---

## Example 2: Level 2 Query (Diet Planning)

**User Query**: "Can you create a diet plan to help with my vitamin D deficiency?"

**System Behavior**:
1. **Routing Decision**: Query about "diet plan" → Level 2 AI (cost-optimized)
2. **No Rate Limiting**: Level 2 queries use standard rate limits
3. **Health Context**: Uses cached Level 1 insights instead of re-analyzing health report
4. **AI Processing**: Cost-optimized model like DeepSeek ($0.005 cost)
5. **Timeline Planning**: Creates 45-day correction phase plan

**Response**:
```json
{
  "success": true,
  "data": {
    "dietPlan": {
      "id": "plan_123",
      "title": "Correction Plan for Vitamin D Deficiency",
      "phase": "correction",
      "timeline": {
        "totalDurationDays": 45,
        "milestones": [
          {
            "day": 15,
            "title": "First Quarter Check", 
            "description": "Initial improvements in energy expected"
          },
          {
            "day": 30,
            "title": "Mid-Point Assessment",
            "description": "Measurable improvements in vitamin D levels"  
          },
          {
            "day": 45,
            "title": "Plan Completion",
            "description": "Target improvements achieved, ready for next phase"
          }
        ]
      }
    },
    "costSavings": {
      "usesCachedInsights": true,
      "estimatedSavings": 0.025,
      "healthInsightsUsed": 1
    }
  },
  "message": "Diet plan generated using cached health insights - significant cost savings achieved!"
}
```

**Cost**: $0.005 (75% savings vs re-analyzing health report)

---

## Example 3: Timeline Transition (After 45 Days)

**System Behavior**:
1. **Automatic Detection**: System detects 45 days have passed since plan creation
2. **Transition Notification**: User receives notification about phase transition
3. **User Choice**: System asks user to choose next step

**Transition API Call**:
```
POST /chat/diet-plan/plan_123/transition
{
  "userChoice": "maintain"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "previousPlan": {
      "phase": "correction",
      "status": "transitioned"
    },
    "newPlan": {
      "id": "plan_124",
      "title": "Maintenance Plan for Vitamin D",
      "phase": "maintenance", 
      "timeline": {
        "totalDurationDays": 60,
        "nextTransitionCheck": "2024-03-15T10:00:00Z"
      }
    },
    "transition": {
      "from": "correction",
      "to": "maintenance",
      "reason": "User chose to transition to maintenance phase to preserve gains",
      "userChoice": "maintain"
    }
  },
  "message": "Successfully transitioned from correction to maintenance phase"
}
```

---

## Example 4: Rate Limiting in Action

**User makes 4 Level 1 queries in 1 minute**:

**Requests 1-3**: ✅ Allowed (within 3/min limit)
**Request 4**: ❌ Blocked with detailed error:

```json
{
  "statusCode": 400,
  "message": "Level 1 API rate limit exceeded. Please wait 47 seconds before your next health analysis request. Level 1 APIs are rate-limited to ensure high-quality health analysis while managing costs.",
  "error": "Bad Request",
  "rateLimitInfo": {
    "remaining": 0,
    "resetTime": 1705472847000,
    "blocked": true
  },
  "nextAllowedRequest": "2024-01-17T10:30:47.000Z",
  "waitTimeSeconds": 47,
  "rateLimitType": "level_1_health_analysis"
}
```

---

## Cost Savings Summary

| Scenario | Traditional Cost | With Caching | Savings |
|----------|------------------|--------------|---------|
| First health query | $0.025 | $0.025 | 0% |
| Repeat health query | $0.025 | $0.000 | 100% |
| Diet plan (with health context) | $0.050 | $0.005 | 90% |
| 10 similar health queries | $0.250 | $0.025 | 90% |
| **Average savings** | | | **80%+** |

## System Intelligence Examples

### Smart Query Matching
- "What vitamins am I lacking?" → Matches cached "Vitamin D Deficiency" insight
- "Tell me about my vitamin D levels" → Same cached insight, different phrasing
- "My health report summary" → Returns comprehensive cached health analysis

### Timeline Intelligence
- Day 1-15: Focus on vitamin D rich foods
- Day 16-30: Monitor energy levels improvement
- Day 31-45: Prepare for maintenance phase
- Day 45+: Automatic transition prompt with user choice

### Phase Progression Logic
```
Correction (30-45 days) → Maintenance (60-90 days) → Optimization (90+ days) → Balanced (ongoing)
                       ↘ User Choice ↙
                    Continue Focus | Schedule Recheck | Go Balanced
```

This implementation creates an intelligent health coaching system that learns from user data, provides instant responses through caching, and guides users through structured improvement timelines with significant cost optimization.