# 🚀 FREE AI APIs SETUP GUIDE

## Quick Setup (5 minutes)

The Health AI system now supports **FREE production AI APIs** instead of mock responses! Follow these steps to activate real AI for testing:

### 🆓 Recommended Free APIs (Pick 1-2 to start)

1. **🤖 Google Gemini** (Best overall - FREE tier)
   - **Get API Key**: https://makersuite.google.com/app/apikey
   - **Free Quota**: 60 requests/minute
   - **Models**: gemini-pro, gemini-pro-vision

2. **⚡ Groq** (Fastest - FREE with limits)
   - **Get API Key**: https://console.groq.com/keys
   - **Speed**: Ultra-fast inference
   - **Models**: llama-3.1-8b-instant, mixtral-8x7b-32768

3. **🔓 Together AI** (Open Source - $1-3/1M tokens)
   - **Get API Key**: https://api.together.xyz/settings/api-keys
   - **Models**: Meta-Llama, Mixtral, Qwen
   - **Cost**: Very affordable

## 📝 Step-by-Step Setup

### Step 1: Get Your Free API Keys

Choose **one or more** providers from above and sign up for free API keys.

### Step 2: Configure Your .env File

```bash
# Navigate to backend directory
cd services/backend

# Copy the template (already done)
# cp .env.example .env

# Edit .env file and replace these placeholders:
```

**For Google Gemini:**
```bash
GOOGLE_AI_API_KEY=AIzaSy_your_actual_gemini_key_here
```

**For Groq:**
```bash
GROQ_API_KEY=gsk_your_actual_groq_key_here
```

**For Together AI:**
```bash
TOGETHER_API_KEY=your_actual_together_key_here
```

### Step 3: Test Your APIs

```bash
# Run the test script to verify your APIs work
node test-free-apis.js
```

You should see:
```
🚀 TESTING FREE AI APIs FOR HEALTH AI
=====================================

🧪 Testing Google Gemini API...
✅ Google Gemini: SUCCESS
📝 Response length: 245 characters
💰 Estimated cost: FREE (within quota)

📊 SUMMARY:
===========
✅ Working APIs: 1/5
❌ Failed APIs: 4/5

🎉 SUCCESS! You have working free AI APIs configured.
```

### Step 4: Start the Backend

```bash
cd services/backend
npm run start:dev
```

### Step 5: Test in Frontend

1. Start the frontend application
2. Go through the onboarding flow
3. Generate a meal plan - you'll now see real AI responses!

## 🔧 Troubleshooting

### "API key not configured" Error
- Make sure you replaced `YOUR_X_API_KEY_HERE` with your actual key
- No spaces or quotes around the key in .env
- Restart the backend after changing .env

### "Rate limit exceeded" Error
- You've hit the free tier limits
- Wait a few minutes and try again
- Consider getting API keys from multiple providers

### "Model not found" Error
- Some models may not be available in free tiers
- The system will automatically fall back to available models

## 💰 Cost Monitoring

### Free Tiers & Limits:
- **Google Gemini**: 60 requests/minute (FREE)
- **Groq**: Free tier with rate limits
- **Together AI**: $1-3 per 1M tokens
- **Hugging Face**: FREE inference API
- **Cohere**: Trial credits included

### Typical Usage Costs:
- **Meal Plan Generation**: ~2,000 tokens = $0.004-0.006
- **Recipe Creation**: ~1,000 tokens = $0.002-0.003
- **100 meal plans**: ~$0.40-0.60

## 🎯 What's Activated

✅ **Real AI meal planning** instead of mock responses
✅ **Smart routing** to cheapest available provider
✅ **Automatic fallbacks** if APIs fail
✅ **Cost optimization** with Level 1/Level 2 tiers
✅ **Usage tracking** and monitoring
✅ **Enhanced error handling** with graceful degradation

## 🔄 Upgrading Later

When ready for production scale:
1. Add OpenAI/Anthropic keys to .env
2. Increase API quotas/billing limits
3. No code changes needed!

The system automatically detects and uses the best available provider.

## 🆘 Support

- Test script: `node test-free-apis.js`
- Backend logs: Check console for AI provider status
- Frontend: Look for "real AI" indicators in meal plans

**🎉 Enjoy your production-ready AI-powered Health Coach!**