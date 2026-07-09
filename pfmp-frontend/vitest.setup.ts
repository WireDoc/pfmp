import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeEach } from 'vitest';
import { mswServer } from './src/tests/mocks/server';
import { setAuthToken } from './src/services/authToken';

mswServer.listen({ onUnhandledRequest: 'error' });

mswServer.events.on('request:unhandled', ({ request }) => {
  console.error(`[MSW] Unhandled ${request.method} ${request.url}`);
});

// Wave 25: every axios/fetch transport waits on whenAuthReady() before sending.
// Tests never mint a real token, so without one pre-set EVERY request stalls
// for the full 2s ready-timeout — longer than most findBy*/waitFor timeouts
// (1s), which made dozens of integration tests flaky-to-failing. Seed a fake
// token per test so requests fire immediately (MSW handlers ignore the header).
beforeEach(() => {
  setAuthToken('test-suite-token', new Date(Date.now() + 60 * 60 * 1000));
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
