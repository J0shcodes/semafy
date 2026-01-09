import { defineConfig } from 'vitest/config';
// import {playwright} from "@vitest/browser-playwright";
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    browser: {
        // enabled: true,
        // provider: playwright(),

    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});