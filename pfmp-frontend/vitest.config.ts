import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()] as any,
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    exclude: ['docs/**', '**/dist/**', '**/node_modules/**'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
});
