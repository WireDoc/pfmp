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
