import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Disable telemetry to prevent firewall issues in restricted environments
  telemetry: false,
  
  // Additional security and performance optimizations
  poweredByHeader: false,
  experimental: {
    // Disable telemetry in experimental features too
    telemetry: false
  }
};

export default nextConfig;
