import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { OnboardingProvider, useOnboarding } from '../onboarding/OnboardingContext';
import { updateFlags } from '../flags/featureFlags';

// Mock fetch globally
const originalFetch = global.fetch;

function TestConsumer() {
  const ob = useOnboarding();
  return (
    <div>
      <div data-testid="current-step">{ob.current.id}</div>
      <div data-testid="completed-count">{ob.completed.size}</div>
      <div data-testid="hydrated">{ob.hydrated ? 'yes' : 'no'}</div>
      <button onClick={() => { ob.markComplete(); ob.goNext(); }}>advance</button>
    </div>
  );
}

describe('Onboarding persistence integration', () => {
  beforeEach(() => {
    updateFlags({ onboarding_persistence_enabled: true });
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  it('hydrates from existing progress DTO', async () => {
    (global.fetch as any).mockImplementationOnce(async () => new Response(JSON.stringify({
      userId: 'u1',
      completedStepIds: ['demographics'],
      currentStepId: 'risk',
      updatedUtc: new Date().toISOString(),
    }), { status: 200 }));

    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);

    // Allow hydration effect
    await act(async () => {});

    expect(screen.getByTestId('hydrated').textContent).toBe('yes');
    expect(screen.getByTestId('current-step').textContent).toBe('risk');
    expect(screen.getByTestId('completed-count').textContent).toBe('1');
  });

  it('treats 404 as fresh start', async () => {
    (global.fetch as any).mockImplementationOnce(async () => new Response('', { status: 404 }));
    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);
    await act(async () => {});
    expect(screen.getByTestId('hydrated').textContent).toBe('yes');
    expect(screen.getByTestId('current-step').textContent).toBe('demographics');
  });

  it('PATCH called on step completion + NEXT (debounced)', async () => {
    // First call: GET 404
    (global.fetch as any).mockImplementationOnce(async () => new Response('', { status: 404 }));
    // Subsequent calls: PATCH + PUT (fire and forget) just return 200
    ;(global.fetch as any).mockImplementation(async () => new Response('', { status: 200 }));

    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);
    await act(async () => {});

    await act(async () => {
      screen.getByText('advance').click();
      // flush debounce 400ms
      vi.advanceTimersByTime(450);
    });

    const calls = (global.fetch as any).mock.calls.map((c: any) => c[0]);
    expect(calls.some((u: string) => u.includes('/progress/step/'))).toBe(true);
    expect(calls.some((u: string) => u.endsWith('/progress'))).toBe(true); // PUT snapshot
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });
});
