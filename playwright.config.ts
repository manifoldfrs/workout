import { defineConfig } from "@playwright/test"

/** Browser tests exercise the real local preview at an iPhone-sized viewport. */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:8081",
    viewport: { width: 430, height: 932 },
    isMobile: true,
    hasTouch: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run web --port 8081 --host localhost",
    url: "http://localhost:8081",
    timeout: 120_000,
    reuseExistingServer: false,
    env: { CI: "1", EXPO_NO_TELEMETRY: "1" },
  },
})
