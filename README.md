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

## Detailed Repository Structure

This repository follows a comprehensive monorepo structure designed to support all aspects of the HealthAICoach application development, from mobile and backend code to design assets, infrastructure, and documentation.

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

### Repository Structure Features

**🏗️ Monorepo Benefits**
- Unified versioning and dependency management
- Shared design tokens and components
- Coordinated releases across mobile and backend
- Simplified CI/CD with cross-project integration

**📱 Mobile Architecture**
- Feature-based modular structure with clean architecture
- Shared components and design system
- Platform-specific implementations (iOS/Android)
- Comprehensive testing at all levels

**🚀 Backend Architecture**
- Domain-driven design with clear separation of concerns
- AI service architecture with multiple provider support
- Comprehensive API with real-time capabilities
- Production-ready infrastructure and monitoring

**🎨 Design System**
- Token-based design system with JSON configuration
- Responsive design with accessibility compliance
- Platform-specific assets and store readiness
- Comprehensive design documentation

**🔧 Development Tools**
- Automated code generation and scaffolding
- Code quality enforcement with linting and formatting
- Performance and security analysis tools
- Comprehensive development environment setup

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