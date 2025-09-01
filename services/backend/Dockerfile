# Multi-stage Docker build for HealthCoachAI Backend
# Production-optimized with security hardening

# ===============================================
# Build Stage
# ===============================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S healthai -u 1001

# Install pnpm globally
RUN npm install -g pnpm@8.15.0

# Copy package files
COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/backend/package.json ./services/backend/
COPY packages/design-system/package.json ./packages/design-system/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Prune development dependencies
RUN pnpm prune --prod

# ===============================================
# Production Stage
# ===============================================
FROM node:20-alpine AS production

# Install security updates
RUN apk upgrade --no-cache

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S healthai -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=healthai:nodejs /app/services/backend/dist ./dist
COPY --from=builder --chown=healthai:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=healthai:nodejs /app/services/backend/package.json ./package.json

# Create data directories
RUN mkdir -p /app/data/evaluation-datasets /app/data/policy-tables /app/logs
RUN chown -R healthai:nodejs /app/data /app/logs

# Create AI policy table file
COPY --chown=healthai:nodejs services/backend/data/ai-policy-table.json /app/data/policy-tables/

# Set file permissions
RUN chmod -R 755 /app/data
RUN chmod -R 755 /app/logs

# Switch to non-root user
USER healthai

# Expose port
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV AI_POLICY_TABLE_PATH=/app/data/policy-tables/ai-policy-table.json
ENV AI_EVALUATION_DATASETS_PATH=/app/data/evaluation-datasets

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js

# Start the application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]