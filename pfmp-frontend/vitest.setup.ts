import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach } from 'vitest';
import { mswServer } from './src/tests/mocks/server';

mswServer.listen({ onUnhandledRequest: 'error' });

mswServer.events.on('request:unhandled', ({ request }) => {
  console.error(`[MSW] Unhandled ${request.method} ${request.url}`);
});

afterEach(() => {
  mswServer.resetHandlers();
});

afterAll(() => {
  mswServer.close();
});

// Minimal suppression for noisy React act warnings produced by environment limitations.
// We preserve all other errors. This targets messages about:
// - "not configured to support act(...)"
// - "was not wrapped in act(...)"
// If underlying environment configuration changes to properly support act, this can be removed.
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string') {
    const msg = args[0];
    if (/not configured to support act\(\)/i.test(msg) || /was not wrapped in act\(/i.test(msg)) {
      return; // suppress only these specific, known noisy warnings
    }
  }
  originalConsoleError(...args as Parameters<typeof originalConsoleError>);
};
