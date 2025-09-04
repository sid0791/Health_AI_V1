import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Additional security and performance optimizations
  poweredByHeader: false,
  
  // Disable telemetry to prevent firewall issues in codespaces
  // Note: telemetry config moved to environment variables for Next.js 15
};

export default nextConfig;
