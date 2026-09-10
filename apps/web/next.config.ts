import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Confidential matter data must never enter shared caches or public metadata.
  // Matter routes will use request-scoped reads once they exist (S01+).
};

export default nextConfig;
