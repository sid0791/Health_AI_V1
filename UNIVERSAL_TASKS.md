# Universal Task Checklist (Aligned to PROMPT_README_COMBINED.md and APPLICATION_PHASES.md)

This file aggregates repeatable tasks and checklists applied across phases,
modules, and teams. It supports planning, tracking, and auditability.

Global Definition of Done

- Functionality complete, integrated, and behind feature flags as needed
- Unit/integration/E2E tests added; coverage meets target (≥90% on critical
  paths by Phase 15)
- Performance budgets met (API p95 <2s; app launch <3s)
- Security checks pass: SAST, DAST, secret/dependency scans; no PII in logs
- Docs updated (API reference, runbooks, user help)
- Telemetry added (logs, metrics, traces); SLOs and alerts configured
- i18n and accessibility compliance checked (WCAG 2.1 AA)
- Cost impact evaluated; caching and quotas configured

Configuration & Secrets

- No secrets in code or clients; use cloud secrets manager; rotate regularly
- Typed config loader with schema validation; environment parity documented
- Zero-retention/no-train flags set for AI providers where supported
- Sensitive config access controlled via least privilege IAM; audited

Security & Privacy

- OWASP ASVS controls mapped and verified in SECURITY_PRIVACY.md
- RBAC/ABAC enforced; audit logs for sensitive actions; administrator access
  approvals recorded
- DLP: redact/pseudonymize PII before outbound AI/provider calls
- Transport encryption (TLS 1.2+); at-rest encryption (KMS); tokenization where
  applicable
- Data export/delete flows implemented and tested

AI Routing & Cost Policy

- Level 1 (health reports; report-focused chat)
  - Highest-accuracy provider first
  - Daily quota step-down: 100% → 98% → 97% … never below Level 2 without
    explicit consent
  - Cache structured interpretations; reuse in downstream tasks
- Level 2 (diet/fitness/recipes/general domain chat)
  - Choose cheapest within 5% accuracy of top model
  - Prefer open-source/self-hosted where feasible (Llama/Mistral)
- Routing logs record model, version, cost, quota state, and anonymization
  status

Nutrition & Data Provenance

- USDA FDC and IFCT (where permitted) as primary sources; Open Food Facts for
  packaged items
- GI tables ingestion with provenance; estimation model documents assumptions
- Cooking yields and nutrient retention applied per method
- Store data provenance and citations for audits

RAG & Chat Guardrails

- Domain-scoped to health, nutrition, fitness, and user data; refuse
  out-of-domain
- Retrieval over user profile, plans, logs, measurements, report
  interpretations, and curated knowledge base
- Provide citations where applicable
- Update operations require explicit user confirmation; audit all changes

Mobile UX & Accessibility

- Core actions ≤3 taps; clear empty/error states
- Tap targets ≥44px; dynamic type; screen reader labels; color contrast
- Hinglish input tolerant across logging and chat
- Light and dark modes supported

Wearables & Environment

- HealthKit/Google Fit/Fitbit integrations with clear permissions UX
- AQI/Weather ingestion with caching; graceful degradation
- Nudges configured with user preferences; respect quiet hours; avoid nagging

Notifications

- APNs and FCM integrated; hydration, meal, workout, AQI templates
- User-configurable frequency and quiet hours
- Backoff and retry strategies for delivery failures

Observability & Reliability

- Structured logs with correlation IDs; sensitive data excluded
- Metrics and traces instrumented; SLO dashboards and alerts
- Circuit breakers, retries with jitter, and timeouts
- Backups configured; DR tested; RPO/RTO documented

Performance & Caching

- Redis for sessions and hot paths; CDN for static assets; HTTP caching headers
- Batch requests; queue long-running tasks; avoid blocking calls on hot paths
- Load testing and cache effectiveness reports maintained

Testing

- Unit tests for engines, parsers, and services with ≥85% coverage; ≥90% for
  critical paths by release
- Integration tests for API flows, ETL, provider adapters (with mocks)
- Mobile UI snapshot tests and E2E user journeys
- Fuzz testing for parsers and OCR text ingestion
- SIT across backend/mobile/AI/n8n/integrations; UAT against use cases (1–25)

Data Model & API Reviews

- DTOs and persistence models reviewed for minimization and encryption targets
- OpenAPI/GraphQL schemas versioned and linted
- Backward compatibility assessed; migrations planned and tested

n8n Workflows (common tasks)

- Daily plan runner schedule
- Weekly review and adaptation
- Health report ingestion pipeline
- AI router orchestration with quotas and fallbacks
- Notifications scheduler and AQI/weather polling
- Quota reset job at configured time (00:00 UTC default)

Role-Based Task Buckets

- Backend
  - Implement modules (auth, profiles, nutrition, recipe, plans, logs,
    analytics, ai-router, reports, chat, rag, integrations)
  - Validators/guards; observability and cost metrics
- Mobile (iOS/Android)
  - Build screens, navigation, design system components
  - Logging flows, offline caching, accessibility
  - HealthKit/Google Fit integrations; push token registration
- AI/ML
  - Model provider adapters; routing logic; caching and quotas
  - OCR/NER/interpretation pipeline; RAG indexing and query
  - Accuracy validation; fallback ladders and cost dashboards
- Security
  - Threat modeling; ASVS mappings; DLP verification; WAF/rate limits
  - Secret scanning; dependency risk management; anomaly detection dashboards
- DevOps/Cloud
  - IaC for VPC, DBs, caches, storage, vector store, orchestration
  - CI/CD pipelines (lint, test, scan, build, deploy)
  - Monitoring and alerting; DR drills; cost dashboards

Release Readiness (Phase 15 gate)

- Store listings prepared; screenshots and privacy disclosures
- Crash reporting integrated (privacy-conscious)
- Rollback plans and feature flags validated
- All checklists in this file signed off by owners

Acceptance Review Template (per feature/phase)

- Scope implemented and tested
- Security/privacy checklist completed
- Performance tests passed
- Documentation updated
- Observability dashboards updated
- Cost/routing decisions logged and reviewed
