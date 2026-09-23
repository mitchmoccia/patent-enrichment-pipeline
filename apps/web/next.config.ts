import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Internal workspace packages ship TypeScript source (no committed dist), so
  // Next transpiles them directly. This keeps a clean CI checkout buildable.
  transpilePackages: [
    "@patent/contracts",
    "@patent/db",
    "@patent/application",
    "@patent/documents",
    "@patent/security",
    "@patent/ai",
    "@patent/billing",
    "@patent/workflows",
  ],
  // Confidential matter data must never enter shared caches or public metadata.
  // Matter routes will use request-scoped reads once they exist (S01+).
};

export default nextConfig;
