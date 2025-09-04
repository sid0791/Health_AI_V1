# 🔒 Telemetry and Firewall Configuration

## Issue Resolution: Next.js Telemetry Blocked by Firewall

This document explains how HealthCoach AI handles telemetry and firewall restrictions in GitHub Codespaces and other restricted environments.

### ❌ Problem
Next.js attempts to send telemetry data to `telemetry.nextjs.org`, which can be blocked by:
- Corporate firewalls
- GitHub Codespaces security restrictions
- Network proxy configurations
- Privacy-focused environments

### ✅ Solution Implemented

We have completely disabled all telemetry data collection through multiple layers:

#### 1. Environment Variables
```bash
NEXT_TELEMETRY_DISABLED=1
npm_config_disable_telemetry=true  
DO_NOT_TRACK=1
TELEMETRY_DISABLED=1
```

#### 2. Next.js Configuration (`apps/web/next.config.ts`)
```typescript
const nextConfig: NextConfig = {
  telemetry: false,
  experimental: {
    telemetry: false
  }
};
```

#### 3. DevContainer Configuration
```json
{
  "containerEnv": {
    "NEXT_TELEMETRY_DISABLED": "1"
  }
}
```

#### 4. CLI Disable Command
Automatically runs during setup:
```bash
npx next telemetry disable
```

### 🛡️ Privacy Benefits

By disabling telemetry, HealthCoach AI ensures:
- **Zero external data transmission** to telemetry servers
- **No usage analytics** sent to third parties
- **No build information** shared externally
- **No performance metrics** transmitted
- **Complete privacy** of your development activities

### 🔍 Verification

To verify telemetry is disabled:

1. **Check Next.js telemetry status:**
   ```bash
   npx next telemetry status
   ```

2. **Verify environment variables:**
   ```bash
   echo $NEXT_TELEMETRY_DISABLED  # Should output: 1
   ```

3. **Monitor network requests:**
   - No requests to `telemetry.nextjs.org`
   - No external telemetry endpoints contacted

### 🚀 Quick Start (Telemetry-Free)

1. Open in GitHub Codespaces - telemetry automatically disabled
2. Run `./start-app.sh` - includes telemetry prevention
3. Build and develop without any external data transmission

### 🔧 Manual Configuration

If setting up manually, ensure these environment variables are set:

```bash
# In your shell or .env file
export NEXT_TELEMETRY_DISABLED=1
export npm_config_disable_telemetry=true
export DO_NOT_TRACK=1
```

### 📋 Files Modified

- `.env` - Global telemetry disable settings
- `apps/web/.env.local` - Web app telemetry settings  
- `apps/web/next.config.ts` - Next.js configuration (environment-based for v15)
- `.devcontainer/devcontainer.json` - Container environment with improved error handling
- `.devcontainer/setup.sh` - Setup script with CLI disable and retry logic
- `start-app.sh` - Runtime telemetry prevention
- `verify-codespace.sh` - New verification script for troubleshooting

### ✅ Result

**Zero firewall conflicts** - The application runs completely offline regarding telemetry, with no external requests that could be blocked by security policies.

**🔧 Verification Tool**: Run `./verify-codespace.sh` to verify your setup is working correctly and troubleshoot any issues.

**📱 Improved Reliability**: Enhanced setup process with better error handling, retry logic, and timeout prevention for robust codespace creation.