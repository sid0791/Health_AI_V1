HealthCoachAI — Ultimate Product & Engineering Prompt
This is the single source of truth (SSOT) for building HealthCoachAI: a production-grade, launch-ready, security-first, AI-powered health, diet, and fitness application. It consolidates all business requirements, functional and non-functional specs, AI selection policies, data/privacy rules, UI/UX, QA, and delivery standards. No placeholders or demos; everything must be production-ready.

This prompt governs all code and documentation produced in this repo and must remain fully aligned with APPLICATION_PHASES.md.

0) Non-Negotiables
End-to-end production-ready application with full frontend (Android, iOS, Web), backend, AI, data, security, cloud, DevOps, and QA.
Zero placeholders, zero demo stubs, zero hardcoded secrets. All business logic must be algorithm-complete.
Zero known bugs at release; ≥90% test coverage on critical paths; comprehensive SIT and UIT/E2E test suites. No dependency Issues, no runtime errors, no compilation errors.
Security and privacy by design; no client-side secrets; vendor data-retention disabled; PII redaction for any external AI calls.
Offline-first UX patterns; graceful API degradation; multi-layer fallbacks for AI and integrations.
Cost-aware AI orchestration with dynamic policy (accuracy vs cost) and vendor fallback tiers.
Use a workflow orchestrator (n8n preferred) for AI and integration pipelines.
India-first with global scalability (0 → 10M users). Bilingual inputs (English + Hinglish), strong Indian recipe coverage, metric-first units.
All features must comply with App Store and Play Store policies; WCAG 2.1 AA accessibility.

1) Core Business Use Cases (Complete Coverage)
Authentication and onboarding
Phone OTP login; social logins (Google, Apple, optional Facebook).
Consent screen (compact, clear toggles).
Create/edit profile: name, age, sex, height, weight, current body structure, body measurements.
Advanced inputs (skippable), two tabs:
Lifestyle: smoking (quantity), alcohol (frequency), sleep timing, outside food frequency, work activity (sitting/sedentary/moving), routine.
Health: conditions (PCOS, diabetes, hypertension, high/low BP, high/low sugar, fatty liver, sleep disorder, libido issues, nutrient deficiencies). Upload health reports (PDF/images).
Food preferences and cravings
Veg/Non-veg/Vegan; cuisines (Indian/Chinese/Asian/Italian/etc.).
Craving signals: chai/tea, ice cream, cold drinks, street food, etc.
Goals
Primary: weight loss/gain/maintain, muscle gain.
Advanced: minimize/ameliorate health conditions from the health tab; lifestyle corrections (sleep, smoking, alcohol reduction).
7-day diet plan generation (celebrity-level nutritionist)
Personalized to goals, preferences, lifestyle, and health reports.
Sustainable, safe nutrition: no harmful deficits or excess (e.g., excessive protein).
Includes recipes with steps, prep time, difficulty, images, and links.
Full macro/micro nutrients and calorie counts per meal; GI/GL where applicable.
Innovative, healthy “craving busters” and guilt-free options (e.g., protein ice cream with dates/makhana/almonds; low-calorie high-protein burger; healthy desserts).
Focused on long-term anti-aging, joint, skin, hair, metabolic health.
Health condition alignment
Diet planning that supports PCOS, insulin resistance, fatty liver, BP management, libido, sleep quality; minimizes aggravation if not correctable.
Long-term goals coverage: grey hair, hair loss, dandruff/itchy scalp, dry skin, mood/depression support via nutrition.
Meal logging (Food Diary)
English + Hinglish search (Rice/Chawal, Tea/Chai).
Portion controls (½, 1x, 2x), free-form quantity, timestamp.
Nutrition computation of logged meals with macro/micro breakdown.
Analytics & predictions
Macro/micro deficiency charts; daily/weekly trends; weight trends; adherence.
Goal ETA prediction based on intake, activity, and plan.
Weekly review and adaptive planning
Weekly review of logs → new week’s plan adapts to deficiencies, adherence, changing measurements.
Adaptive plan balancing metabolism (avoid metabolic slowdown), GI/GL focus, sustainability, and user preference adherence.
AI Chat Assistant (domain-specific)
Trained on user profile, health reports, plans, and internal knowledge base (RAG).
Capabilities: answer, explain, update data (with confirmation), retrieve plans, give tips. Not a general-purpose chatbot.
Level-1 API policy for health-report related Q&A.
Security & privacy
Extreme privacy: no external sharing beyond processing; vendor data-retention disabled; PHI/PII redaction.
End-to-end encryption in transit; encryption at rest; least-privilege access; rate limiting; DLP on outbound AI prompts.
Integrations and context
Fitbit, Google Fit, Apple Health for steps, HR, calories, O2 (where available).
AQI and weather context to tailor nudges and activities.
Push notifications: hydration, meal reminders, steps, sleep, weekly review, physician red flags (if necessary).
Fitness plan (celebrity coach)
Monthly plan with weekly blocks; mix of resistance, calisthenics, yoga; progressions; safety notes; demo videos.
Adjust monthly based on diet logs, body changes, weight change, and goals.
Scalability & reliability
Multi-tenant, horizontally scalable, 10M user design target; edge caching; background jobs; idempotency; retries; circuit breakers.
Fallback policy (global)
Each scenario must have an alternate (AI vendor fallback, cached decisioning, heuristic mode, delayed processing).
Health report analysis is Level-1 importance → always highest accuracy first, with configured graceful degradation.

2) AI Importance Levels and Vendor Selection Policy
Level 1 (highest accuracy): health report analysis and any health-report Q&A in chat.
Use the most accurate API regardless of cost (daily tier policy applies for cost control without compromising safety).
Level 2 (balanced): diet plan suggestions, calorie/nutrition/GI computations (where derived, not measured), fitness plans.
Choose the cheapest API whose accuracy is within 5% of the best-available option.
Selection algorithm:

Determine task level (1 or 2).
Gather candidate providers: accuracy score (historical evals), cost per 1K tokens/inference, latency, retention policy.
If Level 1: pick max-accuracy provider with no data retention; if multiple tied, pick lowest latency; if still tied, pick lowest cost.
If Level 2: compute best accuracy Amax. Accept providers with accuracy ≥ Amax - 5%. Choose lowest cost among them. Break ties by latency.
Ensure provider supports required features (tool use, JSON mode, function calling if needed).
Daily accuracy tiering for Level 1 (anti-abuse but safe):

Tier 0: X calls/day at full-accuracy model (100% target).
Tier 1: next Y calls/day at ≥98% accuracy provider (still non-retaining).
Tier 2: next Z calls/day at ≥96% accuracy.
Floor: never degrade below “Level 2 high-accuracy” providers for Level 1 tasks.
Reset every day at midnight local for user or UTC (configurable).
Cache and reuse high-cost insights: If a report is already analyzed at Tier 0, reuse normalized, structured results for subsequent queries via RAG to reduce cost while maintaining fidelity.
Configuration:

X, Y, Z, provider lists, and accuracy/cost metadata are environment-configured and hot-reloadable.
Vendor retention must be disabled; PHI redaction required.

3) AI APIs, Models, and Cost Strategy
Preferred model families (support multiple vendors with fallbacks):

Level 1 Primary (choose per region/availability; all with no-retention toggles enabled):
GPT-4.1 (JSON mode), Claude Sonnet 4, Gemini 2.5 Pro
Level 1 Secondary (≥98–96% tiers): GPT-4o (no-retention), Claude Sonnet 3.7, Gemini 1.5 Pro
Level 2 Primary (open/low-cost with strong accuracy):
Llama 3.1 70B Instruct (managed or self-hosted), Mixtral 8x22B, Qwen2-72B, GPT-4o-mini (cost-effective)
Specialized components:
OCR: Google Document AI, AWS Textract, or Tesseract (on-device) with PHI redaction
Tabular extraction: Docugami/Structured parsers or custom prompt-engineered extractors
Vector search: pgvector on Postgres
Workflow: n8n as the orchestrator (HTTP nodes, function nodes, queues, retries)
Cost control and self-hosting:

Compare paid inference vs self-hosted open-source (GPU hours, autoscaling, preemption).
Use autoscaling, cold-start pools, and caching to ensure Level 2 defaults are low-cost while meeting accuracy within 5%.
Maintain evaluation datasets to measure “accuracy within 5%” for Level 2 decisions.
List of AI APIs relied upon (configurable):

OpenAI API (GPT-4.1, GPT-4o)
Anthropic API (Claude Sonnet 4, 3.7)
Google Vertex AI (Gemini 2.5 Pro)
OpenRouter or Together.ai for OSS models (Llama 3.1 70B, Mixtral 8x22B, Qwen2-72B)
OCR: Google Document AI or AWS Textract (choose best in region)
All with data-retention disabled; PHI redacted.

4) Data, Nutrition Accuracy, and Recipe Coverage
Nutrition databases (multi-source, reconciled):

USDA FoodData Central (FDC) for core macro/micro values.
IFCT (Indian Food Composition Tables by ICMR–NIN) for Indian staples (respect licensing).
McCance & Widdowson UK tables for cross-verification.
Branded databases (optional): Nutritionix, Edamam as paid fallbacks.
Glycemic Index/Load: University of Sydney GI database (licensed access) and peer-reviewed GI tables; compute GL per serving.
Cooking transformations: apply water/fat loss, yield factors, and nutrient retention factors (FAO/USDA).
Hinglish synonym map for ingredient canonicalization (e.g., “chawal” → rice).
Recipe coverage and innovation:

Curated seed recipe set emphasizing Indian/regional cuisines; extend with open datasets and internal curation.
Generative recipe engine (Level 2) that:
Produces innovative, healthy twists (protein ice creams, low-cal burgers, desserts with dates/makhana/almonds, etc.).
Constrains to user goals, health conditions, allergy/religious constraints.
Back-solves to target macros/micros and GI/GL with validated ingredients from canonical DB.
Nutrient computation pipeline:
Ingredient → canonical food ID → base 100g nutrients → apply preparation yield + retention factors → per-portion scaling → macro/micro/GI/GL table.
Confidence scoring; flag low-confidence values for human nutritionist review queue (internal workflows).
Hinglish/English logging:

Fuzzy search and synonym expansion; unit normalization (household to grams/ml).
On-device language model or rules for quick disambiguation; server confirmers for ambiguous cases.

5) RAG, Personalization Memory, and Workflows (n8n)
RAG architecture:

Vector store (pgvector) with:
User profile, goals, preferences, restrictions
Structured health report extracts (FHIR-like normalized schema)
Past plans, weekly reviews, adherence summaries
Condition guidelines (PCOS, fatty liver, etc.) from curated medical-nutrition corpus
Retrieval-augmented prompts ensure the chat and planners only use domain knowledge.
n8n workflows:

Health Report Intake: OCR → PHI redaction → structured extraction → L1 analysis → storage → summary.
Diet Plan Generator: retrieve user context → compute TDEE/macros → generate 7-day plan → nutrient calc → validation → store.
Weekly Review → Adaptation: ingest logs → detect micro deficits/adherence → modify upcoming plan → notify.
Fitness Plan Builder: condition-aware plan with monthly progressions and safety constraints.
Integrations Sync: Fitbit/Apple Health/Google Fit polling + webhook callbacks; AQI/weather daily snapshot.
Notifications & Nudges: hydration, steps, adherence prompts; quiet hours; opt-in categories.
Cost Controller: tally Level 1 calls; enforce daily tiering; vendor fallback; cache reuse.

6) Security, Privacy, Compliance
OWASP ASVS-aligned; secure by default.
PII/PHI minimization; data classification; field-level encryption for sensitive fields.
All secrets via environment or secret manager; no secrets in clients.
Token-based auth (short-lived), refresh tokens with rotation, device binding; mTLS where applicable.
Role- and attribute-based access control; audit logging; anomaly detection.
DLP layer before external AI calls: redact PII/PHI, enforce vendor “no log/retention” settings.
App store/privacy compliance; data export/delete; consent tracking.
Regional data residency where required (configurable).
Rate limiting, WAF, bot protection, and abuse monitoring.

7) Phase-Aware Config & Secrets (no hardcoding) -  All settings (URLs, keys, limits, etc.) must come from a config + secrets system where demo values live only in a local secrets file that humans can later replace with real ones, without touching code. Create one service feature that connects to an external API with full production logic (retries, pagination, validation, storage) so it works immediately once real keys are swapped in. Provide tests for the config, the client, and the workflow, using mocks for external calls. Add guardrails that fail if hardcoded secrets appear, and clear docs explaining that switching demo → real only requires updating the secrets file. Each phase must deliver bug-free, fully functional, testable code.

8) Remember Only demo files/Codes that are allowed in our whole code is, to put demo apis/code, or where efforts are required that only a HUMAN can do, that is AI is not able to do that work. In no other circumstances, any Demo file/code or placeholder file/code is allowed. Even in the circumstances is a work could be done by Human, and also by AI, than always prefer that AI would complete it end to end, and this no placeholder/demo code or file would be provided. Finally even if we are using demo apis, code/algotithm that uses those API, should be configured such a way, that it would ALWAYS work with actual APIs/Credentials. So that as a HUMAN, i just need to replace demo apis/credentials, with actual apis/credentials, and it would work.

9) UX/UI — Brand, Screens, Accessibility
Brand & feel:

Premium yet warm; celebrity-luxury meets approachable coach.
Colors: fresh greens & turquoise; coral/orange accents; soft neutrals backgrounds.
Fonts: Inter or Poppins; friendly rounded; large bold for emphasis.
Imagery: high-quality food; diverse people; Indian-first but global.
Core UX principles:

Minimal-friction onboarding; conversational; clear skips.
Personalization front and center.
Data simplified with friendly charts.
Encouraging tone; microcopy nudges.
Consistency via component library.
Key screens & flows:

Welcome + Onboarding (OTP + social, consent, guided setup)
Home Dashboard (greeting, today’s meals, quick actions, activity)
7-Day Meal Plan (day tabs; meal cards; swap; meal detail with recipe, nutrition, add to shopping list)
Meal Logging (English/Hinglish search; portion chips; photo capture future-ready)
Analytics & Progress (weight trend, macros, micro deficiencies, ETA)
AI Chat Assistant (inline cards; quick actions; references personal data)
Fitness Plan (monthly blocks; yoga/resistance/calisthenics; videos)
Settings: Integrations (Fitbit/Apple Health/Google Fit toggles); AQI banner
Settings: Notifications & Nudges (hydration, meals, workouts, report updates)
Physician red-flag modal when needed (BP/Sugar anomalies)
Accessibility & localization:

All critical actions <3 taps; ≥44px tap targets
Hindi/Hinglish input accepted; i18n-ready
Light/dark mode; high-contrast options
Screen reader labels and logical focus order

8) Algorithms & Health Logic
TDEE via Mifflin/St. Jeor with activity factors; optional wearables to adjust EE.
Macro split tailored to goal and health conditions (PCOS/IR, fatty liver, hypertension).
Micronutrient targets from RDAs; highlight deficits and plan corrections.
GI/GL-aware meal construction; minimize high-GI spikes for relevant conditions.
Progressive overload and periodization in fitness; HR zone computations; recovery emphasis.
Safety filters: no extreme caloric deficits/excess; protein upper bounds respecting renal safety; sodium limits for hypertension, etc.
Anti-aging axis: prioritize muscle mass retention, collagen-supporting nutrients, anti-inflammatory profiles, sleep-supportive timing.

9) Integrations, Context, and Nudges
Fitbit, Apple Health, Google Fit: steps, HR, energy, sleep (where available).
AQI/Weather providers: location-based advisories (high AQI → home workout and hydration prompts; dry weather → water intake).
Daily “calories to burn” advisory beyond baseline to sustainably meet goals.
Push notifications with scheduling, batching, quiet hours, and smart frequency control.

10) Scalability, Performance, and Reliability Targets
P95 API latency <2s, app cold start <3s.
Horizontal scaling for API, workers, and vector DB; read replicas; sharding strategy when needed.
Idempotent workflows; retries with backoff; circuit breakers; dead-letter queues.
Edge CDN for static assets; image optimization; local caching.
Observability: distributed tracing, logs, metrics, SLOs; incident runbooks.

11) Testing, QA, and Release
Unit, integration, contract, E2E, performance, security tests; fuzz inputs for free-text.
Mock external vendors with golden files; chaos testing for fallbacks.
≥90% coverage on critical paths each phase.
SIT and UIT must pass before release; bug triage to zero-known-bugs.
CI/CD with gated releases; staged rollouts; crash/ANR monitoring; rollback plan.

12) Phase Alignment- use this prompt, to divide the work into different phases. While dividing into phases, make sure each phase is fully functionaly complete. Each phase should be small enough that it could be completed by AI agents without any issues with ratelimit. While dividing the work into phases, make sure total number of phases doesn't increase more than 16. Each phase, could be run own its own, without any issue, without any bugs, and without any dependencies. Each phase would contain complete code, without any demo or placeholder code. Finally try to keep total number of phases as low as possible, but still should meet our above criteria, that is fully functionable and small enough to be completed by AI agents in one go.

Each phase must be independently testable, production-ready, and compliant with standards defined in APPLICATION_PHASES.md (Quality Standards, No Placeholder Code, Algorithm-Complete, etc.).

13) Data Model (High-Level)
Users, Devices, Consents, Auth Identities
Profiles (demographics, measurements), Preferences (diet, cuisines, allergens)
Health Conditions, Reports (files, OCR text, structured extracts), Physician Flags
Plans (DietPlanWeek → Days → Meals → Ingredients), FitnessPlans (monthly → weekly → sessions)
Logs (Meals, Portions, Timestamps), Wearable Sync Data (steps, HR, sleep)
Analytics (macro/micro daily summaries, trends, ETA)
RAG Documents (user, medical corpus, plan summaries)
AI Calls (task type, vendor, cost, accuracy tier, cache key, retention flag)
Notifications (categories, schedule), Integrations (tokens, scopes)
Audit Logs, Errors, Feature Flags

14) Edge Cases & Fallbacks
API outages: vendor fallback chain; cached plan retrieval; heuristic local calculators.
Missing wearables: default to self-reported activity; conservative estimates.
Ambiguous food entries: ask clarifying inline questions; default to safest equivalent.
Allergies/religious constraints: strict exclusion; safe substitutions suggested.
Non-adherence detected: adjust plan toward higher adherence without goal drift.
Metabolic slowdown: periodic refeed/adjustments within safety bounds.

15) Acceptance Criteria (Representative)
Diet plan generation:

Produces 7-day plan aligned to user goals, conditions, lifestyle, and preferences.
Each meal has ingredients, steps, images, macros/micros, GI/GL, and links.
Includes at least 2 innovative “craving buster” items per week.
Validated by nutrient calculator pipeline; safety checks pass.
Health report analysis (Level 1):

OCR with PHI redaction; structured entities extracted; summarized with references.
Highest-accuracy tier used until daily tier rules apply; vendor logs disabled.
Results normalized and stored for RAG reuse.
Chat:

Answers only domain questions; can show plans, update preferences, and log meals (with confirmation).
Uses Level 1 policy for report-related questions; otherwise Level 2 policy.
Analytics:

Accurate macro/micro aggregation; weekly summary; ETA prediction visible.
Deficiency-aware plan adjustments reflected in next week’s plan.
Security:

No secrets in clients; at-rest encryption; rate limits; audit logs; DLP for AI calls.
No third-party retention; privacy policy clearly stated; data export/delete supported.
Performance:

Meets P95 latency targets; graceful fallback on vendor delays; offline caching for recent plans/logs.

16) Configuration & Environment
All secrets and API keys via environment or secret manager.
AI policy tables (accuracy, cost, tiers X/Y/Z) are centrally configured (JSON/DB) and editable without redeploy.
Vendor toggles for no-retention modes must be ON.
Feature flags for experimental features (e.g., photo meal recognition).

17) Deliverables in This Repo
Full backend code (API, workers, RAG, AI policy, nutrition engine, fitness engine).
Full mobile apps (Android, iOS) and web app; shared design system where feasible.
n8n workflow definitions (JSON) for all pipelines.
Infrastructure-as-code (cloud-agnostic presets or specific provider) for reproducible environments.
Test suites (unit/integration/E2E/perf/security), test data, and CI pipelines.
Documentation: API docs, runbooks, operations, architecture, and this SSOT.

18) AI API List (for README disclosure)
OpenAI: GPT-4.1, GPT-4o (no-retention)
Anthropic: Claude Sonnet 4, Sonnet 3.7 (no-retention)
Google Vertex AI: Gemini 2.5 Pro (data control enabled)
Open-source via OpenRouter/Together/self-hosted: Llama 3.1 70B, Mixtral 8x22B, Qwen2-72B
OCR: Google Document AI or AWS Textract
Vector DB: Postgres + pgvector
Orchestrator: n8n
All usage follows the Level 1/2 policy, daily tiering, and PHI redaction rules.

19) UI/UX Artifacts
Figma file: Include flows for onboarding, dashboard, meal plan, meal detail, logging, analytics, chat, fitness, settings (integrations/notifications).
Design tokens documented (colors, typography, spacing).
Components: cards, chips, sliders, charts (progress ring, lines, stacked bars), toggles, modals.
Note: Ensure image assets are optimized, licensed, and culturally appropriate.

20) Definitions
Level 1 task: Health report analysis or health-report questions in chat (highest accuracy).
Level 2 task: Diet/fitness planning, calorie/nutrition/GI estimation, cravings recipes, non-report chat.
GI/GL: Glycemic Index/Load computed per serving considering preparation method.

21) Compliance With APPLICATION_PHASES.md
All above requirements are mapped into phases and must be reflected in APPLICATION_PHASES.md. Each phase is:

Self-sufficient, production-ready, algorithm-complete, testable, with compliance gates and ≥90% critical-path coverage.
Includes documentation and release notes.
No placeholder or demo code at any stage.

22) Summary
HealthCoachAI delivers a celebrity-level nutritionist and fitness coach experience with trustworthy accuracy for critical tasks, sustainable long-term health outcomes, delightful and motivating UI/UX, strong privacy and security, and cost-optimized AI orchestration. This prompt is exhaustive; no functionality in the scope may be omitted.
