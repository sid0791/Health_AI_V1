#!/bin/bash

# Production Deployment Script for HealthCoachAI
# This script deploys the backend services to production environment

set -e

echo "🚀 Starting HealthCoachAI Production Deployment"
echo "================================================"

# Check prerequisites
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install kubectl first."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Environment variables validation
required_vars=(
    "DB_USERNAME"
    "DB_PASSWORD"
    "JWT_SECRET"
    "OPENAI_API_KEY"
    "ANTHROPIC_API_KEY"
    "SENTRY_DSN"
)

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Prerequisites and environment validation passed"

# Build and push Docker image
echo "🔨 Building Docker image..."
docker build -t healthcoachai/backend:latest -f services/backend/Dockerfile .

# Tag for production
VERSION_TAG=$(git rev-parse --short HEAD)
docker tag healthcoachai/backend:latest healthcoachai/backend:${VERSION_TAG}

echo "📦 Pushing Docker image to registry..."
docker push healthcoachai/backend:latest
docker push healthcoachai/backend:${VERSION_TAG}

# Apply Kubernetes configurations
echo "☸️  Applying Kubernetes configurations..."

# Create namespace if it doesn't exist
kubectl create namespace healthcoachai-prod --dry-run=client -o yaml | kubectl apply -f -

# Apply secrets (substitute environment variables)
envsubst < infra/secrets-template.yaml | kubectl apply -f -

# Apply production configuration
kubectl apply -f infra/production.yaml

# Wait for deployment to be ready
echo "⏳ Waiting for deployment to be ready..."
kubectl rollout status deployment/healthcoachai-backend-prod -n healthcoachai-prod --timeout=300s

# Run database migrations
echo "🗄️  Running database migrations..."
kubectl run migration-job \
    --image=healthcoachai/backend:${VERSION_TAG} \
    --restart=Never \
    --namespace=healthcoachai-prod \
    --env="NODE_ENV=production" \
    --command -- npm run migration:run

# Wait for migration to complete
kubectl wait --for=condition=complete job/migration-job -n healthcoachai-prod --timeout=120s

# Clean up migration job
kubectl delete job migration-job -n healthcoachai-prod

# Verify deployment
echo "🔍 Verifying deployment..."
kubectl get pods -n healthcoachai-prod
kubectl get services -n healthcoachai-prod
kubectl get ingress -n healthcoachai-prod

# Health check
echo "🏥 Performing health check..."
EXTERNAL_IP=$(kubectl get service healthcoachai-backend-service -n healthcoachai-prod -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if [ -n "$EXTERNAL_IP" ]; then
    echo "Testing health endpoint at http://$EXTERNAL_IP/health"
    curl -f "http://$EXTERNAL_IP/health" || {
        echo "❌ Health check failed"
        exit 1
    }
    echo "✅ Health check passed"
else
    echo "⚠️  External IP not yet available, skipping health check"
fi

echo ""
echo "🎉 Production deployment completed successfully!"
echo "=================================="
echo ""
echo "📋 Deployment Summary:"
echo "• Image: healthcoachai/backend:${VERSION_TAG}"
echo "• Namespace: healthcoachai-prod"
echo "• Replicas: 3"
echo "• External IP: ${EXTERNAL_IP:-'Pending'}"
echo ""
echo "🔗 Next steps:"
echo "1. Update DNS records to point to the external IP"
echo "2. Configure SSL certificates"
echo "3. Set up monitoring alerts"
echo "4. Test all endpoints"