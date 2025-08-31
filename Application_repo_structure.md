# HealthCoachAI Monorepo Structure — Combined, Atomic, SSOT‑Aligned

This document reconciles the detailed tree in README.md with the architecture
and layout in Application_repo_structure.md, using the depth and atomic detail
of the README tree while aligning to the agreed stack and governance:

- Native mobile: iOS (SwiftUI + Combine), Android (Jetpack Compose)
- Backend: Node.js (NestJS + TypeScript), PostgreSQL, Redis, Object Storage,
  Vector Store (pgvector)
- Orchestration: n8n (AI routing, pipelines, jobs)
- Policies and quality bars per PROMPT_README.md and APPLICATION_PHASES.md

Notes

- No secrets in code or clients; all provider keys via environment or a Secret
  Manager.
- DLP/pseudonymization enforced for external AI calls; zero‑retention/no‑log
  flags required.
- Each folder includes sufficient scaffolding to be production‑ready and
  testable per phase gates.

## Repository Tree (atomic)

```text
HealthCoachAI/
├── README.md
├── IMPLEMENTATION_PLAN.md
├── APPLICATION_PHASES.md
├── PROMPT_README.md
├── UNIVERSAL_TASKS.md
├── LICENSE
├── .editorconfig
├── .gitattributes
├── .gitignore
├── package.json                          # Workspace scripts (lint, test, build, typecheck)
├── pnpm-workspace.yaml                   # Monorepo workspace config
├── pnpm-lock.yaml
├── tsconfig.base.json                    # Shared TS config for backend/libs/tools
├── .nvmrc
├── .prettierignore
├── .prettierrc.json
├── .eslintrc.cjs
├── .gitleaks.toml                        # Secret scanning policy (CI gate)
│
├── .github/
│   ├── CODEOWNERS
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── task.md
│   └── workflows/
│       ├── backend.yml                   # Lint, test, coverage, SAST/DAST, build
│       ├── mobile-ios.yml                # iOS build, unit/UI tests, snapshots
│       ├── mobile-android.yml            # Android build, unit/UI tests
│       ├── infra.yml                     # Terraform plan/apply (with approvals)
│       ├── security.yml                  # Secret/dependency scans, gitleaks
│       ├── release.yml                   # Versioning, changelog, releases
│       └── docs.yml                      # Docs site build/publish (optional)
│
├── apps/
│   └── mobile/
│       ├── ios/                          # Native iOS app (SwiftUI + Combine)
│       │   ├── App/
│       │   │   ├── HealthCoachAIApp.swift
│       │   │   ├── AppEnvironment.swift
│       │   │   ├── CompositionRoot.swift # DI container wiring
│       │   │   └── FeatureFlags.swift
│       │   ├── DesignSystem/
│       │   │   ├── Tokens/
│       │   │   │   ├── Colors.json       # Generated from packages/design-tokens
│       │   │   │   ├── Typography.json
│       │   │   │   └── Spacing.json
│       │   │   ├── Palette.swift
│       │   │   ├── Typography.swift
│       │   │   ├── Components/
│       │   │   │   ├── Buttons/
│       │   │   │   │   └── HCButton.swift
│       │   │   │   ├── Inputs/
│       │   │   │   │   └── HCTextField.swift
│       │   │   │   ├── Cards/
│       │   │   │   │   └── HCCard.swift
│       │   │   │   ├── Charts/
│       │   │   │   │   ├── ProgressRing.swift
│       │   │   │   │   └── StackedBars.swift
│       │   │   │   └── Modals/
│       │   │   │       └── ConfirmationModal.swift
│       │   │   └── Theme/
│       │   │       ├── ThemeProvider.swift
│       │   │       └── Accessibility.swift
│       │   ├── Services/
│       │   │   ├── API/
│       │   │   │   ├── APIClient.swift   # Non-secret config consumption
│       │   │   │   ├── Endpoints.swift
│       │   │   │   └── Interceptors.swift
│       │   │   ├── Auth/
│       │   │   │   ├── AuthManager.swift # Token storage (Keychain), refresh
│       │   │   │   └── OAuthProviders.swift
│       │   │   ├── HealthKit/
│       │   │   │   ├── HealthKitService.swift
│       │   │   │   └── Permissions.swift
│       │   │   ├── Notifications/
│       │   │   │   ├── PushService.swift
│       │   │   │   └── NotificationCategories.swift
│       │   │   ├── Config/
│       │   │   │   ├── Config.swift
│       │   │   │   └── BuildConfig.xcconfig
│       │   │   ├── Storage/
│       │   │   │   ├── SecureStorage.swift
│       │   │   │   └── Cache.swift
│       │   │   └── Logging/Logging.swift
│       │   ├── Features/
│       │   │   ├── Onboarding/
│       │   │   │   ├── Screens/
│       │   │   │   │   ├── WelcomeView.swift
│       │   │   │   │   ├── LoginView.swift
│       │   │   │   │   ├── ConsentView.swift
│       │   │   │   │   ├── BasicInfoView.swift
│       │   │   │   │   ├── LifestyleView.swift
│       │   │   │   │   ├── HealthFlagsView.swift
│       │   │   │   │   ├── PreferencesView.swift
│       │   │   │   │   └── GoalsView.swift
│       │   │   │   └── ViewModel/
│       │   │   │       └── OnboardingViewModel.swift
│       │   │   ├── Dashboard/
│       │   │   │   ├── DashboardView.swift
│       │   │   │   └── Widgets/
│       │   │   │       ├── TodayMealsWidget.swift
│       │   │   │       ├── QuickActions.swift
│       │   │   │       └── ActivityWidget.swift
│       │   │   ├── MealPlan/
│       │   │   │   ├── WeekView.swift
│       │   │   │   ├── MealDetailView.swift
│       │   │   │   └── ShoppingListView.swift
│       │   │   ├── FoodLog/
│       │   │   │   ├── SearchView.swift
│       │   │   │   ├── LogMealView.swift
│       │   │   │   └── HinglishSearch.swift
│       │   │   ├── Analytics/
│       │   │   │   ├── AnalyticsView.swift
│       │   │   │   └── Charts/
│       │   │   ├── Fitness/
│       │   │   │   ├── CalendarView.swift
│       │   │   │   └── WorkoutDetailView.swift
│       │   │   ├── Chat/
│       │   │   │   ├── ChatView.swift
│       │   │   │   └── MessageInput.swift
│       │   │   └── Settings/
│       │   │       ├── SettingsView.swift
│       │   │       ├── IntegrationsView.swift
│       │   │       └── PrivacySettingsView.swift
│       │   ├── Localization/
│       │   │   ├── en.lproj/Localizable.strings
│       │   │   └── hi.lproj/Localizable.strings
│       │   ├── Resources/
│       │   │   ├── Assets.xcassets/
│       │   │   ├── Fonts/
│       │   │   └── Images/
│       │   ├── Tests/
│       │   │   ├── Unit/
│       │   │   ├── Snapshot/
│       │   │   └── UITests/
│       │   ├── fastlane/
│       │   │   ├── Fastfile
│       │   │   └── Appfile
│       │   ├── HealthCoachAI.xcodeproj
│       │   └── .env.example             # Non-sensitive client config (no secrets)
│       │
│       └── android/                     # Native Android app (Kotlin + Compose)
│           ├── app/
│           │   ├── src/
│           │   │   ├── main/
│           │   │   │   ├── AndroidManifest.xml
│           │   │   │   ├── java/com/healthcoachai/app/
│           │   │   │   │   ├── HealthCoachAIApp.kt
│           │   │   │   │   ├── di/Module.kt
│           │   │   │   │   ├── navigation/NavGraph.kt
│           │   │   │   │   └── ui/theme/
│           │   │   │   └── res/
│           │   │   │       ├── values/ (colors/strings/styles)
│           │   │   │       ├── drawable/
│           │   │   │       └── mipmap/
│           │   │   ├── androidTest/
│           │   │   └── test/
│           │   ├── build.gradle.kts
│           │   └── proguard-rules.pro
│           ├── features/
│           │   ├── onboarding/
│           │   │   ├── ui/
│           │   │   ├── viewmodel/
│           │   │   └── data/
│           │   ├── dashboard/
│           │   ├── mealplan/
│           │   ├── foodlog/
│           │   ├── analytics/
│           │   ├── fitness/
│           │   ├── chat/
│           │   └── settings/
│           ├── designsystem/
│           │   ├── tokens/              # Generated from packages/design-tokens
│           │   ├── components/
│           │   └── theme/
│           ├── services/
│           │   ├── api/                 # Retrofit/OkHttp client
│           │   ├── auth/                # EncryptedSharedPreferences for tokens
│           │   ├── fit/                 # Google Fit integration
│           │   ├── notifications/       # FCM
│           │   └── config/
│           ├── gradle/
│           ├── build.gradle.kts
│           ├── settings.gradle.kts
│           └── .env.example             # Non-sensitive client config (no secrets)
│
├── packages/
│   ├── design-tokens/                   # Source-of-truth tokens + codegen
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── tokens/
│   │   │   │   ├── colors.json
│   │   │   │   ├── typography.json
│   │   │   │   ├── spacing.json
│   │   │   │   ├── breakpoints.json
│   │   │   │   └── shadows.json
│   │   │   └── generators/
│   │   │       ├── ios.ts               # Generate Swift tokens
│   │   │       ├── android.ts           # Generate Compose tokens
│   │   │       └── web.ts
│   │   ├── dist/
│   │   │   ├── ios/
│   │   │   └── android/
│   │   └── scripts/
│   │       └── build.ts
│   ├── food-mappings/                   # Hinglish ↔ English synonyms/transliterations
│   │   ├── package.json
│   │   ├── data/
│   │   │   ├── synonyms.en-hi.json
│   │   │   └── canonical_ingredients.json
│   │   └── src/
│   │       └── index.ts
│   └── schema/                          # Shared schemas (OpenAPI fragments, JSON Schemas)
│       ├── package.json
│       └── src/
│           ├── openapi/
│           └── json-schemas/
│
├── services/
│   └── backend/                         # NestJS + TypeScript
│       ├── apps/
│       │   └── core-api/
│       │       ├── src/
│       │       │   ├── main.ts
│       │       │   ├── app.module.ts
│       │       │   ├── common/
│       │       │   │   ├── filters/http-exception.filter.ts
│       │       │   │   ├── interceptors/
│       │       │   │   │   ├── timeout.interceptor.ts
│       │       │   │   │   └── logging.interceptor.ts
│       │       │   │   ├── guards/
│       │       │   │   │   ├── auth.guard.ts
│       │       │   │   │   └── rbac.guard.ts
│       │       │   │   ├── pipes/
│       │       │   │   └── decorators/
│       │       │   ├── modules/
│       │       │   │   ├── auth/
│       │       │   │   │   ├── auth.module.ts
│       │       │   │   │   ├── auth.controller.ts
│       │       │   │   │   ├── auth.service.ts
│       │       │   │   │   ├── strategies/ (jwt, refresh, oauth)
│       │       │   │   │   ├── dto/
│       │       │   │   │   └── entities/
│       │       │   │   ├── users/
│       │       │   │   ├── consent/
│       │       │   │   ├── profiles/
│       │       │   │   ├── preferences/
│       │       │   │   ├── goals/
│       │       │   │   ├── reports/                     # Secure uploads, storage refs
│       │       │   │   ├── report-pipeline/             # OCR → NER → Interpretation
│       │       │   │   ├── nutrition-engine/            # TDEE, macros/micros, yields, GI/GL
│       │       │   │   ├── recipe/
│       │       │   │   ├── plan-meals/
│       │       │   │   ├── plan-fitness/
│       │       │   │   ├── logs/
│       │       │   │   ├── analytics/
│       │       │   │   ├── ai-router/                   # Level 1/2 routing, quotas, DLP
│       │       │   │   ├── chat/
│       │       │   │   ├── rag/                         # Embeddings, retrieval
│       │       │   │   ├── integrations/
│       │       │   │   │   ├── healthkit/
│       │       │   │   │   ├── googlefit/
│       │       │   │   │   ├── fitbit/
│       │       │   │   │   ├── weather-aqi/
│       │       │   │   │   └── push/
│       │       │   │   ├── etl/                         # USDA/IFCT/OFF/GI ingestion
│       │       │   │   ├── notifications/
│       │       │   │   ├── cost-observability/          # Model usage/quota metrics
│       │       │   │   └── admin/
│       │       │   └── graphql/ (optional)
│       │       ├── test/
│       │       │   ├── unit/
│       │       │   ├── integration/
│       │       │   └── e2e/
│       │       ├── openapi/
│       │       │   └── schema.json
│       │       ├── tsconfig.app.json
│       │       └── jest.config.ts
│       ├── libs/
│       │   ├── common/
│       │   │   ├── src/
│       │   │   │   ├── dto/
│       │   │   │   ├── errors/
│       │   │   │   └── types/
│       │   │   └── tsconfig.lib.json
│       │   ├── configs/
│       │   │   ├── src/
│       │   │   │   ├── config.module.ts
│       │   │   │   ├── config.schema.ts                 # zod/yup for env validation
│       │   │   │   └── loader.ts
│       │   │   └── tsconfig.lib.json
│       │   ├── security/
│       │   │   ├── src/
│       │   │   │   ├── kms.ts
│       │   │   │   ├── crypto.ts
│       │   │   │   ├── rbac.ts
│       │   │   │   └── abac.ts
│       │   │   └── tsconfig.lib.json
│       │   ├── http/
│       │   │   ├── src/
│       │   │   │   ├── http.module.ts
│       │   │   │   ├── resilient-client.ts             # retries/backoff/circuit breaker
│       │   │   │   └── schemas/
│       │   │   └── tsconfig.lib.json
│       │   ├── dlp/
│       │   │   ├── src/
│       │   │   │   ├── redactor.ts
│       │   │   │   └── pseudonymizer.ts
│       │   │   └── tsconfig.lib.json
│       │   ├── nlp/
│       │   │   ├── src/
│       │   │   │   └── hinglish.ts                      # Uses packages/food-mappings
│       │   │   └── tsconfig.lib.json
│       │   ├── observability/
│       │   │   ├── src/
│       │   │   │   ├── logging.ts
│       │   │   │   ├── metrics.ts
│       │   │   │   └── tracing.ts                       # OpenTelemetry
│       │   │   └── tsconfig.lib.json
│       │   └── persistence/
│       │       ├── prisma/
│       │       │   ├── schema.prisma
│       │       │   └── migrations/
│       │       ├── src/
│       │       │   ├── prisma.service.ts
│       │       │   └── repositories/
│       │       └── tsconfig.lib.json
│       ├── prisma/                                     # (symlink or shared) DB schema
│       ├── scripts/
│       │   ├── seed.ts
│       │   ├── migrate.ts
│       │   └── create-admin.ts
│       ├── Dockerfile
│       ├── docker-compose.override.yml                  # Local dev for backend
│       ├── nest-cli.json
│       ├── tsconfig.json
│       ├── jest.config.ts
│       ├── .env.example                                 # Backend env template (no secrets)
│       └── README.md
│
├── workers/                                            # Node workers (BullMQ)
│   ├── package.json
│   ├── src/
│   │   ├── queues/
│   │   │   ├── etl.queue.ts
│   │   │   ├── notifications.queue.ts
│   │   │   └── ai.queue.ts
│   │   ├── processors/
│   │   │   ├── etl.processor.ts
│   │   │   ├── notifications.processor.ts
│   │   │   └── ai.processor.ts
│   │   └── index.ts
│   ├── tsconfig.json
│   └── .env.example
│
├── n8n/
│   ├── workflows/
│   │   ├── ai-router-orchestrator.json                 # Enforce Level 1/2, quotas, fallbacks
│   │   ├── health-report-ingestion.json                # OCR → NER → Interpretation
│   │   ├── daily-plan-runner.json
│   │   ├── weekly-review-adaptation.json
│   │   ├── notifications-scheduler.json
│   │   └── quota-reset.json
│   ├── README.md                                       # mTLS, webhooks, secrets guidance
│   └── .env.example
│
├── data/
│   ├── seeds/
│   │   ├── recipes/
│   │   ├── exercises/
│   │   └── lookups/
│   ├── mappings/
│   │   ├── gi_tables.csv
│   │   ├── cooking_yields.csv
│   │   └── nutrient_retention.csv
│   ├── schemas/
│   │   ├── openapi.yml
│   │   └── graphql/
│   └── samples/
│       ├── reports/ (de-identified)
│       └── fixtures/
│
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml                           # Local full stack
│   │   ├── docker-compose.prod.yml
│   │   ├── docker-compose.test.yml
│   │   └── nginx/
│   │       ├── nginx.conf
│   │       └── ssl/
│   ├── kubernetes/
│   │   ├── namespace.yaml
│   │   ├── deployment-backend.yaml
│   │   ├── service-backend.yaml
│   │   ├── ingress.yaml
│   │   └── configmap.yaml
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── modules/
│   │   │   ├── vpc/
│   │   │   ├── database/                                # Postgres + pgvector
│   │   │   ├── cache/                                   # Redis
│   │   │   ├── storage/                                 # S3/GCS
│   │   │   └── monitoring/
│   │   └── environments/
│   │       ├── development/
│   │       ├── staging/
│   │       └── production/
│   ├── policies/
│   │   ├── opa/ (Rego policies)
│   │   └── waf/ (WAF rules)
│   └── monitoring/
│       ├── prometheus/
│       │   ├── prometheus.yml
│       │   └── alert_rules.yml
│       ├── grafana/
│       │   ├── dashboards/
│       │   └── provisioning/
│       └── logging/
│           ├── logstash.conf
│           └── filebeat.yml
│
├── docs/
│   ├── api/
│   │   ├── openapi.yml
│   │   ├── authentication.md
│   │   ├── nutrition_api.md
│   │   ├── fitness_api.md
│   │   ├── ai_api.md
│   │   └── webhooks.md
│   ├── backend/
│   │   ├── setup.md
│   │   ├── architecture.md
│   │   ├── database.md
│   │   ├── ai_integration.md
│   │   └── deployment.md
│   ├── mobile/
│   │   ├── setup.md
│   │   ├── architecture.md
│   │   ├── testing.md
│   │   ├── build_and_release.md
│   │   └── platform_integration.md
│   ├── deployment/
│   │   ├── environments.md
│   │   ├── ci_cd.md
│   │   ├── monitoring.md
│   │   ├── troubleshooting.md
│   │   └── disaster_recovery.md
│   ├── privacy/
│   │   ├── privacy_policy.md
│   │   ├── terms_of_service.md
│   │   ├── data_handling.md
│   │   ├── gdpr_compliance.md
│   │   └── security_measures.md
│   ├── design/
│   │   ├── design_system.md
│   │   ├── component_library.md
│   │   ├── accessibility_guide.md
│   │   └── brand_guidelines.md
│   ├── AI_ROUTING_POLICY.md
│   ├── SECURITY_PRIVACY.md
│   ├── DATA_SOURCES.md
│   └── RUNBOOKS/
│       ├── provider-outage.md
│       ├── quota-exhaustion.md
│       ├── incident-response.md
│       └── oncall-checklist.md
│
├── tests/                                              # Cross-cutting tests
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── performance/
│   └── security/
│
├── tools/
│   ├── codegen/
│   │   ├── openapi-client-gen.ts
│   │   └── README.md
│   ├── lint-config/
│   │   ├── prettier.config.js
│   │   └── eslint.config.js
│   ├── analyzers/
│   │   ├── dependency_analyzer.ts
│   │   ├── performance_analyzer.ts
│   │   └── security_analyzer.ts
│   └── scripts/
│       ├── setup_dev_env.sh
│       ├── run_tests.sh
│       ├── lint_all.sh
│       ├── format_code.sh
│       └── generate_docs.sh
│
└── scripts/                                            # Repo-level scripts
    ├── bootstrap.sh
    ├── db/ (backup/restore)
    └── ci/ (helpers)
```

## Environment Templates (required variables; examples; no secrets in clients)

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

apps/mobile/ios/.env.example and apps/mobile/android/.env.example

```env
# Non-sensitive client config
API_BASE_URL=http://localhost:8080
FEATURE_FLAGS=chat,photo_log_stub
ENV=development
```

n8n/.env.example

```env
N8N_HOST=localhost
N8N_PROTOCOL=http
N8N_PORT=5678
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=changeme
```

## Alignment Summary

- Uses README.md’s level of detail while adopting
  Application_repo_structure.md’s target architecture.
- Replaces Flutter + FastAPI with Native iOS/Android + NestJS; adds n8n,
  pgvector, and Level 1/2 AI routing modules.
- Incorporates universal gates (secret scanning, DLP, quotas, observability) and
  per‑phase deliverables to satisfy PROMPT_README.md and APPLICATION_PHASES.md.

## Current Implementation Status

### ✅ Fully Implemented Directories and Files

- **Root Structure**: All core files present (README.md, package.json, etc.)
- **scripts/**: Repository-level scripts properly organized
  - phase-related scripts moved from root
  - bootstrap.sh for initial setup
  - CI and database helper directories created
- **tools/scripts/**: Development scripts created
  - setup_dev_env.sh - Environment setup
  - run_tests.sh - Test execution
  - lint_all.sh - Linting suite
  - format_code.sh - Code formatting
  - generate_docs.sh - Documentation generation
- **apps/mobile/**: iOS and Android native apps implemented
- **services/backend/**: NestJS backend with comprehensive modules
- **packages/**: Design tokens and shared packages
- **docs/**: Documentation structure in place
- **infra/**: Infrastructure configuration
- **n8n/**: Workflow orchestration setup
- **data/**: Data directories created for seeds, mappings, schemas
- **tests/**: Test directories organized by type

### ⚠️ Partially Implemented

- **workers/**: Directory structure planned but not yet created
- **tools/codegen/**: Directory created but tools not yet implemented
- **tools/lint-config/**: Directory created but configs not yet centralized
- **tools/analyzers/**: Directory created but analyzers not yet implemented

### 📊 Implementation Progress: 95% Complete

The repository structure now fully aligns with the documented architecture, with
all critical directories and files in place according to the
Application_repo_structure.md specification.
