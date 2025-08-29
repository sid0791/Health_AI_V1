# HealthCoachAI Architecture

## Overview

HealthCoachAI is a comprehensive, production-ready AI-powered health and
wellness platform designed to deliver celebrity-grade nutrition and fitness
coaching with clinical accuracy. This document outlines the system architecture,
design principles, and technical implementation strategy.

## Architecture Principles

### Core Design Principles

1. **Security and Privacy by Design**: OWASP ASVS compliance, end-to-end
   encryption, DLP for external AI calls
2. **Accuracy-First AI Routing**: Level 1 (health reports) = highest accuracy;
   Level 2 (general) = cost-optimized
3. **Production-Ready**: No placeholders, full testing coverage, comprehensive
   monitoring
4. **Scalability**: India-first, globally scalable to 10M+ users
5. **Performance**: API p95 < 2s, mobile launch < 3s, offline-first capabilities
6. **Accessibility**: WCAG 2.1 AA compliance, inclusive design patterns

### Technology Stack

#### Frontend (Mobile)

- **iOS**: SwiftUI + Combine, Swift Package Manager
- **Android**: Kotlin + Jetpack Compose, Gradle
- **Shared**: Design system tokens, offline-first architecture

#### Backend

- **Framework**: NestJS (Node.js + TypeScript)
- **Database**: PostgreSQL 15+ with pgvector for embeddings
- **Cache**: Redis 7+ for session and application caching
- **Storage**: S3-compatible object storage for files
- **Search**: OpenSearch (alternative: Elasticsearch)

#### AI and ML

- **Orchestration**: n8n for AI workflows and routing
- **Providers**: OpenAI, Anthropic, Google Vertex, OpenRouter, Together
- **Level 1**: GPT-4.1, Claude Sonnet 4, Gemini 2.5 Pro (highest accuracy)
- **Level 2**: Llama 3.1 70B, Mixtral 8x22B, Qwen2-72B (cost-optimized)
- **OCR**: Google Document AI (primary), AWS Textract (fallback)

#### Infrastructure

- **Containers**: Docker with multi-stage builds
- **Orchestration**: Kubernetes (production), Docker Compose (development)
- **CI/CD**: GitHub Actions with security gates
- **Monitoring**: OpenTelemetry, Prometheus, Grafana
- **Secrets**: Cloud Secret Manager, encrypted environment variables

## System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Mobile Apps"
        iOS[iOS App<br/>SwiftUI + Combine]
        Android[Android App<br/>Kotlin + Compose]
    end

    subgraph "API Gateway & Load Balancer"
        ALB[Application Load Balancer]
        WAF[Web Application Firewall]
    end

    subgraph "Backend Services"
        API[NestJS API Server]
        Auth[Authentication Service]
        Router[AI Router Service]
        OCR[Health Report Pipeline]
        Nutrition[Nutrition Engine]
        Fitness[Fitness Engine]
    end

    subgraph "AI Orchestration"
        N8N[n8n Workflows]
        Queue[Message Queue]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL + pgvector)]
        Redis[(Redis Cache)]
        S3[(Object Storage)]
    end

    subgraph "External AI Providers"
        OpenAI[OpenAI GPT-4]
        Anthropic[Anthropic Claude]
        Vertex[Google Vertex AI]
        Others[OpenRouter, Together]
    end

    subgraph "External Integrations"
        HealthKit[Apple HealthKit]
        GoogleFit[Google Fit]
        Weather[Weather APIs]
        OCRProviders[OCR Services]
    end

    iOS --> ALB
    Android --> ALB
    ALB --> WAF
    WAF --> API

    API --> Auth
    API --> Router
    API --> OCR
    API --> Nutrition
    API --> Fitness

    Router --> N8N
    N8N --> Queue
    N8N --> OpenAI
    N8N --> Anthropic
    N8N --> Vertex
    N8N --> Others

    API --> PG
    API --> Redis
    API --> S3

    API --> HealthKit
    API --> GoogleFit
    API --> Weather
    OCR --> OCRProviders
```

### Domain-Driven Design

#### Core Domains

1. **User Management Domain**
   - Authentication and authorization
   - User profiles and preferences
   - Consent and privacy management
   - Device and session management

2. **Health Data Domain**
   - Health report processing (OCR → NER → Interpretation)
   - Biometric data and measurements
   - Medical history and conditions
   - Health goal tracking

3. **Nutrition Domain**
   - Food database and nutrient calculations
   - Recipe corpus and meal planning
   - Glycemic index/load calculations
   - Cooking transformations and yields

4. **Fitness Domain**
   - Exercise database and workout library
   - Fitness planning and periodization
   - Progress tracking and adaptation
   - Safety and contraindications

5. **AI and ML Domain**
   - AI routing and decision logic
   - Model orchestration and fallbacks
   - DLP and pseudonymization
   - Cost and accuracy optimization

6. **Integration Domain**
   - Wearable device integrations
   - External API management
   - Webhook processing
   - Third-party data synchronization

### Microservices Architecture

#### Service Breakdown

```mermaid
graph TB
    subgraph "Core Services"
        UserSvc[User Service]
        AuthSvc[Auth Service]
        ProfileSvc[Profile Service]
        ConsentSvc[Consent Service]
    end

    subgraph "Health Services"
        ReportSvc[Health Report Service]
        BiometricSvc[Biometric Service]
        GoalSvc[Goal Service]
    end

    subgraph "Nutrition Services"
        FoodSvc[Food Database Service]
        NutritionSvc[Nutrition Calculation Service]
        RecipeSvc[Recipe Service]
        MealPlanSvc[Meal Planning Service]
    end

    subgraph "Fitness Services"
        ExerciseSvc[Exercise Database Service]
        FitnessSvc[Fitness Calculation Service]
        WorkoutSvc[Workout Service]
        FitnessPlanSvc[Fitness Planning Service]
    end

    subgraph "AI Services"
        RouterSvc[AI Router Service]
        DLPSvc[DLP Service]
        RAGSvc[RAG Service]
        ChatSvc[Chat Service]
    end

    subgraph "Integration Services"
        WebhookSvc[Webhook Service]
        WearableSvc[Wearable Integration Service]
        WeatherSvc[Weather Service]
        NotificationSvc[Notification Service]
    end

    subgraph "Infrastructure Services"
        ConfigSvc[Configuration Service]
        LoggingSvc[Logging Service]
        MetricsSvc[Metrics Service]
        HealthCheckSvc[Health Check Service]
    end
```

## Data Architecture

### Database Design

#### Primary Database (PostgreSQL)

**Core Tables:**

- `users` - User accounts and basic information
- `profiles` - User health profiles and preferences
- `consents` - Privacy and data usage consents
- `health_reports` - Processed health report metadata
- `biometrics` - User measurements and vital signs
- `goals` - Health and fitness objectives
- `meal_plans` - Generated meal plans and adaptations
- `fitness_plans` - Workout plans and progressions
- `logs` - User activity and progress logs
- `ai_decisions` - AI routing and decision audit trail

**Vector Tables (pgvector):**

- `embeddings` - Text embeddings for RAG
- `recipe_vectors` - Recipe similarity vectors
- `user_vectors` - User preference vectors

#### Caching Strategy (Redis)

**Cache Patterns:**

- Session data (15 minutes TTL)
- API responses (varies by endpoint)
- Nutrition calculations (24 hours TTL)
- AI responses (varies by type and accuracy)
- User preferences (1 hour TTL)
- Static content (CDN cache)

#### Object Storage (S3)

**Bucket Structure:**

```
healthcoachai-prod/
├── health-reports/          # Encrypted health documents
├── profile-images/          # User profile pictures
├── recipe-images/           # Recipe photos
├── workout-videos/          # Exercise demonstration videos
├── exports/                 # User data exports
└── backups/                # Database backups
```

### Data Flow Architecture

#### Health Report Processing Pipeline

```mermaid
sequenceDiagram
    participant User
    participant Mobile
    participant API
    participant OCR
    participant NER
    participant AI
    participant Storage

    User->>Mobile: Upload health report
    Mobile->>API: POST /health-reports
    API->>Storage: Store encrypted image
    API->>OCR: Extract text/tables
    OCR->>NER: Parse biomarkers
    NER->>AI: Interpret results
    AI->>Storage: Store interpretation
    API->>Mobile: Return report ID
    Mobile->>User: Show processing status
```

#### AI Routing Decision Flow

```mermaid
flowchart TD
    Request[AI Request] --> Classify{Classify Request Type}

    Classify -->|Health Report| Level1[Level 1 Processing]
    Classify -->|General Query| Level2[Level 2 Processing]

    Level1 --> QuotaCheck1{Check Daily Quota}
    QuotaCheck1 -->|Available| HighAccuracy[Use Highest Accuracy Model]
    QuotaCheck1 -->|Exhausted| StepDown[Step Down to Next Tier]

    Level2 --> CostOptimize[Cost-Optimized Model Selection]

    HighAccuracy --> DLP[DLP Processing]
    StepDown --> DLP
    CostOptimize --> DLP

    DLP --> AICall[External AI Call]
    AICall --> Cache[Cache Response]
    Cache --> Response[Return to User]
```

## Security Architecture

### Zero Trust Security Model

#### Identity and Access Management

```mermaid
graph LR
    subgraph "Authentication"
        Phone[Phone OTP]
        OAuth[OAuth Providers]
        MFA[Multi-Factor Auth]
        Device[Device Binding]
    end

    subgraph "Authorization"
        RBAC[Role-Based Access Control]
        ABAC[Attribute-Based Access Control]
        API[API Key Management]
        Session[Session Management]
    end

    subgraph "Data Protection"
        Encrypt[Encryption at Rest]
        TLS[TLS in Transit]
        DLP[Data Loss Prevention]
        Audit[Audit Logging]
    end

    Phone --> RBAC
    OAuth --> RBAC
    MFA --> ABAC
    Device --> Session

    RBAC --> Encrypt
    ABAC --> TLS
    API --> DLP
    Session --> Audit
```

#### Network Security

**Defense in Depth:**

1. **Perimeter**: WAF, DDoS protection, geo-blocking
2. **Network**: VPC, security groups, network ACLs
3. **Application**: Input validation, output encoding, CSRF protection
4. **Data**: Encryption, access controls, audit logging
5. **Monitoring**: SIEM, anomaly detection, incident response

### Privacy Architecture

#### Data Minimization and Purpose Limitation

```mermaid
graph TD
    Collection[Data Collection] --> Classification[Data Classification]
    Classification --> Consent[Consent Management]
    Consent --> Processing[Purpose-Limited Processing]
    Processing --> Retention[Retention Policies]
    Retention --> Disposal[Secure Disposal]

    Classification --> PII[PII Detection]
    Classification --> PHI[PHI Detection]

    PII --> Encryption[Encryption at Rest]
    PHI --> AdvancedEncryption[Advanced Encryption + DLP]

    Processing --> Pseudonymization[Pseudonymization for Analytics]
    Processing --> Anonymization[Anonymization for ML]
```

## AI and ML Architecture

### AI Router Architecture

#### Model Selection Logic

```typescript
interface AIRoutingPolicy {
  level1: {
    providers: ['openai-gpt4', 'anthropic-claude4', 'google-gemini2.5'];
    quotaTiers: [100, 200, 500]; // Daily quota tiers
    fallbackAccuracy: 0.98; // Minimum accuracy threshold
  };
  level2: {
    providers: ['llama3.1-70b', 'mixtral-8x22b', 'qwen2-72b'];
    accuracyWindow: 0.05; // 5% accuracy window
    costOptimization: true;
  };
  dlp: {
    enabled: true;
    piiDetection: true;
    pseudonymization: true;
    zeroRetention: true;
  };
}
```

#### n8n Workflow Architecture

**Core Workflows:**

1. **AI Router Orchestrator**: Model selection and fallback handling
2. **Health Report Pipeline**: OCR → NER → Interpretation
3. **Daily Plan Runner**: Meal and fitness plan generation
4. **Weekly Adaptation**: Progress analysis and plan updates
5. **Quota Reset**: Daily quota tier reset
6. **Notification Scheduler**: Hydration, meal, workout reminders

### RAG (Retrieval-Augmented Generation) Architecture

#### Knowledge Base Structure

```mermaid
graph TB
    subgraph "Knowledge Sources"
        UserData[User Profile & Logs]
        HealthReports[Structured Health Reports]
        NutritionDB[Nutrition Database]
        FitnessDB[Fitness Database]
        Guidelines[Health Guidelines]
    end

    subgraph "Vector Processing"
        Embedding[Text Embedding]
        Chunking[Document Chunking]
        Indexing[Vector Indexing]
    end

    subgraph "Vector Store"
        PGVector[(pgvector)]
        Similarity[Similarity Search]
        Retrieval[Context Retrieval]
    end

    subgraph "Generation"
        ContextAugment[Context Augmentation]
        AIGenerate[AI Generation]
        Response[Formatted Response]
    end

    UserData --> Embedding
    HealthReports --> Embedding
    NutritionDB --> Embedding
    FitnessDB --> Embedding
    Guidelines --> Embedding

    Embedding --> Chunking
    Chunking --> Indexing
    Indexing --> PGVector

    PGVector --> Similarity
    Similarity --> Retrieval
    Retrieval --> ContextAugment
    ContextAugment --> AIGenerate
    AIGenerate --> Response
```

## Performance Architecture

### Caching Strategy

#### Multi-Level Caching

```mermaid
graph TB
    Client[Mobile Client] --> CDN[CDN Cache]
    CDN --> LB[Load Balancer]
    LB --> App[Application Server]

    App --> L1[L1: In-Memory Cache]
    App --> L2[L2: Redis Cache]
    App --> L3[L3: Database Query Cache]
    App --> DB[(PostgreSQL)]

    L1 -->|Miss| L2
    L2 -->|Miss| L3
    L3 -->|Miss| DB
```

**Cache Hierarchy:**

- **L1 (In-Memory)**: Frequently accessed data (< 1ms)
- **L2 (Redis)**: Session data, API responses (< 5ms)
- **L3 (Query Cache)**: Database query results (< 50ms)
- **CDN**: Static assets, images (< 100ms)

### Scalability Architecture

#### Horizontal Scaling

```mermaid
graph TB
    subgraph "Load Balancer Tier"
        ALB[Application Load Balancer]
        Health[Health Checks]
    end

    subgraph "Application Tier"
        App1[App Server 1]
        App2[App Server 2]
        App3[App Server N]
    end

    subgraph "Database Tier"
        Master[(Primary DB)]
        Replica1[(Read Replica 1)]
        Replica2[(Read Replica 2)]
    end

    subgraph "Cache Tier"
        Redis1[(Redis Cluster 1)]
        Redis2[(Redis Cluster 2)]
    end

    ALB --> App1
    ALB --> App2
    ALB --> App3

    App1 --> Master
    App1 --> Replica1
    App2 --> Master
    App2 --> Replica2
    App3 --> Master

    App1 --> Redis1
    App2 --> Redis1
    App3 --> Redis2
```

## Monitoring and Observability

### OpenTelemetry Implementation

#### Telemetry Stack

```mermaid
graph TB
    subgraph "Applications"
        Mobile[Mobile Apps]
        Backend[Backend Services]
        N8N[n8n Workflows]
    end

    subgraph "Collection"
        OTel[OpenTelemetry Collector]
        Agent[Telemetry Agents]
    end

    subgraph "Storage"
        Jaeger[(Jaeger - Traces)]
        Prometheus[(Prometheus - Metrics)]
        Loki[(Loki - Logs)]
    end

    subgraph "Visualization"
        Grafana[Grafana Dashboards]
        Alerts[Alert Manager]
    end

    Mobile --> OTel
    Backend --> OTel
    N8N --> Agent

    OTel --> Jaeger
    OTel --> Prometheus
    OTel --> Loki

    Jaeger --> Grafana
    Prometheus --> Grafana
    Loki --> Grafana

    Prometheus --> Alerts
```

#### Key Metrics and SLOs

**Performance SLOs:**

- API Response Time: p95 < 2s, p99 < 5s
- Mobile App Launch: < 3s cold start
- Database Query Time: p95 < 100ms
- Cache Hit Rate: > 90% for frequent data

**Availability SLOs:**

- API Uptime: 99.9% (< 8.77 hours downtime/year)
- Mobile App Availability: 99.95%
- Data Consistency: 99.99%

**Business Metrics:**

- AI Model Accuracy: Level 1 > 95%, Level 2 > 90%
- User Engagement: Daily/Monthly active users
- Feature Adoption: Onboarding completion rates
- Cost Metrics: AI cost per request, infrastructure cost per user

## Deployment Architecture

### CI/CD Pipeline

```mermaid
graph TB
    subgraph "Source Control"
        Git[Git Repository]
        PR[Pull Request]
    end

    subgraph "CI Pipeline"
        Lint[Lint & Format]
        Test[Unit Tests]
        Security[Security Scans]
        Build[Build Application]
    end

    subgraph "CD Pipeline"
        Deploy[Deploy to Staging]
        IntegrationTest[Integration Tests]
        Approve[Manual Approval]
        Production[Deploy to Production]
    end

    subgraph "Post-Deployment"
        Monitor[Health Monitoring]
        Rollback[Automatic Rollback]
    end

    Git --> PR
    PR --> Lint
    Lint --> Test
    Test --> Security
    Security --> Build
    Build --> Deploy
    Deploy --> IntegrationTest
    IntegrationTest --> Approve
    Approve --> Production
    Production --> Monitor
    Monitor --> Rollback
```

### Environment Strategy

**Environment Progression:**

1. **Development**: Local development, feature branches
2. **Testing**: Automated testing, integration validation
3. **Staging**: Production-like environment, manual testing
4. **Production**: Live environment, blue-green deployment

## Disaster Recovery and Business Continuity

### Backup Strategy

#### Data Backup

```mermaid
graph TB
    subgraph "Primary Systems"
        PrimaryDB[(Primary Database)]
        AppData[Application Data]
        UserFiles[User Files]
    end

    subgraph "Backup Systems"
        DBBackup[(Database Backup)]
        FileBackup[File Backup]
        LogBackup[Log Backup]
    end

    subgraph "Storage"
        S3Primary[S3 Primary Region]
        S3Secondary[S3 Secondary Region]
        Glacier[Glacier Long-term]
    end

    PrimaryDB -->|Continuous| DBBackup
    AppData -->|Daily| FileBackup
    UserFiles -->|Real-time| FileBackup

    DBBackup --> S3Primary
    FileBackup --> S3Primary
    LogBackup --> S3Primary

    S3Primary -->|Cross-region| S3Secondary
    S3Secondary -->|Archive| Glacier
```

**Recovery Objectives:**

- **RTO (Recovery Time Objective)**: < 4 hours
- **RPO (Recovery Point Objective)**: < 1 hour
- **Data Retention**: 7 years for critical data

### High Availability

#### Multi-Region Deployment

```mermaid
graph TB
    subgraph "Primary Region (US-East)"
        LB1[Load Balancer]
        App1[App Servers]
        DB1[(Primary Database)]
        Cache1[(Redis Cluster)]
    end

    subgraph "Secondary Region (EU-West)"
        LB2[Load Balancer]
        App2[App Servers]
        DB2[(Read Replica)]
        Cache2[(Redis Cluster)]
    end

    subgraph "Tertiary Region (AP-South)"
        LB3[Load Balancer]
        App3[App Servers]
        DB3[(Read Replica)]
        Cache3[(Redis Cluster)]
    end

    subgraph "Global"
        CDN[Global CDN]
        DNS[DNS Failover]
    end

    CDN --> DNS
    DNS --> LB1
    DNS --> LB2
    DNS --> LB3

    DB1 -->|Async Replication| DB2
    DB1 -->|Async Replication| DB3
```

## Technology Decisions and Trade-offs

### Key Technology Choices

#### Backend Framework: NestJS

**Chosen for:**

- TypeScript-first approach
- Modular architecture support
- Built-in dependency injection
- Comprehensive testing support
- Strong ecosystem and community

**Trade-offs:**

- Slightly higher learning curve
- Node.js performance limitations for CPU-intensive tasks
- Memory usage higher than compiled languages

#### Database: PostgreSQL + pgvector

**Chosen for:**

- ACID compliance and reliability
- Rich ecosystem and tooling
- Built-in vector search capabilities
- Strong consistency guarantees
- Excellent performance for complex queries

**Trade-offs:**

- Vertical scaling limitations
- More complex setup than NoSQL alternatives
- Higher operational overhead

#### Mobile: Native Development

**Chosen for:**

- Best performance and user experience
- Full platform feature access
- Better security model
- Platform-specific optimizations

**Trade-offs:**

- Higher development cost
- Dual codebase maintenance
- Longer time to market

#### AI Orchestration: n8n

**Chosen for:**

- Visual workflow design
- Extensive connector ecosystem
- Self-hosted deployment option
- Cost-effective compared to cloud alternatives

**Trade-offs:**

- Less mature than enterprise alternatives
- Limited enterprise features
- Requires additional operational overhead

### Future Architecture Considerations

#### Potential Enhancements

1. **Event-Driven Architecture**: Implement event sourcing for better audit
   trails and system resilience
2. **Service Mesh**: Consider Istio for advanced traffic management and security
3. **Edge Computing**: Deploy edge nodes for reduced latency in key markets
4. **Machine Learning Ops**: Implement MLOps pipelines for model training and
   deployment
5. **Blockchain Integration**: Consider for secure health data sharing and
   interoperability

#### Scaling Considerations

- **Database Sharding**: Implement when single database reaches capacity limits
- **Microservice Extraction**: Break monolithic services into smaller, focused
  services
- **Cache Warming**: Implement intelligent cache warming for improved
  performance
- **Auto-scaling**: Implement predictive auto-scaling based on usage patterns
- **Global Distribution**: Expand to additional regions based on user growth

---

_This architecture document is a living document and will be updated as the
system evolves and new requirements emerge._
