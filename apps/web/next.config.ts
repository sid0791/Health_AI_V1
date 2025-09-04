import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Additional security and performance optimizations
  poweredByHeader: false,
  
  // Disable telemetry to prevent firewall issues in codespaces
  experimental: {
    telemetry: false,
  },
  
  // Environment-based telemetry disable for Next.js 15+ compatibility
  ...(process.env.NEXT_TELEMETRY_DISABLED === '1' && {
    telemetry: false
  }),
};

export default nextConfig;
