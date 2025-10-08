import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

const plugins: Plugin[] = [react() as Plugin];

export default defineConfig({
  plugins,
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
