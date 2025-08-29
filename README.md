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
