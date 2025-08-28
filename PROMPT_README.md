# HealthAICoach - Original Requirements and Specifications

This document preserves the complete original requirements and specifications for the HealthAICoach application as provided in the problem statement.

## Role and Responsibility

**Engineer Profile**: Senior staff-level mobile, backend, and AI systems engineer

**Mission**: Deliver an end-to-end, App Store and Play Store–launch-ready HealthAICoach application with no demo or placeholder code. Everything must compile, run, and pass tests on first run.

## High-Level Product Vision

HealthAICoach is a personalized AI-powered health and wellness companion providing:

### Core Capabilities
- **Intelligent nutrition guidance and meal planning**
- **Fitness planning and progression**
- **Health tracking and analytics**
- **AI chat/coach experience powered by specialized coaching capabilities**
- **Seamless UX across iOS and Android, with light/dark theme and accessibility**

### Quality Standards
- **Production-ready**: No demo or placeholder code
- **Immediate functionality**: Everything compiles, runs, and passes tests on first run
- **AI Integration**: Correct server-side integration with proper privacy/security
- **Platform compliance**: Respects App Store and Play Store policies

## Design System Source of Truth

### Design Tokens and Themes
- **Colors, typography, spacing, components as first-class citizens**
- **Interactive SVG mockups (13 screens)**
- **Accessibility-first, WCAG 2.1 AA compliance**
- **4px grid system**
- **Dark/light theme support**

### Brand and Token Anchors
- **Brand Primary**: #14b8a6 (turquoise/teal)
- **Brand Secondary**: #f0653e (coral/orange)
- **Neutrals**: Full grayscale palette
- **Semantic colors**: Success, warning, error, info (with dark/light theme mappings)
- **Typography**: System font stacks (Inter/Poppins equivalents)
- **Spacing**: 4px modular grid system

## Technology Stack Requirements

### Mobile Platform
- **Framework**: One codebase producing native-quality iOS and Android apps
- **Technology**: Flutter (Dart) with Material 3 + custom tokens/themes
- **Architecture**: Production-grade folder structure, modular architecture, dependency injection
- **Testing**: Unit/integration/E2E tests with offline-first data layer
- **Restrictions**: No placeholders, production-grade implementation

### Backend Platform
- **Framework**: Production-ready Python FastAPI service
- **AI Integration**: OpenAI + Anthropic server-side integration
  - Tool/function calling
  - Streaming responses
  - Fallbacks, timeouts, retries
  - Rate limiting
- **Domain Logic**: Real nutrition, fitness, monitoring, analytics algorithms
- **Authentication**: 
  - Sign in with Apple/Google + email/password
  - JWT with refresh tokens
  - RBAC (Role-Based Access Control)
- **Data Storage**: 
  - PostgreSQL with secure storage
  - Migrations support
  - Encryption for PII at rest
  - TLS in transit
- **Observability**: Structured logging, metrics, tracing
- **Security**: 
  - Input validation
  - Schema validation
  - OWASP ASVS-aligned controls
  - Secrets via environment variables and vault

### Infrastructure Requirements
- **Containerization**: Docker with multi-stage builds
- **CI/CD**: GitHub Actions for mobile and backend
- **Release workflows**: Build signing, automated tests, linting gates
- **Monitoring**: Sentry/Crashlytics integration
- **Quality Gates**: All tests must pass before deployment

## Functional Scope (Aligned with Mockups)

### Complete User Journeys (No Stubs)

#### Onboarding Flow
1. **Sign In**: Apple/Google/email authentication with consent and privacy acknowledgements
2. **Biometrics Capture**: Age, sex, height, weight, body fat percentage (if known)
3. **Lifestyle Assessment**: Sleep patterns, stress levels, activity level, constraints
4. **Health Screening**: Medical conditions, medications, contraindications
5. **Diet Preferences**: Vegetarian options, allergies, cuisine likes/dislikes
6. **Goals Setting**: Weight targets, body composition, performance, biomarkers, general wellness

#### Core Application Features
1. **Home Dashboard**
   - Daily/weekly overview (nutrition targets, workouts, habit streaks, key biometrics)
   - Actionable cards (log meal, start workout, review plan changes)

2. **Meal Plan Week**
   - Full week meal plan with macros breakdown
   - Grocery list generator
   - Substitutions respecting dietary preferences
   - Recipe details with steps and nutrition facts
   - Meal logging search and quick logging

3. **Fitness Calendar**
   - Weekly/monthly plan visualization
   - Progression tracking
   - Rest days and deload weeks
   - Workout details (sets/reps/tempo/intervals, RPE/RIR where applicable)

4. **Analytics Dashboard**
   - Trends for weight, body fat, steps, workouts, calories, macros, sleep
   - KPI benchmarks and alerts
   - Progress visualization

5. **Chat (AI Coach)**
   - Multi-capability coach with tool use:
     - Nutrition planning, grocery lists, substitutions
     - Fitness planning and progression
     - Habit and education guidance
     - Health monitoring interpretation
   - Traceable responses (show data sources and rationale at high level)
   - Safe completion policies

6. **Settings/Profile**
   - Profile editing and preferences
   - Notification settings
   - Data export/delete account
   - Privacy and consent management

## AI Integration Requirements (Server-Side Only)

### AI Service Architecture
- **Provider Abstraction**: Support for multiple AI providers with dynamic routing
- **Providers**: OpenAI (latest GPT family) and Anthropic (Claude 3.7/4)
- **Routing Policy**: Deterministic policy for provider selection with fallback mechanisms
- **Streaming Support**: Real-time responses to mobile app via server-sent events or websockets

### Tool/Function Calling Patterns
Domain-verified operations with the following functions:
- `create_nutrition_plan(user_profile, goals, dietary_prefs)`
- `generate_grocery_list(meal_plan)`
- `create_fitness_plan(user_profile, goals, readiness, constraints)`
- `analyze_metrics(metrics_time_series)`
- `explain_plan_changes(diff)`

### Safety and Validation
- **Input/Output Schema Validation**: Pydantic-based validation
- **Safe Tool Arguments**: Prevent malicious or invalid inputs
- **Sensitive Field Redaction**: Protect user privacy
- **Rate Limiting**: Prevent abuse and manage costs
- **Error Handling**: Graceful fallbacks and retry mechanisms

### Domain Algorithm Requirements (Real and Robust)

#### Nutrition Algorithms
- **Calorie Calculation**: Mifflin–St Jeor/TDEE with activity multipliers
- **Macro Distribution**: Customizable by goal (weight loss, maintenance, muscle gain)
- **Nutrient Constraints**: Handle allergies/intolerances
- **Substitutions Engine**: Replacement foods respecting dietary preferences

#### Fitness Algorithms
- **Progressive Overload**: Linear/undulating/step loading protocols
- **Rest/Deload Scheduling**: Automatic periodization
- **Heart Rate Zones**: Karvonen formula implementation
- **VO2 Max Estimation**: Progression guidance
- **Habit Formation**: Nudges and adherence scoring

### Security Requirements
- **No Client-Side Keys**: All AI API keys server-side only
- **No Client-Side Prompting**: All LLM interactions server-side
- **Input Sanitization**: Comprehensive validation and sanitization
- **Audit Logging**: Track all AI interactions for compliance

## Data & Privacy Requirements

### Compliance Standards
- **GDPR/CCPA**: Ready data controls and compliance
- **Data Safety**: Android Data Safety form compliance
- **Privacy Manifest**: iOS Privacy Manifest requirements
- **User Controls**: Data export, account deletion, explicit consent flows

### Security Standards
- **PHI Handling**: Encryption and principle of least privilege
- **Audit Logging**: Sensitive events tracking
- **Data Minimization**: Collect only necessary data
- **Consent Management**: Granular privacy controls

## Mobile App Architecture (Flutter)

### Architectural Layers
- **Presentation Layer**: Widgets and UI components
- **State Management**: Riverpod/Bloc for state management
- **Domain Layer**: Use-cases and business logic
- **Data Layer**: Repositories and data sources
- **Platform Layer**: Health integrations and platform-specific code

### Core Features
- **Offline-First**: Local cache (sqflite), background sync, conflict resolution
- **Theming**: Design tokens implementation with light/dark support
- **Accessibility**: Large text, contrast, VoiceOver/TalkBack, focus order
- **Testing**: Widget, integration, golden tests for screens; E2E with integration_test; 90%+ critical path coverage

### Platform Integrations
- **Health Data**: Apple HealthKit / Google Fit (with user opt-in)
- **Notifications**: Push notifications (FCM/APNs), scheduled reminders
- **Monitoring**: Crashlytics/Sentry integration
- **Analytics**: Privacy-friendly analytics implementation

## Backend Architecture (FastAPI)

### Module Structure
- **auth**: OAuth (Apple/Google), email/password, password reset
- **users**: Profiles, consents, preferences management
- **nutrition**: Plan creation, recipes, grocery lists, logging
- **fitness**: Programs, workouts, progression, calendar, logging
- **tracking**: Biometrics, sleep, steps, HR, device integrations
- **analytics**: Timeseries storage, aggregation, trends, anomaly alerts
- **ai**: Orchestration, tool handlers, provider routing, safety policies

### Infrastructure Components
- **Database**: PostgreSQL with SQLAlchemy + Alembic migrations; PII encryption at rest
- **Caching**: Redis for sessions, rate limits, and AI response caching
- **Observability**: OpenTelemetry traces, Prometheus metrics, structured logs
- **Security**: CSP, rate limiting, input validation, WAF-ready behind reverse proxy

### Testing Strategy
- **Unit Tests**: pytest unit tests for all services
- **Integration Tests**: API test suite with contract tests
- **OpenAPI-Driven**: Contract testing based on OpenAPI specifications

## Design System Implementation

### Token Implementation
- **Colors**: Implement from design/tokens/colors.json
- **Typography**: Implement from design/tokens/typography.json
- **Spacing**: Implement from design/tokens/spacing.json
- **Components**: Implement from design/tokens/components.json

### Screen Implementation
Build all mockup screens faithfully:
- onboarding_sign_in.svg
- onboarding_biometrics.svg
- onboarding_lifestyle.svg
- onboarding_health_screening.svg
- onboarding_diet_prefs.svg
- onboarding_goals.svg
- home_dashboard.svg
- mealplan_week.svg
- recipe_detail.svg
- meal_logging_search.svg
- analytics.svg
- chat.svg
- fitness_calendar.svg

### Implementation Notes
- **Design Annotations**: Include as code comments where necessary
- **Grid System**: 4px modular grid implementation
- **Responsive Design**: Adapt to different screen sizes
- **Accessibility**: WCAG 2.1 AA compliance

## Build, Release, and CI/CD

### GitHub Actions Requirements
- **Backend Pipeline**:
  - Lint (ruff), type-check (mypy), tests
  - Build/publish Docker image
  - Security scanning
  - Deployment automation

- **Mobile Pipeline**:
  - flutter analyze/test
  - Build iOS/Android artifacts
  - Upload to TestFlight/Internal testing
  - Store metadata management

### Signing and Secrets Management
- **iOS**: Fastlane (match or app store connect API), encrypted certificates
- **Android**: Keystore handling via encrypted secrets; Play Developer API for uploads
- **Security**: All secrets via environment variables, no hardcoded credentials

### Store Readiness Artifacts
- **App Icons**: All required sizes and formats
- **Splash Screens**: Platform-specific implementations
- **Screenshots**: Light/dark mode for all device sizes
- **Descriptions**: Short/long descriptions for stores
- **Privacy Policy**: Comprehensive privacy documentation
- **iOS Privacy Manifest**: Required privacy declarations
- **Android Data Safety**: Form configuration files

### Release Checklist Requirements
- **Quality Gates**: Blocks release if tests or privacy checks fail
- **Automated Testing**: All tests must pass
- **Security Scanning**: No high-severity vulnerabilities
- **Privacy Compliance**: All privacy requirements met

## Acceptance Criteria (No Exceptions)

### Code Quality Standards
- **No Placeholders**: No demo, "TODO", "lorem ipsum", or mock endpoints
- **Complete Implementation**: All screens and flows implemented and navigable
- **AI Functionality**: AI endpoints return valid, coherent outputs with real tool handlers and verifiable schema
- **Build Success**: Both iOS and Android builds succeed locally and in CI
- **Test Coverage**: All tests pass; code coverage for critical paths ≥ 90%

### Compliance Standards
- **Accessibility**: Accessibility checks pass (contrast, labels, navigation)
- **Security**: Security scans pass; secrets not exposed client-side
- **Reliability**: Crash-free sessions ≥ 99% during internal testing
- **Platform Compliance**: App adheres to App Store and Play Store guidelines

### Performance Standards
- **Response Times**: API responses < 2 seconds (95th percentile)
- **App Launch**: Cold start < 3 seconds
- **Offline Support**: Full functionality without network connection
- **Memory Usage**: Optimized memory usage on mobile devices

## Key Environment Variables

### AI Configuration
- `OPENAI_API_KEY`: OpenAI API access key
- `ANTHROPIC_API_KEY`: Anthropic Claude API access key

### Database Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string

### Authentication Configuration
- `JWT_SECRET`: JWT token signing secret
- `OAUTH_GOOGLE_CLIENT_ID`: Google OAuth client ID
- `OAUTH_APPLE_CLIENT_ID`: Apple OAuth client ID

### Monitoring Configuration
- `SENTRY_DSN`: Sentry error tracking DSN
- `CRASHLYTICS_CONFIG`: Firebase Crashlytics configuration
- `ANALYTICS_WRITE_KEY`: Privacy-compliant analytics key

## Domain Implementation Specifications

### Nutrition Domain
- **TDEE Calculation**: Mifflin–St Jeor equation with activity multipliers
- **Macro Distribution**: Goal-based macro splits (weight loss, recomposition, muscle gain)
- **Constraints**: Macro constraints per dietary preferences
- **Substitutions**: Allergen-safe food substitutions
- **Shopping Lists**: Automated grocery list generation from meal plans

### Fitness Domain
- **Periodization**: Periodized programming with progressive overload
- **Heart Rate**: HR zone calculations using Karvonen formula
- **VO2 Max**: Estimation and progression tracking
- **Recovery**: Sleep and HRV inputs for auto-adjusting sessions
- **Rest/Deload**: Automatic rest and deload week scheduling

### Tracking & Analytics Domain
- **Timeseries Storage**: Store metrics with appropriate rollups
- **Trend Analysis**: Produce trend summaries and weekly reports
- **Anomaly Detection**: Alert on metric anomalies
- **Plan Adjustments**: Generate plan adjustments with explanations

### Safety & Compliance Domain
- **Medical Disclaimers**: Never provide medical diagnosis; present general guidance with disclaimers
- **Platform Policies**: Respect platform content policies; avoid disallowed claims
- **Privacy Protection**: Minimize data collection and protect user privacy
- **Content Filtering**: Filter inappropriate or harmful content

## Prohibited Elements

### Code Restrictions
- **No Demo Code**: Any demo, stub, or placeholder code
- **No Client-Side AI**: Client-side direct LLM calls or exposed API keys
- **No Incomplete Flows**: Incomplete flows, unimplemented buttons, or dead navigation routes
- **No Hardcoded Secrets**: Any hardcoded API keys or credentials

### Content Restrictions
- **No Medical Claims**: Avoid making medical diagnoses or claims
- **No Inappropriate Content**: Filter and prevent inappropriate or harmful content
- **No Privacy Violations**: Respect user privacy and data protection laws
- **No Platform Violations**: Adhere to App Store and Play Store guidelines

## Final Deliverables

### Application Deliverables
- **Complete Flutter App**: Buildable Flutter app for iOS/Android
- **Complete Backend**: Deployable FastAPI backend (Dockerized) with matching OpenAPI schema
- **CI/CD Pipelines**: Complete pipelines for both mobile and backend with signing and store-upload tasks

### Documentation Deliverables
- **Comprehensive Tests**: Unit/integration/E2E tests with documentation
- **Run/Build/Release Instructions**: Complete setup and deployment documentation
- **Store Metadata**: Descriptions, screenshots checklist, privacy policy with links

### Compliance Deliverables
- **Privacy Documentation**: Comprehensive privacy policy and data handling documentation
- **Security Documentation**: Security measures and compliance documentation
- **Accessibility Documentation**: Accessibility features and compliance validation
- **Platform Compliance**: App Store and Play Store compliance verification

## Implementation Approach

### Phase-Based Development
1. **Documentation and Planning**: Complete project documentation and planning
2. **Backend Foundation**: Core backend with real domain logic and AI integration
3. **Mobile Foundation**: Complete Flutter app with design system and core screens
4. **AI Integration**: Wire AI capabilities with streaming and tool calling
5. **Platform Integrations**: Health platform integrations and notifications
6. **CI/CD and Store Readiness**: Complete deployment automation and store preparation
7. **Final Testing**: E2E validation and production readiness verification

### Quality Assurance
- **Continuous Testing**: Tests run at every stage of development
- **Security Reviews**: Regular security scans and reviews
- **Performance Monitoring**: Continuous performance monitoring and optimization
- **Compliance Verification**: Regular compliance checks against all requirements

---

This document serves as the definitive source of truth for all requirements and specifications for the HealthAICoach application. All implementation decisions should reference back to these requirements to ensure complete compliance with the original specifications.