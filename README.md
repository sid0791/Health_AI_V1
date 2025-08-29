# HealthCoachAI — End‑to‑End, Production‑Grade AI Health & Wellness Platform

[![CI](https://github.com/coronis/Health_AI_V1/actions/workflows/backend.yml/badge.svg)](https://github.com/coronis/Health_AI_V1/actions)
[![Mobile iOS](https://github.com/coronis/Health_AI_V1/actions/workflows/mobile-ios.yml/badge.svg)](https://github.com/coronis/Health_AI_V1/actions)
[![Mobile Android](https://github.com/coronis/Health_AI_V1/actions/workflows/mobile-android.yml/badge.svg)](https://github.com/coronis/Health_AI_V1/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Mission
- Build and ship a launch‑ready, secure, scalable, AI‑powered health coach with native iOS and Android apps, real backend, n8n orchestration, accurate nutrition/fitness engines, privacy‑first AI, and CI/CD.
- This README is aligned to PROMPT_README_COMBINED.md (SSOT) and APPLICATION_PHASES.md (Phases 0–15). No placeholders or demo stubs. Secrets never in code.

Important Note about Architecture Update
- Earlier drafts described a Flutter + FastAPI stack. Per PROMPT_README_COMBINED.md and APPLICATION_PHASES.md, the target architecture is:
  - Native iOS (SwiftUI) + Android (Jetpack Compose)
  - Backend: Node.js (NestJS + TypeScript)
  - Orchestration: n8n
  - Vector store: Postgres + pgvector (or OpenSearch)
- This README reflects the target architecture and the atomic monorepo needed to deliver it end‑to‑end. Where existing code differs, see “Migration Notes” near the end of this document.

Overview
- Personalized nutrition and fitness planning (celebrity‑grade), with accurate TDEE/macros/micros, GI/GL, cooking transforms.
- Weekly adaptive loop using logs and wearable data.
- Health report pipeline (OCR → NER → interpretation) with Level 1 highest accuracy policy.
- Domain‑scoped chat with RAG grounded in user data, report interpretations, and curated domain knowledge.
- India‑first UX and data sources; Hinglish inputs; global scaling target 10M+.

Non‑negotiables
- Level 1 vs Level 2 AI policies (accuracy vs cost) strictly enforced by AI Router and n8n.
- Security/privacy by design: no client‑side secrets, DLP/pseudonymization for external AI calls, zero‑retention vendor flags.
- Performance and reliability: p95 API < 2s, mobile launch < 3s, graceful degradation, offline caching.
- Accessibility: WCAG 2.1 AA; large tap targets; dynamic type; screen reader labels.

Architecture

Mobile (Native)
- iOS: SwiftUI + Combine; design system tokens; offline caching; HealthKit integration.
- Android: Kotlin + Jetpack Compose; design system tokens; offline caching; Google Fit integration.
- Shared UX: Onboarding, Dashboard, 7‑Day Meal Plan with swaps, Food Diary (English + Hinglish), Analytics, Fitness Plan, Settings, Domain‑scoped Chat.

Backend (services/backend)
- Framework: NestJS (TypeScript), domain‑driven modular architecture.
- Data: PostgreSQL (primary, + pgvector), Redis (cache), Object Storage (S3/GCS).
- APIs: REST/GraphQL; versioning; idempotency; caching headers; OpenAPI published.
- Core Modules: Auth, Consent, Profiles, Preferences, Goals, Reports + Level 1 pipeline, Nutrition Engine, Recipes, Meal Plans, Fitness Plans, Logs, Analytics, AI Router (Level 1/2), Chat, RAG, ETL, Integrations, Notifications, Admin.

AI & Orchestration
- n8n workflows:
  - AI Router orchestrator (Level 1/2 + quotas + fallbacks + audit)
  - Health Report Ingestion (OCR → NER → Interpretation)
  - Daily Plan Runner and Weekly Review/Adaptation
  - Notifications Scheduler (hydration/meals/workouts/AQI)
  - Quota Reset (daily ladder reset for Level 1)
- AI Router:
  - Level 1 (health reports, report Q&A): always highest accuracy first with daily tier step‑down; never below Level 2 without explicit consent.
  - Level 2 (diet/fitness/recipes/chat): cheapest within 5% of top accuracy; prefer open‑source/self‑hosted where feasible.
  - DLP/pseudonymization; zero‑retention flags; decisions logged with model, version, cost, quota state.

RAG & Domain‑Scoped Chat
- Vector store: pgvector on Postgres (or OpenSearch).
- Indexed corpora: user profile/preferences/goals/logs/measurements, structured health report extracts, plan summaries, curated nutrition/fitness knowledge.
- Chat answers only domain‑scoped questions; provides citations where applicable; update operations require explicit user confirmation; audits recorded.

Health Report Pipeline (Level 1)
- OCR/DU (primary best‑in‑class per region) with fallbacks; table/section extraction.
- NER + normalization for biomarkers; units/ranges by age/sex.
- Interpretation: anomalies, trends, plain‑language summaries; physician red‑flag triggers.
- Privacy: encrypted storage; no raw image logs; zero‑retention providers; DLP enforced.

Nutrition & Fitness Engines
- Nutrition: TDEE (Mifflin–St Jeor), macro/micro targets, cooking yields/retention factors, GI/GL computation and estimation for unmapped foods.
- Data sources: USDA FDC; IFCT (license permitting); Open Food Facts; GI tables (licensed/approved); provenance stored.
- Fitness: monthly → weekly periodized programs; progressive overload; deload; contraindications; safety notes; substitutions; video references.

Integrations & Context
- Health: Apple HealthKit (iOS), Google Fit (Android), Fitbit.
- Environment: AQI/Weather (OpenWeather/IQAir) with caching and adaptive nudges.
- Notifications: APNs/FCM; hydration, meal, workout reminders; configurable; quiet hours.

Performance, Security, Observability, Cost
- Performance targets and load/soak testing; caching (Redis/CDN); background jobs; circuit breakers; timeouts.
- Security: OWASP ASVS; RBAC/ABAC; audit logs; TLS/mTLS; KMS encryption; secrets via Secrets Manager; WAF/bot protection/rate limiting; data export/delete flows.
- Observability: OpenTelemetry tracing, structured logs, metrics; SLO dashboards; synthetic checks; alerting; runbooks; DR tests.
- Cost controls: model usage dashboards; quotas; cache hit metrics; provider mix optimization per Level 1/2 policy.

Design System
- Brand: fresh greens & turquoise; coral/orange accents; soft neutrals.
- Typography: Inter or Poppins; responsive; accessible.
- Components: cards, chips, sliders, charts (progress ring, lines, stacked bars), toggles, modals.
- Accessibility: WCAG 2.1 AA; ≥44px tap targets; screen reader labels; logical focus; high contrast options.

Phases and Deliverables (0–15)
- APPLICATION_PHASES.md is authoritative. Summary milestones:
  - 0: Documentation & planning (implementation plan, repo structure, universal tasks)
  - 1: Program setup & governance
  - 2: Core backend & data modeling
  - 3: Nutrition & GI/GL engines + ETL
  - 4: Recipe corpus & personalization
  - 5: Fitness engine & workout library
  - 6: Auth, consent, privacy
  - 7: Mobile app foundations + design system
  - 8: Onboarding & data capture
  - 9: Plans UI, logging, analytics shell
  - 10: AI core, router, n8n
  - 11: Health report pipeline (Level 1)
  - 12: AI meal planning & celebrity recipes (GI/GL & cooking transforms)
  - 13: AI fitness adaptation, weekly loop, domain‑scoped chat with RAG
  - 14: Integrations (HealthKit/Fit/Fitbit, AQI/Weather, Push)
  - 15: Performance, security, observability, cost, QA (SIT/UAT), compliance & launch

Detailed Repository Structure

The repository tree below mirrors the current README’s “Detailed Repository Structure” section as‑is.

```
Health_AI_V1/
├── README.md                           # Main repository documentation
├── IMPLEMENTATION_PLAN.md              # Technical implementation plan
├── APPLICATION_PHASES.md               # Detailed development phases breakdown
├── PROMPT_README.md                    # Original requirements documentation
├── UNIVERSAL_TASKS.md                  # Task list for all development phases
├── LICENSE                             # MIT license file
├── .gitignore                          # Repository-wide gitignore
├── .editorconfig                       # Editor configuration for consistency
│
├── .github/                            # GitHub-specific configuration
│   ├── workflows/                      # CI/CD pipeline definitions
│   │   ├── backend.yml                 # Backend testing, security scanning, deployment
│   │   ├── mobile.yml                  # Mobile builds, testing, store uploads
│   │   ├── release.yml                 # Release management and automation
│   │   ├── security.yml                # Security scanning and compliance checks
│   │   └── docs.yml                    # Documentation building and deployment
│   ├── ISSUE_TEMPLATE/                 # Issue templates for bug reports and features
│   ├── PULL_REQUEST_TEMPLATE.md        # Pull request template
│   └── CODEOWNERS                      # Code review ownership rules
│
├── mobile/                             # Flutter Mobile Application
│   ├── lib/                            # Main Flutter source code
│   │   ├── main.dart                   # Application entry point
│   │   ├── app/                        # App-level configuration and routing
│   │   │   ├── app.dart                # Main app widget and theme configuration
│   │   │   ├── router/                 # Navigation and routing configuration
│   │   │   │   ├── app_router.dart     # Main router configuration
│   │   │   │   ├── route_names.dart    # Named route constants
│   │   │   │   └── route_guards.dart   # Authentication and permission guards
│   │   │   └── themes/                 # App theming based on design tokens
│   │   │       ├── app_theme.dart      # Main theme configuration
│   │   │       ├── light_theme.dart    # Light theme implementation
│   │   │       ├── dark_theme.dart     # Dark theme implementation
│   │   │       └── theme_extensions.dart # Custom theme extensions
│   │   ├── core/                       # Core utilities, constants, and services
│   │   │   ├── constants/              # App-wide constants
│   │   │   │   ├── app_constants.dart  # General app constants
│   │   │   │   ├── api_constants.dart  # API endpoints and configuration
│   │   │   │   └── storage_keys.dart   # Local storage key constants
│   │   │   ├── error/                  # Error handling and exceptions
│   │   │   │   ├── exceptions.dart     # Custom exception definitions
│   │   │   │   ├── failures.dart       # Failure classes for error handling
│   │   │   │   └── error_handler.dart  # Global error handling service
│   │   │   ├── network/                # Networking and API communication
│   │   │   │   ├── api_client.dart     # HTTP client configuration
│   │   │   │   ├── interceptors/       # HTTP interceptors
│   │   │   │   ├── network_info.dart   # Network connectivity checking
│   │   │   │   └── api_endpoints.dart  # API endpoint definitions
│   │   │   ├── storage/                # Local storage and caching
│   │   │   │   ├── storage_service.dart # Local storage abstraction
│   │   │   │   ├── cache_manager.dart  # Cache management
│   │   │   │   └── secure_storage.dart # Secure storage for sensitive data
│   │   │   ├── utils/                  # Utility functions and helpers
│   │   │   │   ├── date_utils.dart     # Date formatting and calculations
│   │   │   │   ├── validation_utils.dart # Input validation helpers
│   │   │   │   ├── permission_utils.dart # Permission handling utilities
│   │   │   │   └── platform_utils.dart # Platform-specific utilities
│   │   │   └── services/               # Core app services
│   │   │       ├── dependency_injection.dart # Service locator/DI container
│   │   │       ├── logging_service.dart # Centralized logging
│   │   │       ├── analytics_service.dart # Analytics and event tracking
│   │   │       └── crash_reporting_service.dart # Crash reporting
│   │   ├── features/                   # Feature-based modular architecture
│   │   │   ├── authentication/         # Authentication and user management
│   │   │   │   ├── data/               # Data layer (repositories, data sources)
│   │   │   │   │   ├── datasources/    # Local and remote data sources
│   │   │   │   │   │   ├── auth_local_datasource.dart
│   │   │   │   │   │   └── auth_remote_datasource.dart
│   │   │   │   │   ├── models/         # Data models
│   │   │   │   │   │   ├── user_model.dart
│   │   │   │   │   │   ├── auth_response_model.dart
│   │   │   │   │   │   └── login_request_model.dart
│   │   │   │   │   └── repositories/   # Repository implementations
│   │   │   │   │       └── auth_repository_impl.dart
│   │   │   │   ├── domain/             # Business logic layer
│   │   │   │   │   ├── entities/       # Domain entities
│   │   │   │   │   │   ├── user.dart
│   │   │   │   │   │   └── auth_credentials.dart
│   │   │   │   │   ├── repositories/   # Repository abstractions
│   │   │   │   │   │   └── auth_repository.dart
│   │   │   │   │   └── usecases/       # Use cases (business logic)
│   │   │   │   │       ├── login_usecase.dart
│   │   │   │   │       ├── register_usecase.dart
│   │   │   │   │       ├── logout_usecase.dart
│   │   │   │   │       └── refresh_token_usecase.dart
│   │   │   │   └── presentation/       # UI layer
│   │   │   │       ├── providers/      # State management (Riverpod providers)
│   │   │   │       │   ├── auth_provider.dart
│   │   │   │       │   └── user_provider.dart
│   │   │   │       ├── screens/        # Screen widgets
│   │   │   │       │   ├── login_screen.dart
│   │   │   │       │   ├── register_screen.dart
│   │   │   │       │   └── forgot_password_screen.dart
│   │   │   │       └── widgets/        # Feature-specific widgets
│   │   │   │           ├── login_form.dart
│   │   │   │           ├── oauth_buttons.dart
│   │   │   │           └── password_field.dart
│   │   │   ├── onboarding/             # User onboarding flow
│   │   │   │   ├── data/
│   │   │   │   │   ├── datasources/
│   │   │   │   │   ├── models/
│   │   │   │   │   └── repositories/
│   │   │   │   ├── domain/
│   │   │   │   │   ├── entities/
│   │   │   │   │   ├── repositories/
│   │   │   │   │   └── usecases/
│   │   │   │   └── presentation/
│   │   │   │       ├── providers/
│   │   │   │       ├── screens/
│   │   │   │       │   ├── biometrics_screen.dart
│   │   │   │       │   ├── lifestyle_screen.dart
│   │   │   │       │   ├── health_screening_screen.dart
│   │   │   │       │   ├── diet_preferences_screen.dart
│   │   │   │       │   └── goals_screen.dart
│   │   │   │       └── widgets/
│   │   │   ├── dashboard/              # Home dashboard
│   │   │   │   ├── data/
│   │   │   │   ├── domain/
│   │   │   │   └── presentation/
│   │   │   │       ├── providers/
│   │   │   │       ├── screens/
│   │   │   │       │   └── dashboard_screen.dart
│   │   │   │       └── widgets/
│   │   │   │           ├── dashboard_card.dart
│   │   │   │           ├── progress_summary.dart
│   │   │   │           ├── quick_actions.dart
│   │   │   │           └── metric_widget.dart
│   │   │   ├── nutrition/              # Nutrition and meal planning
│   │   │   │   ├── data/
│   │   │   │   │   ├── datasources/
│   │   │   │   │   ├── models/
│   │   │   │   │   │   ├── meal_plan_model.dart
│   │   │   │   │   │   ├── recipe_model.dart
│   │   │   │   │   │   ├── nutrition_data_model.dart
│   │   │   │   │   │   └── food_item_model.dart
│   │   │   │   │   └── repositories/
│   │   │   │   ├── domain/
│   │   │   │   │   ├── entities/
│   │   │   │   │   ├── repositories/
│   │   │   │   │   └── usecases/
│   │   │   │   │       ├── get_meal_plan_usecase.dart
│   │   │   │   │       ├── log_meal_usecase.dart
│   │   │   │   │       ├── search_food_usecase.dart
│   │   │   │   │       └── generate_grocery_list_usecase.dart
│   │   │   │   └── presentation/
│   │   │   │       ├── providers/
│   │   │   │       ├── screens/
│   │   │   │       │   ├── meal_plan_week_screen.dart
│   │   │   │       │   ├── recipe_detail_screen.dart
│   │   │   │       │   └── meal_logging_screen.dart
│   │   │   │       └── widgets/
│   │   │   │           ├── meal_card.dart
│   │   │   │           ├── recipe_card.dart
│   │   │   │           ├── nutrition_breakdown.dart
│   │   │   │           └── food_search_bar.dart
│   │   │   ├── fitness/                # Fitness planning and tracking
│   │   │   │   ├── data/
│   │   │   │   │   ├── datasources/
│   │   │   │   │   ├── models/
│   │   │   │   │   │   ├── workout_plan_model.dart
│   │   │   │   │   │   ├── exercise_model.dart
│   │   │   │   │   │   ├── workout_session_model.dart
│   │   │   │   │   │   └── fitness_metrics_model.dart
│   │   │   │   │   └── repositories/
│   │   │   │   ├── domain/
│   │   │   │   │   ├── entities/
│   │   │   │   │   ├── repositories/
│   │   │   │   │   └── usecases/
│   │   │   │   │       ├── get_workout_plan_usecase.dart
│   │   │   │   │       ├── log_workout_usecase.dart
│   │   │   │   │       ├── track_progress_usecase.dart
│   │   │   │   │       └── calculate_recommendations_usecase.dart
│   │   │   │   └── presentation/
│   │   │   │       ├── providers/
│   │   │   │       ├── screens/
│   │   │   │       │   ├── fitness_calendar_screen.dart
│   │   │   │       │   ├── workout_detail_screen.dart
│   │   │   │       │   └── exercise_tracking_screen.dart
│   │   │   │       └── widgets/
│   │   │   │           ├── workout_card.dart
│   │   │   │           ├── exercise_set_widget.dart
│   │   │   │           ├── progress_chart.dart
│   │   │   │           └── calendar_widget.dart
│   │   │   ├── analytics/              # Analytics and progress tracking
│   │   │   │   ├── data/
│   │   │   │   ├── domain/
│   │   │   │   └── presentation/
│   │   │   │       ├── providers/
│   │   │   │       ├── screens/
│   │   │   │       │   └── analytics_screen.dart
│   │   │   │       └── widgets/
│   │   │   │           ├── trend_chart.dart
│   │   │   │           ├── metric_summary.dart
│   │   │   │           ├── progress_indicator.dart
│   │   │   │           └── goal_tracker.dart
│   │   │   ├── chat/                   # AI chat interface
│   │   │   │   ├── data/
│   │   │   │   │   ├── datasources/
│   │   │   │   │   ├── models/
│   │   │   │   │   │   ├── chat_message_model.dart
│   │   │   │   │   │   ├── conversation_model.dart
│   │   │   │   │   │   └── ai_response_model.dart
│   │   │   │   │   └── repositories/
│   │   │   │   ├── domain/
│   │   │   │   │   ├── entities/
│   │   │   │   │   ├── repositories/
│   │   │   │   │   └── usecases/
│   │   │   │   │       ├── send_message_usecase.dart
│   │   │   │   │       ├── stream_ai_response_usecase.dart
│   │   │   │   │       └── get_conversation_history_usecase.dart
│   │   │   │   └── presentation/
│   │   │   │       ├── providers/
│   │   │   │       ├── screens/
│   │   │   │       │   └── chat_screen.dart
│   │   │   │       └── widgets/
│   │   │   │           ├── chat_message_widget.dart
│   │   │   │           ├── message_input.dart
│   │   │   │           ├── typing_indicator.dart
│   │   │   │           └── tool_use_display.dart
│   │   │   ├── profile/                # User profile and settings
│   │   │   │   ├── data/
│   │   │   │   ├── domain/
│   │   │   │   └── presentation/
│   │   │   │       ├── providers/
│   │   │   │       ├── screens/
│   │   │   │       │   ├── profile_screen.dart
│   │   │   │       │   ├── settings_screen.dart
│   │   │   │       │   └── privacy_settings_screen.dart
│   │   │   │       └── widgets/
│   │   │   │           ├── profile_avatar.dart
│   │   │   │           ├── settings_tile.dart
│   │   │   │           └── privacy_controls.dart
│   │   │   └── health_integration/     # Health platform integrations
│   │   │       ├── data/
│   │   │       │   ├── datasources/
│   │   │       │   │   ├── health_kit_datasource.dart (iOS)
│   │   │       │   │   └── google_fit_datasource.dart (Android)
│   │   │       │   ├── models/
│   │   │       │   └── repositories/
│   │   │       ├── domain/
│   │   │       │   ├── entities/
│   │   │       │   ├── repositories/
│   │   │       │   └── usecases/
│   │   │       │       ├── sync_health_data_usecase.dart
│   │   │       │       ├── request_permissions_usecase.dart
│   │   │       │       └── write_health_data_usecase.dart
│   │   │       └── presentation/
│   │   │           ├── providers/
│   │   │           ├── screens/
│   │   │           └── widgets/
│   │   ├── shared/                     # Shared components across features
│   │   │   ├── data/                   # Shared data layer components
│   │   │   │   ├── datasources/        # Common data sources
│   │   │   │   ├── models/             # Shared data models
│   │   │   │   └── repositories/       # Base repository implementations
│   │   │   ├── domain/                 # Shared business logic
│   │   │   │   ├── entities/           # Common entities
│   │   │   │   ├── repositories/       # Repository interfaces
│   │   │   │   └── usecases/           # Shared use cases
│   │   │   ├── presentation/           # Shared UI components
│   │   │   │   ├── providers/          # Global state providers
│   │   │   │   ├── widgets/            # Reusable widgets
│   │   │   │   │   ├── buttons/        # Custom button widgets
│   │   │   │   │   ├── inputs/         # Input field widgets
│   │   │   │   │   ├── cards/          # Card components
│   │   │   │   │   ├── charts/         # Chart and graph widgets
│   │   │   │   │   ├── dialogs/        # Dialog components
│   │   │   │   │   └── loaders/        # Loading indicator widgets
│   │   │   │   └── screens/            # Base screen classes
│   │   │   └── platform/               # Platform-specific implementations
│   │   │       ├── ios/                # iOS-specific code
│   │   │       ├── android/            # Android-specific code
│   │   │       └── web/                # Web-specific code (future)
│   │   └── design_system/              # Design system implementation
│   │       ├── tokens/                 # Design tokens implementation
│   │       │   ├── colors.dart         # Color tokens from JSON
│   │       │   ├── typography.dart     # Typography tokens
│   │       │   ├── spacing.dart        # Spacing tokens
│   │       │   └── breakpoints.dart    # Responsive breakpoints
│   │       ├── components/             # Design system components
│   │       │   ├── buttons/            # Button variants
│   │       │   ├── inputs/             # Input field variants
│   │       │   ├── cards/              # Card variants
│   │       │   └── navigation/         # Navigation components
│   │       └── themes/                 # Theme implementations
│   │           ├── material_theme.dart # Material 3 theme setup
│   │           └── custom_theme.dart   # Custom theme extensions
│   ├── test/                           # Unit and widget tests
│   │   ├── features/                   # Feature-specific tests
│   │   │   ├── authentication/         # Auth tests
│   │   │   ├── nutrition/              # Nutrition tests
│   │   │   ├── fitness/                # Fitness tests
│   │   │   ├── chat/                   # Chat tests
│   │   │   └── analytics/              # Analytics tests
│   │   ├── shared/                     # Shared component tests
│   │   ├── core/                       # Core functionality tests
│   │   ├── mocks/                      # Mock implementations
│   │   ├── fixtures/                   # Test data fixtures
│   │   └── utils/                      # Test utilities
│   ├── integration_test/               # Integration and E2E tests
│   │   ├── flows/                      # User flow tests
│   │   │   ├── onboarding_flow_test.dart
│   │   │   ├── meal_planning_flow_test.dart
│   │   │   ├── workout_planning_flow_test.dart
│   │   │   └── chat_flow_test.dart
│   │   ├── screens/                    # Screen integration tests
│   │   └── utils/                      # Integration test utilities
│   ├── assets/                         # App assets
│   │   ├── images/                     # Image assets
│   │   │   ├── icons/                  # App icons
│   │   │   ├── illustrations/          # Illustrations and graphics
│   │   │   └── backgrounds/            # Background images
│   │   ├── fonts/                      # Custom fonts (if any)
│   │   ├── animations/                 # Lottie and Rive animations
│   │   └── data/                       # Static data files
│   ├── android/                        # Android-specific configuration
│   │   ├── app/                        # Android app configuration
│   │   │   ├── src/main/               # Main Android source
│   │   │   │   ├── kotlin/             # Kotlin source files
│   │   │   │   └── res/                # Android resources
│   │   │   │       ├── values/         # Values (colors, strings)
│   │   │   │       ├── drawable/       # Drawable resources
│   │   │   │       └── layout/         # Layout files
│   │   │   └── build.gradle            # App-level Gradle configuration
│   │   ├── gradle/                     # Gradle wrapper
│   │   └── build.gradle                # Project-level Gradle configuration
│   ├── ios/                            # iOS-specific configuration
│   │   ├── Runner/                     # iOS app target
│   │   │   ├── Info.plist              # iOS app configuration
│   │   │   ├── AppDelegate.swift       # iOS app delegate
│   │   │   └── Assets.xcassets/        # iOS assets
│   │   ├── Runner.xcodeproj/           # Xcode project configuration
│   │   └── Podfile                     # CocoaPods dependencies
│   ├── fastlane/                       # Store deployment automation
│   │   ├── Fastfile                    # Fastlane configuration
│   │   ├── Appfile                     # App configuration
│   │   ├── Pluginfile                  # Fastlane plugins
│   │   └── metadata/                   # Store metadata
│   │       ├── ios/                    # iOS App Store metadata
│   │       └── android/                # Google Play metadata
│   ├── pubspec.yaml                    # Flutter dependencies
│   ├── pubspec.lock                    # Dependency lock file
│   ├── analysis_options.yaml           # Dart analysis configuration
│   └── .gitignore                      # Mobile-specific gitignore
│
├── backend/                            # FastAPI Backend Service
│   ├── app/                            # Main application package
│   │   ├── __init__.py
│   │   ├── main.py                     # FastAPI application entry point
│   │   ├── core/                       # Core configuration and utilities
│   │   │   ├── __init__.py
│   │   │   ├── config.py               # Application configuration
│   │   │   ├── security.py             # Security utilities and middleware
│   │   │   ├── database.py             # Database configuration and connection
│   │   │   ├── dependencies.py         # FastAPI dependency injection
│   │   │   ├── middleware.py           # Custom middleware
│   │   │   └── exceptions.py           # Custom exception handlers
│   │   ├── api/                        # API route definitions
│   │   │   ├── __init__.py
│   │   │   ├── deps.py                 # API dependencies
│   │   │   ├── v1/                     # API version 1
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth.py             # Authentication endpoints
│   │   │   │   ├── users.py            # User management endpoints
│   │   │   │   ├── nutrition.py        # Nutrition and meal planning endpoints
│   │   │   │   ├── fitness.py          # Fitness and workout endpoints
│   │   │   │   ├── tracking.py         # Health tracking endpoints
│   │   │   │   ├── analytics.py        # Analytics and insights endpoints
│   │   │   │   ├── ai.py               # AI chat and coaching endpoints
│   │   │   │   └── health.py           # Health check and monitoring endpoints
│   │   │   └── websockets/             # WebSocket endpoints
│   │   │       ├── __init__.py
│   │   │       └── chat.py             # AI chat WebSocket handler
│   │   ├── models/                     # SQLAlchemy database models
│   │   │   ├── __init__.py
│   │   │   ├── base.py                 # Base model class
│   │   │   ├── user.py                 # User and authentication models
│   │   │   │   ├── user.py
│   │   │   │   ├── profile.py
│   │   │   │   └── preferences.py
│   │   │   ├── nutrition.py            # Nutrition domain models
│   │   │   │   ├── meal_plan.py
│   │   │   │   ├── recipe.py
│   │   │   │   ├── food_item.py
│   │   │   │   └── nutrition_log.py
│   │   │   ├── fitness.py              # Fitness domain models
│   │   │   │   ├── workout_plan.py
│   │   │   │   ├── exercise.py
│   │   │   │   ├── workout_session.py
│   │   │   │   └── fitness_metrics.py
│   │   │   ├── tracking.py             # Health tracking models
│   │   │   │   ├── biometrics.py
│   │   │   │   ├── sleep_data.py
│   │   │   │   ├── activity_data.py
│   │   │   │   └── health_metrics.py
│   │   │   ├── ai.py                   # AI conversation models
│   │   │   │   ├── conversation.py
│   │   │   │   ├── message.py
│   │   │   │   └── tool_usage.py
│   │   │   └── analytics.py            # Analytics and reporting models
│   │   ├── schemas/                    # Pydantic schemas for API
│   │   │   ├── __init__.py
│   │   │   ├── base.py                 # Base schema classes
│   │   │   ├── user.py                 # User schemas
│   │   │   │   ├── user_create.py
│   │   │   │   ├── user_update.py
│   │   │   │   ├── user_response.py
│   │   │   │   └── login_request.py
│   │   │   ├── nutrition.py            # Nutrition schemas
│   │   │   │   ├── meal_plan_schemas.py
│   │   │   │   ├── recipe_schemas.py
│   │   │   │   └── nutrition_log_schemas.py
│   │   │   ├── fitness.py              # Fitness schemas
│   │   │   │   ├── workout_plan_schemas.py
│   │   │   │   ├── exercise_schemas.py
│   │   │   │   └── fitness_metrics_schemas.py
│   │   │   ├── tracking.py             # Tracking schemas
│   │   │   ├── ai.py                   # AI chat schemas
│   │   │   │   ├── chat_request.py
│   │   │   │   ├── chat_response.py
│   │   │   │   └── tool_schemas.py
│   │   │   └── analytics.py            # Analytics schemas
│   │   ├── services/                   # Business logic services
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                 # Authentication service
│   │   │   │   ├── oauth_service.py
│   │   │   │   ├── jwt_service.py
│   │   │   │   └── password_service.py
│   │   │   ├── user.py                 # User management service
│   │   │   ├── nutrition.py            # Nutrition algorithms and services
│   │   │   │   ├── tdee_calculator.py
│   │   │   │   ├── macro_calculator.py
│   │   │   │   ├── meal_planner.py
│   │   │   │   └── recipe_service.py
│   │   │   ├── fitness.py              # Fitness algorithms and services
│   │   │   │   ├── workout_planner.py
│   │   │   │   ├── progression_service.py
│   │   │   │   ├── heart_rate_service.py
│   │   │   │   └── recovery_service.py
│   │   │   ├── tracking.py             # Health tracking service
│   │   │   ├── analytics.py            # Analytics and insights service
│   │   │   │   ├── trend_analyzer.py
│   │   │   │   ├── goal_tracker.py
│   │   │   │   └── insight_generator.py
│   │   │   ├── notifications.py        # Notification service
│   │   │   └── ai/                     # AI services and tools
│   │   │       ├── __init__.py
│   │   │       ├── orchestrator.py     # Main AI orchestration service
│   │   │       ├── providers/          # AI provider implementations
│   │   │       │   ├── __init__.py
│   │   │       │   ├── base_provider.py # Abstract AI provider base
│   │   │       │   ├── openai_provider.py # OpenAI GPT integration
│   │   │       │   ├── anthropic_provider.py # Anthropic Claude integration
│   │   │       │   └── provider_router.py # Provider selection logic
│   │   │       ├── tools/              # AI tool function implementations
│   │   │       │   ├── __init__.py
│   │   │       │   ├── base_tool.py    # Abstract tool base class
│   │   │       │   ├── nutrition_tools.py # Nutrition planning tools
│   │   │       │   │   ├── meal_planning_tool.py
│   │   │       │   │   ├── grocery_list_tool.py
│   │   │       │   │   └── nutrition_analysis_tool.py
│   │   │       │   ├── fitness_tools.py # Fitness planning tools
│   │   │       │   │   ├── workout_planning_tool.py
│   │   │       │   │   ├── progression_tool.py
│   │   │       │   │   └── recovery_assessment_tool.py
│   │   │       │   ├── analytics_tools.py # Analytics and insights tools
│   │   │       │   │   ├── trend_analysis_tool.py
│   │   │       │   │   ├── goal_progress_tool.py
│   │   │       │   │   └── recommendation_tool.py
│   │   │       │   └── tool_registry.py # Tool registration and discovery
│   │   │       ├── safety.py           # AI safety policies and filters
│   │   │       │   ├── content_filter.py
│   │   │       │   ├── medical_disclaimer.py
│   │   │       │   └── privacy_protector.py
│   │   │       ├── streaming.py        # Streaming response handling
│   │   │       └── validation.py       # AI input/output validation
│   │   ├── utils/                      # Utility functions and helpers
│   │   │   ├── __init__.py
│   │   │   ├── encryption.py           # Data encryption utilities
│   │   │   ├── logging.py              # Logging configuration
│   │   │   ├── validators.py           # Input validation functions
│   │   │   ├── date_utils.py           # Date and time utilities
│   │   │   ├── health_calculations.py  # Health-related calculations
│   │   │   └── email.py                # Email sending utilities
│   │   └── tasks/                      # Background tasks
│   │       ├── __init__.py
│   │       ├── celery_app.py           # Celery configuration
│   │       ├── health_sync.py          # Health data synchronization tasks
│   │       ├── analytics_tasks.py      # Analytics computation tasks
│   │       └── notification_tasks.py   # Notification sending tasks
│   ├── tests/                          # Backend test suite
│   │   ├── __init__.py
│   │   ├── conftest.py                 # Test configuration and fixtures
│   │   ├── unit/                       # Unit tests
│   │   │   ├── __init__.py
│   │   │   ├── test_auth.py            # Authentication tests
│   │   │   ├── test_nutrition.py       # Nutrition service tests
│   │   │   ├── test_fitness.py         # Fitness service tests
│   │   │   ├── test_ai_tools.py        # AI tools tests
│   │   │   └── test_utils.py           # Utility function tests
│   │   ├── integration/                # Integration tests
│   │   │   ├── __init__.py
│   │   │   ├── test_api_auth.py        # API authentication tests
│   │   │   ├── test_api_nutrition.py   # Nutrition API tests
│   │   │   ├── test_api_fitness.py     # Fitness API tests
│   │   │   ├── test_api_ai.py          # AI API tests
│   │   │   └── test_websockets.py      # WebSocket tests
│   │   ├── e2e/                        # End-to-end tests
│   │   │   ├── __init__.py
│   │   │   ├── test_user_journey.py    # Complete user journey tests
│   │   │   └── test_ai_workflows.py    # AI workflow tests
│   │   ├── fixtures/                   # Test data fixtures
│   │   │   ├── __init__.py
│   │   │   ├── user_fixtures.py
│   │   │   ├── nutrition_fixtures.py
│   │   │   └── fitness_fixtures.py
│   │   └── mocks/                      # Mock implementations
│   │       ├── __init__.py
│   │       ├── mock_ai_providers.py
│   │       └── mock_external_apis.py
│   ├── alembic/                        # Database migrations
│   │   ├── env.py                      # Alembic environment configuration
│   │   ├── script.py.mako              # Migration script template
│   │   ├── alembic.ini                 # Alembic configuration
│   │   └── versions/                   # Migration version files
│   ├── scripts/                        # Utility scripts
│   │   ├── seed_data.py                # Database seeding script
│   │   ├── migrate.py                  # Migration utility
│   │   └── create_admin.py             # Admin user creation
│   ├── Dockerfile                      # Backend container definition
│   ├── requirements.txt                # Python dependencies
│   ├── requirements-dev.txt            # Development dependencies
│   ├── pyproject.toml                  # Python project configuration
│   ├── pytest.ini                     # Pytest configuration
│   ├── .env.example                    # Environment variables template
│   └── .gitignore                      # Backend-specific gitignore
│
├── design/                             # Design Assets and Tokens
│   ├── tokens/                         # Design tokens (JSON format)
│   │   ├── colors.json                 # Color palette and semantic colors
│   │   ├── typography.json             # Typography scales and fonts
│   │   ├── spacing.json                # Spacing scale and grid system
│   │   ├── components.json             # Component design specifications
│   │   ├── breakpoints.json            # Responsive breakpoints
│   │   └── shadows.json                # Shadow and elevation definitions
│   ├── mockups/                        # Interactive SVG mockups
│   │   ├── onboarding/                 # Onboarding flow mockups
│   │   │   ├── onboarding_sign_in.svg
│   │   │   ├── onboarding_biometrics.svg
│   │   │   ├── onboarding_lifestyle.svg
│   │   │   ├── onboarding_health_screening.svg
│   │   │   ├── onboarding_diet_prefs.svg
│   │   │   └── onboarding_goals.svg
│   │   ├── core/                       # Core app screens
│   │   │   ├── home_dashboard.svg
│   │   │   ├── mealplan_week.svg
│   │   │   ├── recipe_detail.svg
│   │   │   ├── meal_logging_search.svg
│   │   │   ├── analytics.svg
│   │   │   ├── chat.svg
│   │   │   └── fitness_calendar.svg
│   │   └── components/                 # Component mockups
│   ├── assets/                         # App icons and assets
│   │   ├── icons/                      # App icons (all sizes)
│   │   │   ├── ios/                    # iOS icon sizes
│   │   │   ├── android/                # Android icon sizes
│   │   │   └── web/                    # Web icon sizes
│   │   ├── splash/                     # Splash screen assets
│   │   │   ├── ios/                    # iOS splash screens
│   │   │   └── android/                # Android splash screens
│   │   └── store/                      # Store assets
│   │       ├── screenshots/            # App store screenshots
│   │       │   ├── ios/                # iOS screenshots
│   │       │   └── android/            # Android screenshots
│   │       ├── feature_graphics/       # Store feature graphics
│   │       └── promotional/            # Promotional materials
│   ├── guidelines/                     # Design guidelines documentation
│   │   ├── brand_guidelines.md         # Brand identity guidelines
│   │   ├── ui_guidelines.md            # UI design guidelines
│   │   ├── accessibility_guidelines.md # Accessibility requirements
│   │   └── platform_guidelines.md      # Platform-specific guidelines
│   └── tools/                          # Design tooling and scripts
│       ├── token_generator.py          # Design token generation scripts
│       ├── asset_optimizer.py          # Asset optimization scripts
│       └── screenshot_generator.py     # Automated screenshot generation
│
├── infra/                              # Infrastructure and Deployment
│   ├── docker/                         # Docker configurations
│   │   ├── docker-compose.yml          # Local development environment
│   │   ├── docker-compose.prod.yml     # Production configuration
│   │   ├── docker-compose.test.yml     # Testing environment
│   │   └── nginx/                      # Nginx configuration
│   │       ├── nginx.conf              # Main nginx configuration
│   │       └── ssl/                    # SSL certificate configuration
│   ├── kubernetes/                     # Kubernetes deployment manifests
│   │   ├── namespace.yaml              # Kubernetes namespace
│   │   ├── deployment.yaml             # Application deployment
│   │   ├── service.yaml                # Service definitions
│   │   ├── ingress.yaml                # Ingress configuration
│   │   └── configmap.yaml              # Configuration maps
│   ├── terraform/                      # Infrastructure as Code
│   │   ├── main.tf                     # Main terraform configuration
│   │   ├── variables.tf                # Variable definitions
│   │   ├── outputs.tf                  # Output definitions
│   │   ├── modules/                    # Terraform modules
│   │   │   ├── database/               # Database module
│   │   │   ├── cache/                  # Redis cache module
│   │   │   └── monitoring/             # Monitoring module
│   │   └── environments/               # Environment-specific configs
│   │       ├── development/
│   │       ├── staging/
│   │       └── production/
│   ├── scripts/                        # Deployment and utility scripts
│   │   ├── deploy.sh                   # Deployment script
│   │   ├── backup.sh                   # Database backup script
│   │   ├── restore.sh                  # Database restore script
│   │   ├── health_check.sh             # Health check script
│   │   └── monitoring_setup.sh         # Monitoring setup script
│   └── monitoring/                     # Monitoring and observability
│       ├── prometheus/                 # Prometheus configuration
│       │   ├── prometheus.yml
│       │   └── alert_rules.yml
│       ├── grafana/                    # Grafana dashboards
│       │   ├── dashboards/
│       │   └── provisioning/
│       └── logging/                    # Centralized logging configuration
│           ├── logstash.conf
│           └── filebeat.yml
│
├── docs/                               # Documentation
│   ├── api/                            # API documentation
│   │   ├── openapi.yml                 # OpenAPI specification
│   │   ├── authentication.md           # Authentication documentation
│   │   ├── nutrition_api.md            # Nutrition API documentation
│   │   ├── fitness_api.md              # Fitness API documentation
│   │   ├── ai_api.md                   # AI API documentation
│   │   └── webhooks.md                 # Webhook documentation
│   ├── mobile/                         # Mobile development documentation
│   │   ├── setup.md                    # Mobile setup guide
│   │   ├── architecture.md             # Mobile architecture documentation
│   │   ├── testing.md                  # Mobile testing guide
│   │   ├── build_and_release.md        # Build and release process
│   │   └── platform_integration.md     # Platform integration guide
│   ├── backend/                        # Backend development documentation
│   │   ├── setup.md                    # Backend setup guide
│   │   ├── architecture.md             # Backend architecture documentation
│   │   ├── database.md                 # Database schema and migration guide
│   │   ├── ai_integration.md           # AI integration documentation
│   │   └── deployment.md               # Deployment documentation
│   ├── deployment/                     # Deployment and operations documentation
│   │   ├── environments.md             # Environment setup guide
│   │   ├── ci_cd.md                    # CI/CD pipeline documentation
│   │   ├── monitoring.md               # Monitoring and alerting guide
│   │   ├── troubleshooting.md          # Troubleshooting guide
│   │   └── disaster_recovery.md        # Disaster recovery procedures
│   ├── privacy/                        # Privacy and compliance documentation
│   │   ├── privacy_policy.md           # Privacy policy
│   │   ├── terms_of_service.md         # Terms of service
│   │   ├── data_handling.md            # Data handling procedures
│   │   ├── gdpr_compliance.md          # GDPR compliance documentation
│   │   └── security_measures.md        # Security measures documentation
│   ├── user/                           # User-facing documentation
│   │   ├── user_guide.md               # User guide
│   │   ├── faq.md                      # Frequently asked questions
│   │   ├── troubleshooting.md          # User troubleshooting guide
│   │   └── accessibility.md            # Accessibility features guide
│   ├── contributing/                   # Contribution guidelines
│   │   ├── CONTRIBUTING.md             # Contribution guidelines
│   │   ├── code_of_conduct.md          # Code of conduct
│   │   ├── development_workflow.md     # Development workflow
│   │   └── pull_request_template.md    # PR template
│   └── design/                         # Design documentation
│       ├── design_system.md            # Design system documentation
│       ├── component_library.md        # Component library documentation
│       ├── accessibility_guide.md      # Accessibility design guide
│       └── brand_guidelines.md         # Brand guidelines
│
└── tools/                              # Development tools and utilities
    ├── scripts/                        # Development scripts
    │   ├── setup_dev_env.sh             # Development environment setup
    │   ├── run_tests.sh                 # Test runner script
    │   ├── lint_all.sh                  # Code linting script
    │   ├── format_code.sh               # Code formatting script
    │   └── generate_docs.sh             # Documentation generation
    ├── generators/                     # Code generators
    │   ├── feature_generator.py         # Feature scaffold generator
    │   ├── api_generator.py             # API endpoint generator
    │   └── test_generator.py            # Test scaffold generator
    ├── analyzers/                      # Code analysis tools
    │   ├── dependency_analyzer.py       # Dependency analysis
    │   ├── performance_analyzer.py      # Performance analysis
    │   └── security_analyzer.py         # Security analysis
    └── config/                         # Tool configurations
        ├── prettier.config.js           # Code formatting configuration
        ├── eslint.config.js             # Linting configuration
        ├── sonar-project.properties     # SonarQube configuration
        └── codecov.yml                  # Code coverage configuration
```

Key Policies

AI Model Routing (Level 1/2)
- Level 1 (health reports; report‑focused chat)
  - Always select the highest‑accuracy model; daily quota ladder: 100% → 98% → 97%… Never below Level 2 without consent.
  - Cache structured interpretations; reuse via RAG to reduce cost while maintaining fidelity.
- Level 2 (diet/fitness/recipes/general chat)
  - Choose the cheapest provider within 5% of the top accuracy; prefer open‑source/self‑hosted where feasible (Llama/Mistral/Qwen).
- All AI calls
  - DLP: redact/pseudonymize PII/PHI; enforce zero‑retention/no‑log modes where supported; record model, version, cost, quota state.

Security, Privacy, Compliance
- OWASP ASVS baseline; PII/PHI minimization; data classification; field‑level encryption targets.
- No secrets in code or clients; all via environment and Secrets Manager; rate limiting, WAF, bot protection.
- Export/delete flows; consent tracking; regional data residency controls; mTLS for internal/webhook paths where applicable.

Nutrition Accuracy & Provenance
- Data sources: USDA FDC; IFCT 2017 (license‑permitting); Open Food Facts; GI tables (licensed/approved).
- Cooking transforms: yield + nutrient retention factors by method.
- GI/GL: per‑serving computation; estimation models for unmapped items with documented assumptions and confidence scores.
- Provenance stored; periodic audits vs benchmarks.

Performance, Reliability, Observability, Cost
- p95 API < 2s; app launch < 3s; caching; background jobs; circuit breakers; retries with jitter; timeouts; graceful degradation.
- OpenTelemetry tracing; structured logs; metrics; SLO dashboards; synthetic checks; on‑call runbooks and DR tests.
- Model usage and cost dashboards; quota enforcement; cache hit ratios; provider mix optimization.

Quick Start (Local Development)

Prerequisites
- Node.js 20+, pnpm or npm; Docker Desktop
- PostgreSQL 15+, Redis 7+, S3‑compatible storage (e.g., MinIO) or cloud S3/GCS
- Xcode (iOS), Android Studio (Android)
- n8n (Docker) and AI provider accounts
- mkcert (optional, local TLS), direnv (optional)

Bootstrap
- Clone repository
- Copy environment templates:
  - services/backend/.env.example → .env
  - apps/mobile/ios/.env.example → .env
  - apps/mobile/android/.env.example → .env
  - n8n/.env.example → .env
- Start local stack:
  - docker compose -f infra/docker/docker-compose.yml up -d
  - pnpm -w install
  - pnpm -w run build
  - pnpm --filter services/backend dev

Backend (NestJS)
- Run: pnpm --filter services/backend dev
- Test: pnpm --filter services/backend test
- Lint: pnpm --filter services/backend lint
- Generate OpenAPI: pnpm --filter services/backend run openapi:export

iOS
- Open apps/mobile/ios in Xcode; select scheme and run.
- Tests: XCUITest target; snapshot tests under apps/mobile/ios/Tests.

Android
- Open apps/mobile/android in Android Studio.
- Tests: ./gradlew test connectedAndroidTest.

n8n
- Launch n8n via Docker; import JSON workflows from n8n/workflows.
- Configure webhooks with mTLS (where feasible) and secret tokens.
- Set provider keys and quotas via Secrets Manager/Environment.

Environment Configuration (examples)

services/backend/.env.example
```env
# Core
NODE_ENV=development
PORT=8080
API_BASE_URL=http://localhost:8080
APP_ORIGIN=http://localhost:3000

# Database
POSTGRES_URL=postgresql://user:password@localhost:5432/healthcoachai
REDIS_URL=redis://localhost:6379

# Object Storage
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=healthcoachai
S3_ACCESS_KEY=localdev
S3_SECRET_KEY=localdev
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true

# Vector Store
PGVECTOR_ENABLED=true

# Auth
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=1209600

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY_B64=

# AI Providers & Policy
AI_POLICY_LEVEL1_DAILY_TIERS=100,200,500
AI_POLICY_LEVEL2_ACCURACY_WINDOW=0.05
AI_VENDOR_LIST=openai,anthropic,vertex,openrouter,together
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_VERTEX_PROJECT=
GOOGLE_VERTEX_LOCATION=
OPENROUTER_API_KEY=
TOGETHER_API_KEY=
AI_ZERO_RETENTION=true

# OCR Providers
OCR_PRIMARY=documentai
GOOGLE_APPLICATION_CREDENTIALS_B64=
AWS_TEXTRACT_ACCESS_KEY_ID=
AWS_TEXTRACT_SECRET_ACCESS_KEY=
AWS_TEXTRACT_REGION=

# Integrations
FITBIT_CLIENT_ID=
FITBIT_CLIENT_SECRET=
WEATHER_PROVIDER=openweather
OPENWEATHER_API_KEY=

# Telemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
SENTRY_DSN=
```

apps/mobile/*/.env.example
```env
# Non-sensitive config; no secrets here
API_BASE_URL=http://localhost:8080
FEATURE_FLAGS=chat,photo_log_stub
ENV=development
```

Testing Strategy
- Engines: deterministic unit tests vs reference datasets; ≥85% coverage; ≥90% on critical paths by Phase 15.
- Integration: provider mocks, ETL jobs, OCR/NER parsers, AI router decisions.
- Mobile: UI snapshot tests; E2E flows (onboarding → plan → logging → analytics → chat).
- Performance: load/soak tests; cache effectiveness; p95/p99 latencies.
- Security: SAST/DAST; fuzz parsers (OCR text); auth abuse scenarios; DLP verification.

CI/CD
- GitHub Actions workflows (backend, mobile-ios, mobile-android, infra, security, release).
- Branch protection with required checks (lint, tests, coverage, security scans).
- Release pipelines for stores; crash reporting (privacy‑conscious); staged rollouts; rollback plans.

Runbooks
- Provider outage: switch to fallbacks; reduce Level 2 cost; increase cache TTLs; notify users with banners.
- Quota exhaustion (Level 1): step‑down tier; reuse cached interpretations; delay non‑critical report reprocessing; inform users.
- Incident response: triage, comms, mitigation, post‑mortem.

Business Use Cases Mapping (1–25)
- 1–5 Onboarding, profiles, preferences, goals → Phases 6, 8
- 6–12 Meal plan generation, sustainability, celebrity‑grade nutrition → Phases 3, 4, 12
- 13–15 Logging, analytics, weekly adaptive loop → Phases 9, 13
- 16 Accurate calculations, GI/GL, cooking transforms → Phase 3 (engines), Phase 12 (application)
- 17 Hinglish inputs → Phases 8, 9, 13
- 18 Domain‑scoped chat with RAG and update actions → Phase 13
- 19 Security/privacy guarantees → Phases 1, 2, 6, 14, 15
- 20 Wearables and push → Phase 14
- 21 AQI/Weather context → Phase 14
- 22 Burn target guidance → Phases 3, 12, 13 (compute + advice)
- 23 Fitness planning & monthly updates → Phases 5, 13
- 24 Scalability to 10M → Phases 2, 15
- 25 Fallbacks and AI cost/accuracy policy → Phases 10, 11, 12, 13, 15

AI APIs & Models (disclosure)
- Level 1 primary (region‑specific, no‑retention): GPT‑4.1, Claude Sonnet 4, Gemini 2.5 Pro
- Level 1 secondary (≈98–96% tiers): GPT‑4o (no‑retention), Claude Sonnet 3.7, Gemini 1.5 Pro
- Level 2 primary (cost‑effective high accuracy): Llama 3.1 70B (managed/self‑hosted), Mixtral 8x22B, Qwen2‑72B, GPT‑4o‑mini
- OCR: Google Document AI (primary), AWS Textract (fallback), self‑hosted Tesseract (last resort)
- Vector DB: Postgres + pgvector (preferred)
- Orchestrator: n8n

Migration Notes (from earlier README variants)
- Previous drafts used Flutter (mobile) and FastAPI (backend). This updated architecture follows the agreed SSOT and phases (native iOS/Android; NestJS backend; n8n orchestration; RAG; Level 1/2 policies).
- If parts of the repo still reflect Flutter/FastAPI, treat them as transitional. Create migration issues to:
  - Stand up native mobile app projects with shared design tokens and migrate feature flows.
  - Bootstrap NestJS backend with domain modules and ports to existing APIs where feasible.
  - Introduce n8n workflows for AI router and pipelines; move any “AI orchestration in code” into n8n where policy requires.
- Do not store secrets in mobile clients or repos. Update infra to use Secrets Manager and environment‑based configuration.

Contributing
- Conventional commits; PR template and CODEOWNERS apply.
- Any changes to PROMPT_README_COMBINED.md or APPLICATION_PHASES.md require synchronized updates and product/security/AI lead approvals.
- Ensure tests, lint, security scans pass before merge.

License
- MIT (see LICENSE)

Acknowledgments
- Built to clinical‑grade standards where applicable for nutrition/fitness logic, with strict privacy and safety policies.
