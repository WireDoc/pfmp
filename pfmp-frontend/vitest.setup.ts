import '@testing-library/jest-dom';
import { afterAll, afterEach } from 'vitest';
import { mswServer } from './src/tests/mocks/server';

mswServer.listen({ onUnhandledRequest: 'error' });
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());
