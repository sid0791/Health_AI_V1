# HealthAICoach Application Development Phases

This document outlines the detailed development phases for the HealthAICoach application, breaking down the implementation into manageable, self-sufficient components that deliver functional value at each stage.

## Phase Overview

Each phase is designed to be:
- **Self-sufficient**: Delivers working functionality that can be tested and validated
- **Incremental**: Builds upon previous phases without breaking existing functionality
- **Testable**: Includes comprehensive testing to ensure quality and reliability
- **Production-ready**: Follows best practices for security, performance, and maintainability

---
Authoritative, phase-by-phase execution plan for HealthCoachAI. This file MUST remain fully aligned with PROMPT_README_COMBINED.md and governs scope, sequencing, quality bars, and acceptance gates for all code and documentation in this repository.

Guiding principles
- Build an end-to-end, production-ready, launch-ready application (native iOS + Android; optional web if added) with real backend, AI, data, security, infra, and CI/CD.
- No placeholders, stubs, or demo code. Only complete, tested, shippable features.
- Use n8n for AI orchestration, quotas, fallbacks, and scheduled jobs.
- Accuracy/Cost Policy: Level 1 (health reports) = always highest accuracy with daily step-down quota; Level 2 (diet/fitness/recipes) = cheapest provider within 5% of top accuracy.
- Security, privacy, performance, accessibility, and scalability are non-negotiable.
- India-first UX and data sources; globally scalable to 10M+ users.

Phase list (max 16)
1.Documentation & Planning
2. Program Setup & Governance
3. Core Backend Architecture & Data Modeling
4. Nutrition & Calculation Engines
5. Recipe Corpus & Personalization Rules
6. Fitness Engine & Workout Library
7. Authentication, Consent & Privacy Baseline
8. Mobile Apps Foundation & Design System
9. Onboarding & Data Capture Flows
10. Meal/Fitness Plan UI, Logging & Analytics Shell
11. AI Core Integration, Router & n8n Orchestration
12. Health Report Pipeline (OCR → NER → Interpretation)
13. AI Meal Planning & Celebrity-Style Recipes (with GI/GL & cooking transforms)
14. AI Fitness Planning, Weekly Adaptation & Domain-Scoped Chat with RAG
15. Integrations: HealthKit/Google Fit/Fitbit, AQI/Weather, Push Notifications
16. Performance/Security Hardening, Observability, Cost Controls, QA (SIT/UAT), Compliance & Launch
17. Documentation and Planneing


## Phase 0: Documentation and Planning ✅ COMPLETE

**Duration**: 1 day
**Status**: ✅ Complete
**Objective**: Establish project foundation with comprehensive documentation and planning

### Deliverables Completed:
-  **Implementation Plan** 
  - Complete technical architecture overview
  - Monorepo structure definition
  - Technology stack specifications
  - Quality standards and metrics

- **Repository Documentation** 
  - Detailed Monorepo structure documented in tree format
  - Architecture documentation

-  **Universal Tasks** (`UNIVERSAL_TASKS.md`)
  - Task breakdown for all phases
  - Checklist format for tracking
  - Dependencies and sequencing

### Success Criteria Met:
- ✅ Complete project documentation created
- ✅ Development phases clearly defined
- ✅ Repository structure established
- ✅ Task breakdown available for all phases

----------------------------------------------------------------------
Phase 1 — Program Setup & Governance
----------------------------------------------------------------------

Objectives
- Establish single source of truth alignment to PROMPT_README_COMBINED.md, delivery governance, repo standards, and design tokens to ensure consistency across teams.

Scope & Key Deliverables
- Repository structure (modular, domain-driven), coding standards, lint/format rules, conventional commits.
- Documentation baseline: architecture overview, security overview, contribution guide.
- Design tokens (colors, typography, spacing) per brand spec; UI asset pipeline.
- Secrets management policy (Cloud Secrets Manager), environment naming, and access controls.
- Initial CI scaffolding (lint/test runners), issue templates, PR templates, CODEOWNERS.

n8n
- Provision n8n instance (self-hosted), secure access, secret store, and base webhooks.

Acceptance Criteria
- Repo bootstrapped; pipelines green; documented governance and tokens published.

Exit Criteria
- All teams commit to standards; design tokens available in mobile projects as packages/assets.

----------------------------------------------------------------------
Phase 2 — Core Backend Architecture & Data Modeling
----------------------------------------------------------------------

Objectives
- Deliver a secure, scalable backend foundation with core domains and storage layers.

Scope & Key Deliverables
- Backend stack: Node.js (NestJS + TypeScript) or Kotlin (Spring Boot) with layered/domain-driven architecture.
- Data: PostgreSQL (primary), Redis (cache), Object storage (S3/GCS), Vector store (pgvector/OpenSearch).
- Domains & schemas with migrations:
  - Users, Identities, Consents; Profiles (basic, lifestyle, health flags); Preferences (dietary, cuisines, allergies); Goals.
  - Health Reports (upload metadata, storage refs); Structured Entities tables (labs, biomarkers).
  - Recipes (ingredients, steps, tags, per-serving nutrition, GI/GL).
  - MealPlan (7-day), FitnessPlan (monthly→weekly).
  - Logs (MealLogs with Hinglish fields, Activity, Weight/Measurements).
  - Analytics (deficiency summaries, ETA predictions), Notifications/Nudges configs.
  - AI Decisions (routing logs, model versions, provenance).
- API foundations: versioning, pagination, idempotency keys, caching headers.
- Security baselines: TLS, AES-256 at rest via KMS, RBAC/ABAC, audit logging, PII minimization.
- Observability scaffolding: structured logging, request tracing hooks.

Acceptance Criteria
- Schemas migrated, indexed; CRUD APIs for all core entities; integration tests passing.
- No secrets in code; PII-safe logs; base SLOs defined.

Exit Criteria
- Backend can store and serve core domain data reliably with tests.

----------------------------------------------------------------------
Phase 3 — Nutrition & Calculation Engines
----------------------------------------------------------------------

Objectives
- Implement accurate nutrition math: TDEE, macros/micros, cooking transformations, GI/GL.

Scope & Key Deliverables
- TDEE (Mifflin–St Jeor, options for activity multipliers); safe deficit/surplus bands.
- Macro target calculators per goal (loss/gain/maintenance, muscle gain).
- Micronutrient baselines by age/sex/lifecycle; deficiency flags.
- Cooking transformations: USDA yield and nutrient retention factors by method (boil, pressure cook, sauté, fry, bake, air-fry).
- GI/GL:
  - GI ingestion from trusted tables (licensing respected).
  - GL computation per portion; estimation model for unmapped foods using carb composition, fiber, food form, resistant starch, meal composition.
- Unit-tested service modules; precision validated on sample datasets.

Data Ingestion (ETL)
- USDA FoodData Central (open API).
- IFCT 2017 (where license permits) for Indian foods.
- Open Food Facts for packaged items.
- GI tables (University of Sydney or permitted sources).

Acceptance Criteria
- Engines reach target precision vs references; ≥85% coverage for engine modules.
- Service APIs expose nutrient and GI/GL computations per ingredient/recipe/meal.

Exit Criteria
- Backend can compute accurate nutrition and GI/GL for arbitrary meals using ingested data.

----------------------------------------------------------------------
Phase 4 — Recipe Corpus & Personalization Rules
----------------------------------------------------------------------

Objectives
- Build a rich, tagged recipe corpus with personalization constraints and cultural breadth.

Scope & Key Deliverables
- Recipe schema completed: ingredients (quantities, units), steps, prep time, difficulty, tags (dietary, cuisine, occasion, health-safe flags).
- Corpus seeding: curated healthy recipes across Indian-first cuisines and global favorites.
- Personalization rules:
  - Diet types (veg/vegan/non-veg/jain/halal).
  - Allergies/intolerances; ingredient exclusions (e.g., pork, beef).
  - Health conditions constraints (PCOS, diabetes, hypertension, fatty liver, sleep concerns, libido); hair/skin/mood group (grey hair, hair loss, dandruff/itchy scalp, dry skin, depression).
  - Craving-killer variants and controlled “guilty pleasures.”
- Nutrient computation for each recipe using Phase 3 engines; GI/GL per serving.

Acceptance Criteria
- Queries support filtering by diet/cuisine/health constraints; nutritional metadata present and correct.
- At least N curated recipes per major cuisine and diet type (N defined by product).

Exit Criteria
- A diverse, queryable recipe base with computed nutrition and rules for personalization.

----------------------------------------------------------------------
Phase 5 — Fitness Engine & Workout Library
----------------------------------------------------------------------

Objectives
- Create fitness planning foundation with safe, periodized programming.

Scope & Key Deliverables
- Exercise library: movements with categories (resistance/calisthenics/yoga), equipment, difficulty, contraindications, and video references.
- Plan generator:
  - Monthly → weekly plans; progressive overload; deload logic; rest/recovery integration.
  - Adjust to user experience level, equipment, time availability, goals.
- Safety: per-exercise safety notes and red flags; movement substitutions.

Acceptance Criteria
- Generator produces coherent monthly plans; validators enforce safe volume/progression caps.
- Workouts render consistently via APIs with instructions/video links.

Exit Criteria
- Backend can produce fitness plans ready for UI consumption.

----------------------------------------------------------------------
Phase 6 — Authentication, Consent & Privacy Baseline
----------------------------------------------------------------------

Objectives
- Implement secure auth, consent, and privacy primitives across apps and backend.

Scope & Key Deliverables
- Auth: Phone OTP, OAuth (Apple, Google, Facebook), JWT access + refresh rotation, device binding.
- Consent and privacy screens; data export/delete endpoints; consent records in DB.
- RBAC/ABAC scaffolding; secure file uploads for health reports (no OCR yet).
- DLP hooks and payload pseudonymization utilities (for later AI calls).

Acceptance Criteria
- End-to-end login flows pass; tokens secure; consent captured; security tests green.

Exit Criteria
- Users can sign in/up securely; privacy controls available.

----------------------------------------------------------------------
Phase 7 — Mobile Apps Foundation & Design System
----------------------------------------------------------------------

Objectives
- Stand up native applications with design system and baseline navigation.

Scope & Key Deliverables
- iOS (SwiftUI + Combine), Android (Kotlin + Jetpack Compose).
- Design system: color tokens, typography (Inter/Poppins), components (cards, chips, sliders, charts, toggles, modals).
- Navigation shells: tab bars/stacks for Dashboard, Meal Plan, Log, Fitness, Settings.
- Accessibility baseline (WCAG 2.1 AA), large targets (≥44px), dynamic type, dark/light mode.

Acceptance Criteria
- Apps render core components at 60fps targets; automated UI snapshot tests for components.

Exit Criteria
- Foundation ready to integrate feature flows.

----------------------------------------------------------------------
Phase 8 — Onboarding & Data Capture Flows
----------------------------------------------------------------------

Objectives
- Deliver guided onboarding wizard with conversational UX and skip paths.

Scope & Key Deliverables
- Screens:
  - Animated splash; login (OTP + social); consent.
  - Basic info (name, age, sex, height, weight, body structure, body measurements).
  - Advanced lifestyle (smoking slider, alcohol frequency, sleep picker, job activity, eating out).
  - Health tab (PCOS, diabetes, hypertension, BP/sugar flags, fatty liver, deficiencies); health report upload.
  - Food preferences (veg/non-veg/vegan/jain/halal), cuisines; cravings chips (chai, ice cream, cold drinks).
  - Goals: weight loss/gain/maintain, muscle gain; advanced health and lifestyle goals (sleep improvement, reduce smoking/alcohol).
- Hinglish-tolerant inputs where relevant.
- Progress bar, conversational cards, skip/modify options.

Acceptance Criteria
- Data persists via backend APIs; error states and retries covered; analytics events tracked (privacy-safe).

Exit Criteria
- Users complete onboarding and land on a personalized dashboard scaffold.

----------------------------------------------------------------------
Phase 9 — Meal/Fitness Plan UI, Logging & Analytics Shell
----------------------------------------------------------------------

Objectives
- Provide plan browsing, logging, and analytics visualizations connected to backend.

Scope & Key Deliverables
- Home Dashboard:
  - Greeting; Today’s Meals; Quick Actions (Log meal, Update weight, Chat); Activity widget; Nudge snippet.
- 7-Day Meal Plan:
  - Day tabs; meal cards with macro bars, swap button; detail screen with image, prep time, difficulty, ingredients, steps, nutrition table; “Add to shopping list.”
- Meal Logging (Food Diary):
  - Search with English + Hinglish (chawal/rice, chai/tea); autocomplete; quantity chips (½, 1×, 2×); photo capture ready (ML in Phase 12/13).
  - Live totals updating rings/bars.
- Analytics & Progress (shell):
  - Weight trend line; macro split (stacked bars); micro deficiencies; goal ETA placeholder.
- Fitness Plan UI:
  - Monthly → weekly blocks; workout details with instructions, safety, video links.

Acceptance Criteria
- Offline caching of recent plans/logs; graceful sync; performance budgets met.
- Charts render accurate data from backend endpoints.

Exit Criteria
- Full user journey functional pre-AI: users can view plans, log meals, and see analytics shells.

----------------------------------------------------------------------
Phase 10 — AI Core Integration, Router & n8n Orchestration
----------------------------------------------------------------------

Objectives
- Implement AI routing per Level 1/2 policies, payload anonymization, and orchestrated workflows.

Scope & Key Deliverables
- AI Router Service:
  - Level 1 vs Level 2 selection; HEALTH_L1_DAILY_QUOTA; step-down ladder 100% → 98% → 97% …; never below Level 2 without consent.
  - Cost-aware model choice for Level 2 (cheapest within 5% accuracy of top).
  - Provider config via env; model/version logging; response caching; retries/backoffs.
- DLP/Pseudonymization:
  - Strip PII, replace identifiers with pseudonyms; zero-retention flags set on providers.
- n8n workflows:
  - Router callable via webhook; daily quota reset job; error handling; provider failover logic; audit logs.

Acceptance Criteria
- Routing and quota logic unit/integration tested; anonymization verified; logs show model selection and costs.

Exit Criteria
- System can reliably dispatch AI tasks with policy enforcement and fallbacks.

----------------------------------------------------------------------
Phase 11 — Health Report Pipeline (OCR → NER → Interpretation) [Level 1]
----------------------------------------------------------------------

Objectives
- Deliver medical-grade, high-accuracy report processing with strict privacy.

Scope & Key Deliverables
- OCR/Document Understanding:
  - Primary highest-accuracy provider (e.g., Google Document AI/Azure DI); fallbacks: AWS Textract, self-hosted Tesseract.
  - PDFs/images; table/section extraction; locale-aware.
- Entity Extraction & Normalization:
  - Biomarkers (lipids, HbA1c, fasting glucose, TSH, LFT, CBC, vitamins/minerals, etc.); units normalization; reference ranges by age/sex.
- Interpretation:
  - Flag anomalies; trend analysis; plain-language summaries; physician red-flag modal triggers.
- Storage & Reuse:
  - Store structured interpretations for reuse by Level 2 tasks (diet/fitness/chat).
- Privacy:
  - Encrypted storage; no raw image logging; anonymized AI calls; zero retention modes.

Acceptance Criteria
- E2E: upload → structured entities → interpretation; accuracy validated on a test set; quota step-down works.
- Data wired to influence plans (Phase 12/13) and chat.

Exit Criteria
- Reliable Level 1 pipeline in production-grade quality.

----------------------------------------------------------------------
Phase 12 — AI Meal Planning & Celebrity-Style Recipes (with GI/GL & cooking transforms)
----------------------------------------------------------------------

Objectives
- Produce personalized, sustainable 7-day plans and innovative healthy recipes, accurately computed.

Scope & Key Deliverables
- AI Meal Planning:
  - Inputs: user profile/preferences, lifestyle, health conditions, goals, cravings, cuisines; wearable activity (if available).
  - Constraints: safe deficits/surpluses; macro/micro completeness; GI/GL-aware; cultural appropriateness; controlled “guilty pleasures”; weekend restaurant-style treats.
- Celebrity Chef–Level Recipes:
  - Generate innovative healthy twists (e.g., protein ice cream with dates/makhana/almonds; low-calorie high-protein burgers).
  - Ingredient availability checks; per-serving nutrition using Phase 3 engines; GI/GL computed; cooking transforms applied.
- Accuracy:
  - Use official DBs; research or estimate with documented rationale if direct values missing; avoid blind estimates.
- Swap suggestions logic and shopping list generation.

Acceptance Criteria
- Plans meet constraints and pass validators; nutrients and GI/GL computed correctly; weekend treat pattern visible.
- Cost policy adherence (Level 2); routing logs show cheapest within 5% window.

Exit Criteria
- Users receive high-quality, celebrity-grade meal plans with accurate nutrition.

----------------------------------------------------------------------
Phase 13 — AI Fitness Planning, Weekly Adaptation & Domain-Scoped Chat with RAG
----------------------------------------------------------------------

Objectives
- Adapt plans with weekly feedback, deliver domain-limited assistant with RAG, and advanced fitness logic.

Scope & Key Deliverables
- Weekly Feedback Loop (n8n):
  - Aggregate adherence; compute macro/micro deficiencies; adjust next week’s plan; solicit updated weight/measurements; maintain metabolism; consider GI/GL shifts.
- AI Fitness Adaptation:
  - Adjust monthly→weekly plans using logs and wearable data; safety maintained; explanatory notes.
- Domain-Scoped AI Chat:
  - RAG over user data (profile, plans, logs, measurements), report interpretations, nutrition knowledge (cooking retention, GI tables, safe ranges), fitness fundamentals, recipe corpus.
  - Capabilities: answer scoped questions; show meals, workouts; propose swaps; update data on confirmation.
  - Health report–specific questions route via Level 1 router/quota; reuse structured interpretations to lower cost subsequently.
- Hinglish NLP:
  - Synonym/transliteration dictionaries for logging and chat comprehension.

Acceptance Criteria
- Measurable week-over-week adaptation; chat refuses out-of-domain; citations to sources in RAG responses where applicable.
- Update operations gated with user confirmation; audits recorded.

Exit Criteria
- Personalized, evolving coaching loop operational; assistant trusted and safe.

----------------------------------------------------------------------
Phase 14 — Integrations: HealthKit/Google Fit/Fitbit, AQI/Weather, Push Notifications
----------------------------------------------------------------------

Objectives
- Integrate device and environmental data for contextual coaching and nudges.

Scope & Key Deliverables
- Health Data:
  - Apple HealthKit (iOS), Google Fit (Android), Fitbit API: steps, HR, energy burn, sleep (permissions-based).
  - Use to refine calorie targets, recovery recommendations, and ETA predictions.
- AQI/Weather:
  - OpenWeather (Weather + Air Pollution) or IQAir; cache per location; dashboard banners and nudges (home workouts on high AQI; hydration in dry heat).
- Notifications:
  - APNs, FCM; hydration, meal, workout reminders; report status updates; adaptive timing; user-configurable toggles.

Acceptance Criteria
- Data sync resilient with retries/backoff; permission UX compliant; notifications timely and not naggy.

Exit Criteria
- Integrations demonstrably improve adherence and prediction accuracy.

----------------------------------------------------------------------
Phase 15 — Performance/Security Hardening, Observability, Cost Controls, QA (SIT/UAT), Compliance & Launch
----------------------------------------------------------------------

Objectives
- Finalize performance, security, observability, cost governance; complete QA; ensure store compliance; launch.

Scope & Key Deliverables
- Performance & Reliability:
  - p95 API <2s; app launch <3s; connection pooling; query optimization; CDN; background jobs; circuit breakers; timeouts; graceful degradation; offline caching.
- Security & Privacy:
  - OWASP ASVS; SAST/DAST; dependency/secret scanning; WAF; RBAC/ABAC; audit logs; DLP on AI payloads; export/delete flows; encrypted backups.
- Observability:
  - Centralized logs/metrics/traces; SLO dashboards; synthetic tests; alerting; runbooks; DR (backups, restore tests; RPO/RTO).
- Cost Controls:
  - Model usage dashboards; quota enforcement; cache hit rates; provider mix optimization per Level 1/2 policies.
- QA:
  - Unit, integration, E2E (XCUITest/Espresso), performance, fuzzing; ≥90% coverage on critical paths; SIT across backend/mobile/AI/n8n/integrations; UAT against business use cases (1–25).
- Compliance & Launch:
  - App Store/Play Store readiness; consent and privacy flows; localized disclosures; Privacy Policy/ToS; store assets; release pipelines; crash reporting (privacy-conscious).
  - Manual human steps documented for API keys (Apple/Google/Fitbit/AI providers) with env variable names.

Acceptance Criteria
- All tests green; SIT+UAT sign-offs; security/performance gates passed; store submissions accepted.

Exit Criteria
- Version v1.0.0 live with monitoring and on-call rotation active; rollback plan in place.

----------------------------------------------------------------------
Mapping to Business Use Cases (1–25)
----------------------------------------------------------------------

- 1–5 Onboarding, profiles, preferences, goals → Phases 6, 8
- 6–12 Meal plan generation, sustainability, celebrity-grade nutrition → Phases 3, 4, 12
- 13–15 Logging, analytics, weekly adaptive loop → Phases 9, 13
- 16 Accurate calculations, GI/GL, cooking transforms → Phase 3 (engines), Phase 12 (application)
- 17 Hinglish inputs → Phases 8, 9, 13
- 18 Domain-scoped chat with RAG and update actions → Phase 13
- 19 Security/privacy guarantees → Phases 1, 2, 6, 15
- 20 Wearables and push → Phase 14
- 21 AQI/Weather context → Phase 14
- 22 Burn target guidance → Phases 3, 12, 13 (compute + advice)
- 23 Fitness planning & monthly updates → Phases 5, 13
- 24 Scalability to 10M → Phases 2, 15
- 25 Fallbacks and AI cost/accuracy policy → Phases 10, 11, 12, 13, 15

----------------------------------------------------------------------
AI Model Routing & Fallback Enforcement
----------------------------------------------------------------------

- Level 1 (health reports; report-focused chat):
  - Highest-accuracy model first; daily quota step-down: 100% → 98% → 97% … Never below Level 2 without explicit consent.
  - Cache structured interpretations; reuse with lower-cost reasoning where safe.
- Level 2 (diet/fitness/recipes/general domain chat):
  - Choose the cheapest within 5% accuracy of top; prefer open-source/self-hosted options when feasible (e.g., Llama/Mistral).
- OCR/Document Understanding:
  - Primary: best-in-class for locale; fallbacks: Azure/AWS/Tesseract.
- DLP & Privacy:
  - Pseudonymize payloads; zero-retention modes; strip identifiers; provider DPAs documented.

----------------------------------------------------------------------
Risks & Mitigations
----------------------------------------------------------------------

- Data licensing (IFCT, GI tables): Legal review; permissible subsets; estimation models with citations.
- Provider outages or cost spikes: Multi-provider ladder, quotas, caching, self-hosted fallbacks.
- Nutrition accuracy disputes: Provenance stored; periodic audits; engine unit tests vs benchmarks.
- App store rejections: Early compliance reviews; beta submissions; feature flags for sensitive integrations.

----------------------------------------------------------------------
Change Control & Alignment
----------------------------------------------------------------------

- PROMPT_README_COMBINED.md is the single source of truth. Any scope/standard changes require synchronized updates to this file and PROMPT_README_COMBINED.md via PR review by product, security, and AI leads.


### ✅ VERIFICATION COMPLETE: Full End-to-End Application Coverage Confirmed

**Summary**: All required application functionalities are comprehensively covered across the 6 development phases. The combined deliverables from all phases will provide a complete, production-ready HealthAICoach application with:

- ✅ Complete user onboarding and authentication
- ✅ Full AI-powered coaching capabilities  
- ✅ Comprehensive meal and fitness planning
- ✅ Health platform integrations
- ✅ Real-time analytics and progress tracking
- ✅ Store-ready mobile applications
- ✅ Production deployment infrastructure
- ✅ Security and compliance validation

**No functionality gaps identified** - the phase-based approach delivers 100% of the required application features.

```End of execution plan. All teams must adhere to these phases and acceptance gates. Deviations require explicit approval and synchronized SSOT updates.```
