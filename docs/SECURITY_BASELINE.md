# Security Baseline Documentation - OWASP ASVS Aligned

## Overview

This document establishes the security baseline for HealthCoachAI application,
aligned with OWASP Application Security Verification Standard (ASVS) Level 2
requirements. This baseline applies across all phases and is enforced via
automated controls and manual review processes.

## Data Classification Policy

### Classification Levels

#### Level 1: Personal Health Information (PHI/PII)

- **Definition**: Medical records, health reports, biomarkers, genetic data,
  psychological assessments
- **Protection**: Field-level encryption (AES-256-GCM), separate key per user
- **Access**: Role-based access with explicit consent tracking
- **Retention**: Automatic deletion after user account closure + legal retention
  period
- **Examples**: Lab results, health reports, biometric data, medical imaging

#### Level 2: Personal Identifiable Information (PII)

- **Definition**: Information that can identify a specific individual
- **Protection**: Encryption at rest and in transit, pseudonymization for
  analytics
- **Access**: RBAC with audit logging
- **Retention**: User-controlled with right to deletion
- **Examples**: Name, email, phone, address, payment information

#### Level 3: Behavioral Data

- **Definition**: App usage patterns, preferences, non-health tracking data
- **Protection**: Aggregation and anonymization for analytics
- **Access**: Analytics team with data minimization principles
- **Retention**: 24 months default, user-configurable
- **Examples**: App interactions, meal preferences, exercise preferences

#### Level 4: Public Data

- **Definition**: Information intentionally made public or shareable
- **Protection**: Standard security controls
- **Access**: Configurable sharing permissions
- **Retention**: User-controlled
- **Examples**: Public profile information, shared recipes, community posts

## PII Minimization Standards

### Collection Principles

1. **Purpose Limitation**: Only collect data necessary for specific, legitimate
   purposes
2. **Data Minimization**: Collect minimum amount of data required
3. **Consent-Based**: Explicit consent for each data category with granular
   controls
4. **Transparency**: Clear disclosure of what data is collected and why

### Processing Controls

1. **Pseudonymization**: Replace direct identifiers with pseudonyms for internal
   processing
2. **Anonymization**: Remove all identifying information for analytics and
   research
3. **Aggregation**: Use statistical aggregation to prevent individual
   identification
4. **DLP Layer**: Data Loss Prevention before external AI calls

### Storage Controls

1. **Field-Level Encryption**: Sensitive fields encrypted with user-specific
   keys
2. **Separation**: PHI stored separately from application data
3. **Geographic Controls**: Data residency based on user location
4. **Backup Encryption**: All backups encrypted with separate key hierarchy

## RBAC/ABAC Model Patterns

### Role Definitions

#### User Roles

- **End User**: Standard app user with access to own data only
- **Premium User**: Enhanced features with additional data access
- **Family Admin**: Can manage family member accounts (with consent)

#### Staff Roles

- **Support Agent**: Limited read access to non-PHI for user support
- **Data Analyst**: Aggregate anonymized data access only
- **System Admin**: Technical access with no PHI access
- **Security Admin**: Security monitoring and incident response
- **Compliance Officer**: Audit access and privacy controls

#### Clinical Roles (Future)

- **Healthcare Provider**: Access to specific patient data with consent
- **Nutritionist**: Dietary data access with user authorization
- **Fitness Coach**: Exercise and activity data with user authorization

### Attribute-Based Access Control (ABAC)

#### Context Attributes

- **Time**: Business hours, emergency access patterns
- **Location**: Geographic restrictions, office vs. remote access
- **Device**: Trusted devices, security posture
- **Network**: Corporate networks, VPN access, risk scoring

#### Data Attributes

- **Sensitivity Level**: Based on data classification
- **Consent Status**: Current user consent for data access
- **Purpose**: Specific business purpose for access
- **Age**: Data age and relevance

#### Environment Attributes

- **Service Level**: Production vs. development environments
- **Risk Level**: Current threat assessment
- **Compliance State**: Regulatory compliance requirements

## Audit Logging Policy

### Log Categories

#### Security Events (Retention: 7 years)

- Authentication attempts (success/failure)
- Authorization decisions
- Privilege escalation
- Security configuration changes
- Incident response activities

#### Data Access Events (Retention: 3 years)

- PHI/PII access with user/purpose identification
- Data export/download activities
- Consent changes and updates
- Data sharing and external transmission
- Automated processing of sensitive data

#### System Events (Retention: 1 year)

- Application errors and exceptions
- Performance anomalies
- Configuration changes
- Deployment activities
- Backup and recovery operations

### Log Requirements

- **Immutability**: Write-once, tamper-evident logging
- **Encryption**: Logs encrypted in transit and at rest
- **Integrity**: Cryptographic signatures for log integrity
- **Retention**: Automated retention policy enforcement
- **Access**: Separate access controls for log data

## Security Anomaly Detection Plan

### Behavioral Analytics

1. **User Behavior**: Unusual access patterns, geographic anomalies, device
   changes
2. **Data Access**: Bulk data access, unusual query patterns, off-hours access
3. **Application Behavior**: Error rate spikes, performance anomalies, unusual
   API usage
4. **Network Behavior**: Suspicious connections, data exfiltration patterns

### Detection Rules

1. **Threshold-Based**: Rate limiting violations, failed authentication attempts
2. **ML-Based**: Anomaly detection for user behavior patterns
3. **Signature-Based**: Known attack patterns and IOCs
4. **Correlation-Based**: Multi-event correlation across systems

### Response Procedures

1. **Automated Response**: Rate limiting, account lockout, IP blocking
2. **Alert Generation**: Real-time notifications to security team
3. **Investigation**: Incident response procedures and forensics
4. **Remediation**: Containment, eradication, and recovery procedures

## Rate Limiting, WAF, and Bot Protection Strategy

### Rate Limiting Tiers

#### Anonymous Users

- **API Calls**: 100 requests/15 minutes
- **Account Creation**: 5 attempts/hour per IP
- **Password Reset**: 3 attempts/hour per email

#### Authenticated Users

- **API Calls**: 1000 requests/15 minutes
- **Data Export**: 5 requests/hour
- **AI Chat**: 50 requests/hour (Level 2), 20 requests/hour (Level 1)

#### Premium Users

- **API Calls**: 2000 requests/15 minutes
- **Data Export**: 10 requests/hour
- **AI Chat**: 100 requests/hour (Level 2), 30 requests/hour (Level 1)

### Web Application Firewall (WAF)

#### Protection Rules

1. **OWASP Top 10**: Protection against common vulnerabilities
2. **SQL Injection**: Pattern-based and behavioral detection
3. **XSS**: Input validation and output encoding verification
4. **CSRF**: Token validation and SameSite cookie enforcement
5. **DDoS**: Rate limiting and traffic shaping

#### Geographic Controls

- **Restricted Countries**: Block access from high-risk geographic regions
- **Data Residency**: Enforce data processing location restrictions
- **Compliance**: Meet regional data protection requirements

### Bot Protection

#### Detection Methods

1. **Behavioral Analysis**: Human vs. bot interaction patterns
2. **Device Fingerprinting**: Hardware and software characteristics
3. **Challenge-Response**: CAPTCHA and invisible challenges
4. **ML Classification**: Real-time bot scoring

#### Response Actions

1. **Scoring**: Risk-based scoring with graduated responses
2. **Challenges**: Progressive challenge difficulty
3. **Rate Limiting**: Aggressive limits for suspected bots
4. **Blocking**: IP-based and device-based blocking

## Regional Data Residency Requirements

### Geographic Zones

#### Zone 1: United States

- **Data Centers**: AWS us-east-1, us-west-2
- **Compliance**: HIPAA, CCPA, SOC 2
- **Restrictions**: No cross-border transfer of PHI

#### Zone 2: European Union

- **Data Centers**: AWS eu-west-1, eu-central-1
- **Compliance**: GDPR, GDPR-S (Health)
- **Restrictions**: EU data cannot leave EU boundaries

#### Zone 3: India (Primary Market)

- **Data Centers**: AWS ap-south-1, Azure Central India
- **Compliance**: IT Act 2000, PDPB (when enacted)
- **Restrictions**: Indian citizen data preferred in-country storage

#### Zone 4: Other Regions

- **Data Centers**: Regional AWS/Azure facilities
- **Compliance**: Local data protection laws
- **Restrictions**: Based on local regulations

### Implementation Controls

1. **Geo-fencing**: Automatic data routing based on user location
2. **Data Sovereignty**: User choice for data storage location
3. **Cross-Border Controls**: Encrypted tunnels for authorized transfers
4. **Compliance Monitoring**: Automated compliance validation

## mTLS Plan for Service-to-Service Communication

### Certificate Management

1. **Certificate Authority**: Internal CA for service certificates
2. **Rotation**: Automated 90-day certificate rotation
3. **Distribution**: Secure certificate distribution mechanism
4. **Revocation**: Real-time certificate revocation list (CRL)

### Service Communications

#### Internal Services

- **Backend ↔ Database**: mTLS with client certificate validation
- **Backend ↔ Redis**: TLS with certificate pinning
- **Backend ↔ Object Storage**: TLS with AWS SigV4 authentication
- **Backend ↔ n8n**: mTLS with webhook signature validation

#### External Webhooks

- **Payment Providers**: mTLS for payment webhook validation
- **Health Integrations**: Certificate-based authentication for HealthKit/Google
  Fit
- **AI Providers**: TLS with API key authentication (provider limitation)

### Webhook Security

1. **Signature Validation**: HMAC-SHA256 webhook signatures
2. **Certificate Pinning**: Pin certificates for critical external services
3. **Request Validation**: Schema validation for all webhook payloads
4. **Rate Limiting**: Separate rate limits for webhook endpoints

## Implementation Timeline

### Phase 1 (Current)

- [x] Basic security configuration and environment separation
- [x] Secret management and configuration policy
- [x] Initial RBAC implementation
- [x] Basic audit logging
- [ ] WAF configuration and bot protection setup
- [ ] Rate limiting implementation

### Phase 2

- [ ] Field-level encryption for PHI
- [ ] Advanced ABAC implementation
- [ ] Security anomaly detection system
- [ ] Regional data residency controls

### Phase 3

- [ ] mTLS service-to-service communication
- [ ] Advanced behavioral analytics
- [ ] Full compliance audit and certification
- [ ] Penetration testing and security assessment

## Compliance Framework

### Standards Adherence

- **OWASP ASVS Level 2**: Application security verification
- **NIST Cybersecurity Framework**: Risk management approach
- **ISO 27001**: Information security management
- **HIPAA**: Healthcare data protection (when applicable)
- **GDPR**: Data protection and privacy rights

### Continuous Monitoring

1. **Security Metrics**: KPIs for security posture measurement
2. **Compliance Scanning**: Automated compliance validation
3. **Vulnerability Management**: Regular security assessments
4. **Incident Response**: Documented procedures and regular drills

This security baseline is a living document that will be updated as the
application evolves and new security requirements emerge.
