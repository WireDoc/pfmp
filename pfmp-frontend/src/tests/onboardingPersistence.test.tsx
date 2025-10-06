import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { OnboardingProvider, useOnboarding } from '../onboarding/OnboardingContext';
import { updateFlags } from '../flags/featureFlags';
import { setDevUserId } from '../dev/devUserState';

// Mock fetch globally
let fetchSpy: ReturnType<typeof vi.spyOn> | null = null;

function TestConsumer() {
  const ob = useOnboarding();
  return (
    <div>
      <div data-testid="current-step">{ob.current.id}</div>
      <div data-testid="completed-count">{ob.completed.size}</div>
      <div data-testid="hydrated">{ob.hydrated ? 'yes' : 'no'}</div>
      <button onClick={() => { ob.markComplete(); ob.goNext(); }}>advance</button>
      <button onClick={() => { void ob.reset(); }} data-testid="reset-button">reset</button>
    </div>
  );
}

describe('Onboarding persistence integration', () => {
  beforeEach(() => {
    act(() => {
      updateFlags({ onboarding_persistence_enabled: true });
    });
    fetchSpy = vi.spyOn(global, 'fetch') as unknown as ReturnType<typeof vi.spyOn>;
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
    vi.useFakeTimers();
    // First call: GET 404
    (global.fetch as any).mockImplementationOnce(async () => new Response('', { status: 404 }));
    // Subsequent calls: PATCH + PUT (fire and forget) just return 200
    ;(global.fetch as any).mockImplementation(async () => new Response('', { status: 200 }));

    try {
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
    } finally {
      vi.useRealTimers();
    }
  });

  it('rehydrates when dev user switches', async () => {
    const firstDto = {
      userId: 'dev-1',
      completedStepIds: ['demographics'],
      currentStepId: 'risk',
      updatedUtc: new Date().toISOString(),
    };
    const secondDto = {
      userId: 'dev-2',
      completedStepIds: ['demographics', 'risk'],
      currentStepId: 'income',
      updatedUtc: new Date().toISOString(),
    };
    const getQueue = [
      new Response(JSON.stringify(firstDto), { status: 200 }),
      new Response(JSON.stringify(secondDto), { status: 200 })
    ];
    (global.fetch as any).mockImplementation(async (_url: string, init?: RequestInit) => {
      if (!init || !init.method || init.method === 'GET') {
        const res = getQueue.shift();
        return res ?? new Response('', { status: 404 });
      }
      return new Response('', { status: 200 });
    });

    setDevUserId(101);

    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);

    await waitFor(() => expect(screen.getByTestId('current-step').textContent).toBe('risk'));

    await act(async () => {
      setDevUserId(202);
    });

    await waitFor(() => expect(screen.getByTestId('current-step').textContent).toBe('income'));
    expect((global.fetch as any).mock.calls.filter(([, init]: [any, RequestInit | undefined]) => !init || init.method === undefined || init.method === 'GET').length).toBe(2);
  });

  it('reset API clears progress and rehydrates baseline', async () => {
    const initialDto = {
      userId: 'dev-1',
      completedStepIds: ['demographics', 'risk'],
      currentStepId: 'tsp',
      updatedUtc: new Date().toISOString(),
    };
    let resetCallCount = 0;
    const getQueue = [
      new Response(JSON.stringify(initialDto), { status: 200 }),
      new Response('', { status: 404 })
    ];

    (global.fetch as any).mockImplementation(async (_url: string, init?: RequestInit) => {
      if (!init || !init.method || init.method === 'GET') {
        const res = getQueue.shift();
        return res ?? new Response('', { status: 404 });
      }
      if (init.method === 'POST') {
        resetCallCount += 1;
        return new Response('', { status: 200 });
      }
      return new Response('', { status: 200 });
    });

    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);

    await waitFor(() => expect(screen.getByTestId('current-step').textContent).toBe('tsp'));

    await act(async () => {
      screen.getByTestId('reset-button').click();
    });

    await waitFor(() => expect(screen.getByTestId('current-step').textContent).toBe('demographics'));

    expect(resetCallCount).toBeGreaterThanOrEqual(1);
  });

  afterEach(() => {
    vi.useRealTimers();
    fetchSpy?.mockRestore();
    fetchSpy = null;
  });
});
