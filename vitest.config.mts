import { defineConfig } from "vitest/config"

/** Unit and service tests do not import native React Native modules. */
export default defineConfig({ test: { include: ["src/**/*.test.ts"] } })
