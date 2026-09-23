import { resolve } from "node:path";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Load workspace-root .env so tests can reach the Neon dev database.
config({ path: resolve(process.cwd(), "../../.env") });

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
