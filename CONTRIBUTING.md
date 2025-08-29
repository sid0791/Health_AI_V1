# Contributing to HealthCoachAI

Welcome to HealthCoachAI! We're excited that you're interested in contributing
to our end-to-end, production-grade AI health and wellness platform.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Security Guidelines](#security-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Phase-Based Development](#phase-based-development)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8.15.0+
- Docker Desktop
- PostgreSQL 15+, Redis 7+
- Xcode (for iOS development)
- Android Studio (for Android development)
- Git with conventional commit support

### Local Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/coronis/Health_AI_V1.git
   cd Health_AI_V1
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment files**

   ```bash
   # Copy environment templates
   cp services/backend/.env.example services/backend/.env
   cp apps/mobile/ios/.env.example apps/mobile/ios/.env
   cp apps/mobile/android/.env.example apps/mobile/android/.env
   ```

4. **Start local infrastructure**

   ```bash
   docker compose -f infra/docker/docker-compose.yml up -d
   ```

5. **Build and start development servers**
   ```bash
   pnpm run build
   pnpm run dev
   ```

## Development Workflow

### Branch Naming Convention

- `feature/PHASE-X-brief-description` - New features
- `bugfix/brief-description` - Bug fixes
- `hotfix/critical-issue` - Critical production fixes
- `docs/update-description` - Documentation updates
- `refactor/component-name` - Code refactoring

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/)
specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring without functionality changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates
- `security`: Security improvements
- `perf`: Performance improvements

**Examples:**

```
feat(auth): add phone OTP verification
fix(nutrition): correct GI calculation for rice varieties
docs(api): update authentication endpoints
security(backend): implement rate limiting for login
```

### Phase-Based Development

Our development follows a 16-phase approach (Phase 0-15). Each contribution
should align with the current phase or planned phases:

- **Phase 0**: Documentation and Planning
- **Phase 1**: Program Setup & Governance
- **Phase 2**: Core Backend Architecture & Data Modeling
- **Phase 3**: Nutrition & Calculation Engines
- **Phase 4-15**: See `APPLICATION_PHASES.md` for complete breakdown

When contributing, specify which phase your work belongs to in the PR
description.

## Code Standards

### General Principles

1. **No Placeholder Code**: Only complete, tested, shippable features
2. **Security First**: No secrets in code, DLP for external AI calls
3. **Performance Targets**: API p95 < 2s, mobile launch < 3s
4. **Accessibility**: WCAG 2.1 AA compliance
5. **Configuration**: All settings via environment/Secret Manager

### Language-Specific Standards

#### TypeScript/JavaScript

- Use strict TypeScript configuration
- Follow ESLint and Prettier rules
- Prefer functional programming patterns
- Use explicit return types for public APIs
- No `any` types without justification

#### Swift (iOS)

- Follow Swift style guide
- Use SwiftUI for UI components
- Implement proper error handling
- Use Combine for reactive programming
- Follow Apple's accessibility guidelines

#### Kotlin (Android)

- Follow Kotlin coding conventions
- Use Jetpack Compose for UI
- Implement proper coroutine usage
- Follow Material Design principles
- Use Android Architecture Components

### Configuration and Secrets

⚠️ **Critical**: Never commit secrets or credentials

- All configuration via environment variables or Secret Manager
- Demo keys only in local development files (`.env.example`)
- Use typed configuration loaders with validation
- Document all configuration options

### AI and ML Guidelines

- Follow Level 1/Level 2 routing policies
- Implement DLP/pseudonymization for external AI calls
- Enforce zero-retention flags where supported
- Log model decisions with cost and quota state
- Cache results appropriately for cost optimization

## Testing Requirements

### Coverage Targets

- **Unit Tests**: ≥85% coverage
- **Critical Paths**: ≥90% coverage by Phase 15
- **Integration Tests**: All API endpoints and workflows
- **E2E Tests**: Complete user journeys

### Testing Strategy

#### Backend Testing

```bash
# Run all tests
pnpm run test

# Run with coverage
pnpm run test:coverage

# Run specific test suite
pnpm --filter services/backend test
```

#### Mobile Testing

```bash
# iOS unit tests
cd apps/mobile/ios && xcodebuild test

# Android unit tests
cd apps/mobile/android && ./gradlew test

# iOS UI tests
cd apps/mobile/ios && xcodebuild test -scheme HealthCoachAIUITests

# Android instrumentation tests
cd apps/mobile/android && ./gradlew connectedAndroidTest
```

### Test Categories

1. **Unit Tests**: Pure functions, business logic, calculations
2. **Integration Tests**: API endpoints, database operations, external services
3. **Contract Tests**: API schema validation, mobile-backend contracts
4. **E2E Tests**: Complete user workflows across mobile and backend
5. **Performance Tests**: Load testing, response time validation
6. **Security Tests**: Authentication, authorization, input validation

## Security Guidelines

### Security Requirements

- **OWASP ASVS**: Follow Application Security Verification Standard
- **Data Classification**: Handle PII/PHI according to classification policy
- **Encryption**: Implement field-level encryption for sensitive data
- **Authentication**: Multi-factor authentication, JWT rotation
- **Authorization**: RBAC/ABAC with principle of least privilege

### Security Checklist

Before submitting code:

- [ ] No secrets or credentials in code
- [ ] Input validation and sanitization implemented
- [ ] Error messages don't leak sensitive information
- [ ] Audit logging for sensitive operations
- [ ] Rate limiting and abuse protection
- [ ] Secure headers and HTTPS enforcement
- [ ] Dependencies scanned for vulnerabilities

### Security Scans

Our CI/CD automatically runs:

- Secret scanning (Gitleaks)
- SAST (Semgrep, CodeQL)
- Dependency scanning (Snyk)
- Container scanning (Trivy)
- Infrastructure scanning (tfsec)

## Documentation

### Required Documentation

1. **Code Documentation**
   - JSDoc/TSDoc for public APIs
   - Inline comments for complex logic
   - README files for modules/packages

2. **API Documentation**
   - OpenAPI specifications
   - GraphQL schema documentation
   - Endpoint examples and use cases

3. **Architecture Documentation**
   - System design decisions
   - Data flow diagrams
   - Integration patterns

### Documentation Standards

- Write clear, concise explanations
- Include code examples where helpful
- Update documentation with code changes
- Follow markdown best practices
- Include diagrams for complex concepts

## Pull Request Process

### Before Creating a PR

1. **Run local checks**

   ```bash
   pnpm run lint
   pnpm run typecheck
   pnpm run test
   pnpm run format:check
   ```

2. **Run security scans**

   ```bash
   pnpm run security:scan
   ```

3. **Update documentation** if needed

4. **Write/update tests** for new functionality

### PR Requirements

- [ ] All CI checks pass (lint, test, security, build)
- [ ] Code review by required reviewers
- [ ] No merge conflicts
- [ ] Branch is up to date with target branch
- [ ] Security checklist completed
- [ ] Documentation updated
- [ ] Tests added/updated with ≥85% coverage

### PR Template

Use our PR template to ensure all requirements are met:

- Link related issues
- Specify the phase alignment
- Complete testing checklist
- Confirm security and privacy compliance
- Add screenshots for UI changes

### Review Process

1. **Automated Checks**: CI/CD pipeline runs all checks
2. **Security Review**: Automated security scans
3. **Code Review**: Required reviewers based on CODEOWNERS
4. **Manual Testing**: QA validation if needed
5. **Approval**: Final approval from relevant leads
6. **Merge**: Squash and merge with conventional commit message

## Issue Reporting

### Bug Reports

Use the bug report template and include:

- Clear reproduction steps
- Expected vs actual behavior
- Environment details
- Screenshots/logs (no PII/PHI)
- Severity assessment

### Feature Requests

Use the feature request template and include:

- Problem statement
- Proposed solution
- User stories
- Phase alignment
- Security considerations

### Security Issues

For security vulnerabilities:

1. **DO NOT** create a public issue
2. Email security@healthcoachai.com
3. Include detailed reproduction steps
4. Provide impact assessment
5. Suggest mitigation if possible

## Community Guidelines

### Code of Conduct

- Be respectful and professional
- Welcome newcomers and provide helpful feedback
- Focus on technical merit in discussions
- Respect different viewpoints and experiences
- Report inappropriate behavior to maintainers

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests, tasks
- **GitHub Discussions**: General questions, architectural discussions
- **Pull Requests**: Code review and technical discussions
- **Security Email**: security@healthcoachai.com for vulnerabilities

## Getting Help

### Common Issues

1. **Build Failures**: Check Node.js version, clear caches, reinstall
   dependencies
2. **Test Failures**: Ensure test database is running, check environment
   variables
3. **Lint Errors**: Run `pnpm run lint:fix` to auto-fix formatting issues
4. **Type Errors**: Update TypeScript, check import paths, verify type
   definitions

### Resources

- [PROMPT_README.md](./PROMPT_README.md) - Complete project specification
- [APPLICATION_PHASES.md](./APPLICATION_PHASES.md) - Development phases
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Technical implementation
  details
- [UNIVERSAL_TASKS.md](./UNIVERSAL_TASKS.md) - Task checklists and standards
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview

### Contact

- Technical questions: Create a GitHub Discussion
- Bug reports: Create a GitHub Issue
- Security issues: security@healthcoachai.com
- General inquiries: contact@healthcoachai.com

---

Thank you for contributing to HealthCoachAI! Together, we're building a
world-class health and wellness platform that will help millions of users
achieve their health goals safely and effectively.
