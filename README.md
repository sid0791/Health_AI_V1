# HealthAICoach - End-to-End AI-Powered Health & Wellness Application

[![Build Status](https://github.com/coronis/Health_AI_V1/workflows/CI/badge.svg)](https://github.com/coronis/Health_AI_V1/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Flutter Version](https://img.shields.io/badge/Flutter-3.16+-blue.svg)](https://flutter.dev)
[![FastAPI Version](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)

## Overview

HealthAICoach is a comprehensive, production-ready mobile application that provides personalized AI-powered health and wellness coaching. The application delivers intelligent nutrition guidance, fitness planning, health tracking, and an AI chat experience across iOS and Android platforms.

### Key Features

🍎 **Intelligent Nutrition**
- Personalized meal planning with macro tracking
- AI-powered recipe recommendations
- Dietary restriction and allergy management
- Automated grocery list generation

💪 **Smart Fitness Planning**
- Progressive workout programs
- Heart rate zone optimization
- Recovery and readiness assessment
- Performance tracking and analytics

📊 **Health Analytics**
- Comprehensive health tracking
- Trend analysis and insights
- Goal progress monitoring
- Anomaly detection and alerts

🤖 **AI Health Coach**
- 24/7 personalized guidance
- Multi-modal coaching capabilities
- Evidence-based recommendations
- Privacy-first AI interactions

## Architecture

### Technology Stack

**Frontend (Mobile)**
- **Framework**: Flutter 3.16+ (Dart)
- **State Management**: Riverpod
- **UI Design**: Material 3 with custom design tokens
- **Local Storage**: SQLite with sqflite
- **Platforms**: iOS 14+ and Android API 21+

**Backend (API)**
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15+ with SQLAlchemy
- **Cache**: Redis 7+
- **AI Integration**: OpenAI GPT-4 + Anthropic Claude
- **Authentication**: OAuth2 + JWT with refresh tokens

**Infrastructure**
- **Containerization**: Docker with multi-stage builds
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry/Crashlytics
- **Analytics**: Privacy-compliant analytics

### Design System

**Brand Colors**
- Primary: #14b8a6 (Teal)
- Secondary: #f0653e (Coral)
- Full grayscale palette with semantic colors

**Typography**
- System font stacks (Inter/Poppins equivalents)
- Responsive scaling with accessibility support

**Layout**
- 4px modular grid system
- Light/dark theme support
- WCAG 2.1 AA compliance

## Project Structure

```
Health_AI_V1/
├── mobile/              # Flutter mobile application
├── backend/             # FastAPI backend service
├── design/              # Design tokens and mockups
├── infra/               # Infrastructure and deployment
├── docs/                # Documentation
└── .github/             # CI/CD workflows
```

## Quick Start

### Prerequisites

- **Mobile Development**
  - Flutter 3.16+ with Dart SDK
  - Android Studio / Xcode for platform tools
  - Android SDK 21+ / iOS 14+

- **Backend Development**
  - Python 3.11+
  - PostgreSQL 15+
  - Redis 7+
  - Docker (optional but recommended)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/coronis/Health_AI_V1.git
   cd Health_AI_V1
   ```

2. **Backend Setup**
   ```bash
   cd backend
   
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Setup environment variables
   cp .env.example .env
   # Edit .env with your configuration
   
   # Run database migrations
   alembic upgrade head
   
   # Start the backend server
   uvicorn app.main:app --reload
   ```

3. **Mobile Setup**
   ```bash
   cd mobile
   
   # Install Flutter dependencies
   flutter pub get
   
   # Run code generation
   flutter packages pub run build_runner build
   
   # Start the mobile app
   flutter run
   ```

4. **Docker Development (Alternative)**
   ```bash
   # Start all services with Docker Compose
   docker-compose up -d
   
   # View logs
   docker-compose logs -f
   ```

### Environment Configuration

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/healthai
REDIS_URL=redis://localhost:6379

# AI Providers
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Authentication
JWT_SECRET=your_jwt_secret_key
OAUTH_GOOGLE_CLIENT_ID=your_google_client_id
OAUTH_APPLE_CLIENT_ID=your_apple_client_id

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

## Documentation

For complete documentation, see:
- **[Implementation Plan](IMPLEMENTATION_PLAN.md)** - Detailed technical implementation plan
- **[Application Phases](APPLICATION_PHASES.md)** - Development phases and milestones
- **[Universal Tasks](UNIVERSAL_TASKS.md)** - Task breakdown for each development phase
- **[Prompt Documentation](PROMPT_README.md)** - Original requirements and specifications

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for better health outcomes**