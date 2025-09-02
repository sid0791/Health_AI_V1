# Step-by-Step API Setup Guide

This guide will walk you through setting up real API keys to replace the demo/mock implementations.

## Prerequisites

You'll need accounts and API keys from:
- OpenAI (https://platform.openai.com)
- Google Cloud Platform (https://console.cloud.google.com)
- AWS (https://console.aws.amazon.com)
- Anthropic (optional - https://console.anthropic.com)

## Step 1: Backend Environment Configuration

### File Location: `/services/backend/.env`

Copy from `.env.example` and update these sections:

```bash
# Copy the example file
cp services/backend/.env.example services/backend/.env
```

### Section A: AI Services (CRITICAL - 5 minutes)

```bash
# OpenAI (Required for meal planning and health insights)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_ORGANIZATION=your-org-id-optional

# Anthropic (Optional alternative)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Google Vertex AI (Optional)
GOOGLE_VERTEX_PROJECT=your-google-cloud-project-id
GOOGLE_APPLICATION_CREDENTIALS_B64=your-service-account-json-base64-encoded
```

**How to get OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)
4. Replace `sk-demo-openai-key-for-development-only` in your `.env`

### Section B: Cloud Storage (10 minutes)

```bash
# AWS S3 for file storage
S3_BUCKET=your-s3-bucket-name
S3_ACCESS_KEY=AKIAEXAMPLEKEY
S3_SECRET_KEY=your-aws-secret-access-key
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com
```

**How to set up AWS S3:**
1. Create AWS account at https://console.aws.amazon.com
2. Create S3 bucket: Services > S3 > Create bucket
3. Create IAM user: Services > IAM > Users > Add user
4. Attach S3 permissions to user
5. Generate access keys for the user

### Section C: OAuth Providers (15 minutes)

```bash
# Google OAuth (for Google Fit integration)
GOOGLE_CLIENT_ID=your-google-oauth-client-id.googleusercontent.com  
GOOGLE_CLIENT_SECRET=your-google-oauth-secret

# Fitbit OAuth
FITBIT_CLIENT_ID=your-fitbit-client-id
FITBIT_CLIENT_SECRET=your-fitbit-client-secret
```

**How to set up Google OAuth:**
1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. Enable Google Fit API
4. Create OAuth 2.0 credentials
5. Add authorized origins/redirect URIs

### Section D: OCR Services (Optional)

```bash
# Google Document AI (for health report OCR)
GOOGLE_DOCUMENTAI_PROJECT=your-project-id
GOOGLE_DOCUMENTAI_PROCESSOR_ID=your-processor-id

# AWS Textract (fallback)
AWS_TEXTRACT_ACCESS_KEY_ID=your-aws-access-key
AWS_TEXTRACT_SECRET_ACCESS_KEY=your-aws-secret
```

## Step 2: Test the Setup

### Quick Test Commands:

```bash
# Test backend with real APIs
cd services/backend
npm run start:dev

# Check logs for successful API connections
# Look for: "✅ OpenAI connection successful"
# Look for: "✅ S3 bucket accessible"
```

### API Endpoint Tests:

```bash
# Test AI meal generation (requires OpenAI key)
curl -X POST http://localhost:8080/api/meal-planning/generate \
  -H "Content-Type: application/json" \
  -d '{"userId": "test", "preferences": {"dietType": "balanced"}}'

# Should return real AI-generated meal plan instead of mock data
```

## Step 3: Environment Variables Quick Reference

| Variable | Required | Service | What It Does |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | **Yes** | AI Meal Planning | Enables real AI meal generation |
| `S3_BUCKET` | **Yes** | File Storage | Stores health reports in cloud |
| `GOOGLE_CLIENT_ID` | No | OAuth | Google Fit data integration |
| `FITBIT_CLIENT_ID` | No | OAuth | Fitbit data integration |
| `GOOGLE_DOCUMENTAI_PROJECT` | No | OCR | Real health report text extraction |

## Step 4: Verification

### Check These Features Work:

1. **AI Meal Planning**: Generate meal plan → Should get real OpenAI response
2. **File Upload**: Upload health report → Should save to real S3 bucket  
3. **Health Data**: Connect Google Fit → Should fetch real fitness data
4. **OCR Processing**: Upload report → Should extract real text

### Success Indicators:

- ✅ No "DEMO_KEY" or "mock" in API responses
- ✅ File uploads save to your S3 bucket
- ✅ AI responses are contextually relevant and varied
- ✅ OAuth flows redirect to real provider login pages

## Troubleshooting

### Common Issues:

**Issue**: "Invalid API key" errors
**Fix**: Check API key format and permissions

**Issue**: S3 upload fails
**Fix**: Verify bucket permissions and AWS credentials

**Issue**: OAuth redirect errors  
**Fix**: Check authorized redirect URIs in OAuth settings

### Rollback Plan:

If something breaks, restore demo mode:
```bash
cp services/backend/.env.example services/backend/.env
```

## Production Deployment

For production deployment, use environment variables instead of `.env` file:

```bash
# Set environment variables in your hosting platform
export OPENAI_API_KEY=sk-your-real-key
export S3_BUCKET=your-production-bucket
# etc...
```

## Cost Estimates

- **OpenAI API**: ~$5-20/month for typical usage
- **AWS S3**: ~$1-5/month for file storage
- **Google APIs**: Usually free tier covers development needs
- **Total**: ~$10-30/month for full production setup

This transforms your demo system into a fully functional production health AI platform!