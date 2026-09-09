import { defineConfig } from "@playwright/test";

// Minimal config for plain Node-context unit tests (no browser fixtures
// used anywhere yet, so no browser binaries are launched or required).
// Add `projects`/`use` here if browser-driven e2e tests are introduced
// later.
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.test.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
});
