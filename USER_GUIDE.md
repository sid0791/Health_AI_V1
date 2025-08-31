# HealthCoachAI - User Installation & Development Guide

Welcome to HealthCoachAI - a comprehensive, AI-powered health, diet, and fitness
application. This guide will help you install, configure, and run the
application locally for development and testing.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Demo/Placeholder APIs](#demo-placeholder-apis)
6. [Running the Application](#running-the-application)
7. [Mobile App Development](#mobile-app-development)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Production Deployment](#production-deployment)

## Prerequisites

### Required Software

- **Node.js** (v20.0.0 or higher)
- **pnpm** (v8.0.0 or higher) - Package manager
- **PostgreSQL** (v14 or higher)
- **Redis** (v6 or higher)
- **Docker** (optional, for containers)

### Mobile Development (Optional)

- **Xcode** (v15+) - For iOS development
- **Android Studio** (v2023.3+) - For Android development
- **iOS Simulator** or **Android Emulator**

### Tools

- **Git** (v2.40+)
- **Turbo** (installed via pnpm)
- **n8n** (for workflow orchestration)

## System Requirements

### Minimum Hardware

- **RAM**: 8GB (16GB recommended)
- **Storage**: 10GB free space
- **CPU**: 4 cores (8 cores recommended)

### Operating Systems

- **macOS**: 12.0+ (for iOS development)
- **Windows**: 10/11 with WSL2
- **Linux**: Ubuntu 20.04+ or equivalent

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/coronis/Health_AI_V1.git
cd Health_AI_V1
```

### 2. Install Dependencies

```bash
# Install pnpm globally if not already installed
npm install -g pnpm

# Install all dependencies
pnpm install
```

### 3. Set up Database

#### PostgreSQL Setup

```bash
# Create database user
createuser -P healthcoachai

# Create database
createdb -O healthcoachai healthcoachai_dev

# Enable pgvector extension
psql -d healthcoachai_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

#### Redis Setup

```bash
# Ubuntu/Debian
sudo apt install redis-server

# macOS
brew install redis

# Start Redis
redis-server
```

### 4. Environment Configuration

Copy the example environment files and configure them:

```bash
# Backend configuration
cp services/backend/.env.example services/backend/.env

# Mobile app configurations
cp apps/mobile/ios/.env.example apps/mobile/ios/.env
cp apps/mobile/android/.env.example apps/mobile/android/.env

# n8n configuration
cp n8n/.env.example n8n/.env
```

## Configuration

### Backend Configuration (.env)

The backend uses environment variables for configuration. Key settings include:

#### Database Settings

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=healthcoachai
DB_PASSWORD=your_secure_password
DB_NAME=healthcoachai_dev
POSTGRES_URL=postgresql://healthcoachai:your_secure_password@localhost:5432/healthcoachai_dev
```

#### Redis Settings

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379
```

#### JWT Configuration

```env
JWT_SECRET=your-super-secure-jwt-secret-key-for-development
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=1209600
```

## Demo/Placeholder APIs

⚠️ **IMPORTANT**: The application comes with demo API configurations for
development. You MUST replace these with actual credentials for production use.

### Authentication Providers

#### Google OAuth

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

📍 **Setup**: [Google Cloud Console](https://console.cloud.google.com/)

#### Apple Sign-In

```env
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY_B64=your-base64-encoded-private-key
```

📍 **Setup**: [Apple Developer Portal](https://developer.apple.com/)

#### Facebook Login

```env
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

📍 **Setup**: [Facebook Developers](https://developers.facebook.com/)

### AI Providers

#### OpenAI

```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_ORGANIZATION=your-org-id
```

📍 **Setup**: [OpenAI Platform](https://platform.openai.com/)

#### Anthropic

```env
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
```

📍 **Setup**: [Anthropic Console](https://console.anthropic.com/)

#### Google Vertex AI

```env
GOOGLE_VERTEX_PROJECT=your-project-id
GOOGLE_VERTEX_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS_B64=your-service-account-json-base64
```

📍 **Setup**: [Google Cloud Console](https://console.cloud.google.com/)

### External Services

#### Twilio (SMS/OTP)

```env
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_SERVICE_SID=your-twilio-verify-service-sid
```

📍 **Setup**: [Twilio Console](https://console.twilio.com/)

#### Weather & Air Quality

```env
OPENWEATHER_API_KEY=your-openweather-api-key
IQAIR_API_KEY=your-iqair-api-key
```

📍 **Setup**: [OpenWeather](https://openweathermap.org/api),
[IQAir](https://www.iqair.com/air-pollution-data-api)

#### Health Integrations

```env
FITBIT_CLIENT_ID=your-fitbit-client-id
FITBIT_CLIENT_SECRET=your-fitbit-client-secret
```

📍 **Setup**: [Fitbit Developer](https://dev.fitbit.com/)

#### Push Notifications

##### iOS (APNs)

```env
APNS_KEY_ID=your-apns-key-id
APNS_TEAM_ID=your-apple-team-id
APNS_PRIVATE_KEY_B64=your-apns-private-key-base64
APNS_BUNDLE_ID=com.healthcoachai.app
```

##### Android (FCM)

```env
FCM_PROJECT_ID=your-firebase-project-id
FCM_CLIENT_EMAIL=your-service-account-email
FCM_PRIVATE_KEY_B64=your-fcm-private-key-base64
```

## Running the Application

### 1. Database Migration

```bash
cd services/backend
npm run migration:run
npm run seed:run
```

### 2. Start Backend Services

```bash
# Start all services in development mode
pnpm run dev

# Or start backend only
cd services/backend
npm run start:dev
```

The backend will be available at: `http://localhost:8080`

### 3. Start n8n (Workflow Orchestrator)

```bash
cd n8n
docker-compose up -d
```

n8n will be available at: `http://localhost:5678`

### 4. API Documentation

Swagger API documentation is available at: `http://localhost:8080/api/docs`

## Mobile App Development

### iOS Development

#### Prerequisites

- macOS with Xcode 15+
- iOS Simulator or physical iOS device
- Apple Developer Account (for device testing)

#### Setup

```bash
cd apps/mobile/ios

# Install CocoaPods dependencies (if using)
pod install

# Open in Xcode
open HealthCoachAI.xcodeproj
```

#### Building and Running

1. Open Xcode
2. Select your target device/simulator
3. Press Cmd+R to build and run

### Android Development

#### Prerequisites

- Android Studio 2023.3+
- Android SDK (API level 24+)
- Android Emulator or physical device

#### Setup

```bash
cd apps/mobile/android

# Build the project
./gradlew build
```

#### Building and Running

1. Open Android Studio
2. Import the `apps/mobile/android` directory
3. Sync Gradle files
4. Run the app on emulator/device

### Configuration for Mobile Apps

#### iOS Configuration

Edit `apps/mobile/ios/.env`:

```env
API_BASE_URL=http://localhost:8080
ENVIRONMENT=development
```

#### Android Configuration

Edit `apps/mobile/android/.env`:

```env
API_BASE_URL=http://10.0.2.2:8080
ENVIRONMENT=development
```

## Testing

### Backend Testing

```bash
cd services/backend

# Unit tests
npm run test

# Test coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Mobile Testing

#### iOS Testing

```bash
cd apps/mobile/ios

# Run tests in Xcode
# Product → Test (Cmd+U)
```

#### Android Testing

```bash
cd apps/mobile/android

# Unit tests
./gradlew test

# Instrumented tests
./gradlew connectedAndroidTest
```

### Integration Testing

```bash
# Run all tests across the monorepo
pnpm run test

# Run integration tests
./scripts/test-phase-13-integration.sh
```

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check PostgreSQL status
pg_isready -h localhost -p 5432

# Check Redis status
redis-cli ping
```

#### Node.js/pnpm Issues

```bash
# Clear node modules and reinstall
rm -rf node_modules
pnpm install

# Clear pnpm cache
pnpm store prune
```

#### Build Failures

```bash
# Clean and rebuild
pnpm run clean
pnpm run build
```

### iOS Issues

#### Code Signing

- Ensure you have a valid Apple Developer Account
- Configure proper provisioning profiles in Xcode

#### Simulator Issues

```bash
# Reset iOS Simulator
xcrun simctl erase all
```

### Android Issues

#### Gradle Issues

```bash
cd apps/mobile/android
./gradlew clean
./gradlew build --refresh-dependencies
```

#### Emulator Issues

- Ensure Android Virtual Device (AVD) has sufficient RAM
- Use API level 24+ for compatibility

## Production Deployment

### Environment Setup

1. **Replace all demo API keys** with production credentials
2. **Configure production database** with proper security
3. **Set up SSL/TLS certificates**
4. **Configure monitoring and logging**

### Security Checklist

- [ ] All demo keys replaced with production keys
- [ ] Database passwords are secure
- [ ] SSL certificates installed
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Security headers configured

### Deployment Commands

```bash
# Build for production
pnpm run build

# Database migration for production
cd services/backend
NODE_ENV=production npm run migration:run
```

## Application Architecture

### Backend Structure

```
services/backend/src/
├── domains/
│   ├── auth/           # Authentication & authorization
│   ├── users/          # User management
│   ├── meal-planning/  # AI meal planning
│   ├── fitness-planning/ # AI fitness planning
│   ├── nutrition/      # Nutrition calculations
│   ├── health-reports/ # Health report analysis
│   ├── chat/           # AI chat assistant
│   ├── analytics/      # User analytics
│   └── integrations/   # External integrations
├── config/             # Configuration management
├── common/             # Shared utilities
└── external-apis/      # External API clients
```

### Mobile App Structure

```
apps/mobile/
├── ios/                # iOS SwiftUI app
│   ├── HealthCoachAI/
│   │   ├── Views/      # UI views
│   │   ├── ViewModels/ # View models
│   │   ├── Services/   # API services
│   │   └── DesignSystem/ # Design tokens
│   └── HealthCoachAITests/
└── android/            # Android Jetpack Compose app
    ├── app/src/main/java/com/healthcoachai/app/
    │   ├── ui/         # UI components
    │   ├── onboarding/ # Onboarding flow
    │   └── config/     # Configuration
    └── app/src/test/
```

## Feature Status

### ✅ Fully Implemented

- Authentication system (OAuth + OTP)
- Mobile app foundations (iOS + Android)
- Backend API architecture
- Design system and UI components
- Configuration management
- Security and privacy controls
- Performance optimization

### 🔧 Partially Implemented (with TODOs)

- Android onboarding flow (API integration pending)
- Some mobile UI screens (placeholder content)
- Token management system (tests failing)

### 📋 Demo/Placeholder Status

- All external API credentials are demo keys
- Mock data for development testing
- Placeholder health report processing

## Support

For issues and questions:

1. Check this user guide
2. Review the troubleshooting section
3. Check existing GitHub issues
4. Create a new issue with detailed information

## License

This project is licensed under the MIT License - see the LICENSE file for
details.
