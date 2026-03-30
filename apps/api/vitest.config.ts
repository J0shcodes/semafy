import { defineConfig } from 'vitest/config';
import tsConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsConfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    // include: ["src/**/*.integration.test.ts", "src/routes/**/*.test.ts", "src/middleware/**/*.test.ts"],
    include: ["src/**/*.integration.test.ts", "src/**/**/*.test.ts"],
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 15000,
  },
});
