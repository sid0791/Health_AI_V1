#!/bin/bash

# Staging Deployment Script for HealthCoachAI
# This script deploys the backend services to staging environment

set -e

echo "🚀 Starting HealthCoachAI Staging Deployment"
echo "============================================="

# Check prerequisites
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install kubectl first."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

echo "✅ Prerequisites validation passed"

# Build and push Docker image for staging
echo "🔨 Building Docker image for staging..."
docker build -t healthcoachai/backend:staging -f services/backend/Dockerfile .

# Tag with commit hash
COMMIT_HASH=$(git rev-parse --short HEAD)
docker tag healthcoachai/backend:staging healthcoachai/backend:staging-${COMMIT_HASH}

echo "📦 Pushing Docker image to registry..."
docker push healthcoachai/backend:staging
docker push healthcoachai/backend:staging-${COMMIT_HASH}

# Apply Kubernetes configurations for staging
echo "☸️  Applying Kubernetes configurations for staging..."

# Create namespace if it doesn't exist
kubectl create namespace healthcoachai-staging --dry-run=client -o yaml | kubectl apply -f -

# Apply staging configuration
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: healthcoachai-staging-config
  namespace: healthcoachai-staging
data:
  API_BASE_URL: "https://api-staging.healthcoachai.com"
  NODE_ENV: "staging"
  PORT: "8080"
  DB_HOST: "healthcoachai-staging-db.cluster-xyz.us-east-1.rds.amazonaws.com"
  DB_PORT: "5432"
  DB_NAME: "healthcoachai_staging"
  DB_SSL: "true"
  DB_MAX_CONNECTIONS: "20"
  REDIS_HOST: "healthcoachai-staging-cache.xyz.cache.amazonaws.com"
  REDIS_PORT: "6379"
  AI_POLICY_LEVEL1_DAILY_TIERS: "100,200,500"
  FEATURE_CHAT_ENABLED: "true"
  FEATURE_PHOTO_LOG_ENABLED: "true"
  FEATURE_VOICE_INPUT_ENABLED: "false"
  FEATURE_PREMIUM_FEATURES_ENABLED: "false"
  LOG_LEVEL: "debug"
  DEBUG_SQL: "true"
  ENABLE_PLAYGROUND: "true"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: healthcoachai-backend-staging
  namespace: healthcoachai-staging
  labels:
    app: healthcoachai-backend
    environment: staging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: healthcoachai-backend
      environment: staging
  template:
    metadata:
      labels:
        app: healthcoachai-backend
        environment: staging
    spec:
      containers:
      - name: healthcoachai-backend
        image: healthcoachai/backend:staging-${COMMIT_HASH}
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "staging"
        envFrom:
        - configMapRef:
            name: healthcoachai-staging-config
        - secretRef:
            name: healthcoachai-staging-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: healthcoachai-backend-staging-service
  namespace: healthcoachai-staging
spec:
  selector:
    app: healthcoachai-backend
    environment: staging
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  type: LoadBalancer
EOF

# Wait for deployment to be ready
echo "⏳ Waiting for staging deployment to be ready..."
kubectl rollout status deployment/healthcoachai-backend-staging -n healthcoachai-staging --timeout=300s

# Verify deployment
echo "🔍 Verifying staging deployment..."
kubectl get pods -n healthcoachai-staging
kubectl get services -n healthcoachai-staging

echo ""
echo "🎉 Staging deployment completed successfully!"
echo "==========================================="
echo ""
echo "📋 Staging Deployment Summary:"
echo "• Image: healthcoachai/backend:staging-${COMMIT_HASH}"
echo "• Namespace: healthcoachai-staging"
echo "• Replicas: 2"
echo ""
echo "🔗 Next steps:"
echo "1. Run integration tests against staging"
echo "2. Verify all endpoints are working"
echo "3. Test AI features and rate limiting"
echo "4. Promote to production when ready"