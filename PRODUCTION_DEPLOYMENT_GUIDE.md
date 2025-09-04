# Production Deployment Guide

## 🚀 Production Deployment Steps

### 1. Backend Deployment

#### Prerequisites
- Node.js 18+ installed
- PostgreSQL database setup
- Environment variables configured

#### Backend Setup
```bash
cd services/backend

# Install dependencies
npm install --production

# Build the application (ignores TypeScript warnings due to monorepo structure)
npm run build:prod

# Set up environment variables
cp .env.example .env.production
# Edit .env.production with real values

# Run database migrations
npm run migration:run

# Start production server
npm run start:prod
```

#### Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Deploy with PM2
npm run deploy:prod

# Monitor application
pm2 status
pm2 logs healthai-backend
```

#### Using Docker
```bash
# Build Docker image
npm run docker:build

# Run container
npm run docker:run
```

### 2. Frontend Deployment

```bash
cd apps/web

# Install dependencies
npm install

# Build for production
npm run build

# Serve static files (using nginx, vercel, netlify, etc.)
```

### 3. Environment Configuration

#### Backend (.env.production)
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@localhost:5432/healthai_prod
JWT_SECRET=your-super-secure-jwt-secret-here
API_RATE_LIMIT=100
PORT=3001

# API Keys (Replace with real keys)
OPENAI_API_KEY=sk-proj-xxxxx
GEMINI_API_KEY=AIzaSyxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx

# External Services
USDA_API_KEY=your-usda-key
NUTRITIONIX_API_KEY=your-nutritionix-key
```

#### Frontend (.env.production)
```env
NEXT_PUBLIC_API_URL=https://api.healthcoachai.com/api
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_AUTH_URL=https://api.healthcoachai.com/auth
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_TELEMETRY_DISABLED=1
```

### 4. Database Setup

```bash
# Create production database
createdb healthai_prod

# Run migrations
npm run migration:run

# Seed initial data (optional)
npm run seed:run
```

### 5. SSL and Security

- Set up SSL certificates (Let's Encrypt recommended)
- Configure CORS for production domains
- Set up rate limiting
- Configure firewall rules
- Enable security headers

### 6. Monitoring and Logging

- Set up application monitoring (PM2, New Relic, etc.)
- Configure log aggregation (ELK stack, CloudWatch, etc.)
- Set up health checks
- Configure alerts for critical errors

### 7. Backup Strategy

- Database backups (daily)
- Application code backups
- Environment configuration backups
- User data backups

## 🔍 Health Checks

### Backend Health Check
```
GET /health
Response: { "status": "ok", "timestamp": "..." }
```

### Database Health Check
```
GET /health/database
Response: { "status": "ok", "database": "connected" }
```

## 📊 Performance Optimization

- Enable gzip compression
- Set up CDN for static assets
- Configure database connection pooling
- Implement caching (Redis)
- Monitor and optimize slow queries

## 🔧 Current Known Issues

### Backend Compilation Warnings
- **Status**: Non-critical TypeScript warnings due to RxJS version conflicts in monorepo
- **Impact**: No runtime impact, build succeeds with warnings
- **Solution**: Warnings are suppressed in production build script
- **Future Fix**: Resolve monorepo dependency conflicts when restructuring

### Frontend API Integration
- **Status**: Currently using mock data, real API integration configured
- **Impact**: Ready for production with environment variable switch
- **Action**: Set `NEXT_PUBLIC_USE_MOCK_API=false` in production

## ✅ Production Readiness Checklist

- [x] Backend builds successfully with build artifacts
- [x] Frontend builds without errors
- [x] Environment configuration setup
- [x] Database schema and migrations ready
- [x] API integration architecture in place
- [x] Security configurations prepared
- [ ] SSL certificates configured
- [ ] Domain and hosting setup
- [ ] Monitoring and logging configured
- [ ] Backup strategy implemented