import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

const plugins: Plugin[] = [react() as Plugin];

export default defineConfig({
  plugins,
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    exclude: ['docs/**', '**/dist/**', '**/node_modules/**', 'e2e/**', '**/*.visual.spec.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 1,
      },
    },
    coverage: {
      reporter: ['text', 'lcov'],
    },
    server: {
      deps: {
        inline: ['@mui/x-data-grid']  // Inline MUI DataGrid to avoid CSS import issues
      }
    }
  },
});
