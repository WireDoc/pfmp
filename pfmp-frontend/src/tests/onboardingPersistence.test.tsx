import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import { useOnboarding } from '../onboarding/useOnboarding';
import { updateFlags } from '../flags/featureFlags';
import { setDevUserId } from '../dev/devUserState';
import { http, HttpResponse } from './mocks/handlers';
import { mswServer } from './mocks/server';
import type { FinancialProfileSectionKey, FinancialProfileSectionStatus, FinancialProfileSectionStatusValue } from '../services/financialProfileApi';

type StatusOverrides = Partial<Record<FinancialProfileSectionKey, FinancialProfileSectionStatusValue>>;

function buildStatuses(userId: number, overrides: StatusOverrides = {}): FinancialProfileSectionStatus[] {
  const now = new Date().toISOString();
  return Object.entries(overrides).map(([sectionKey, status], index) => ({
    sectionStatusId: `${userId}-${sectionKey}-${index}`,
    userId,
    sectionKey: sectionKey as FinancialProfileSectionKey,
    status: status ?? 'needs_info',
    optOutReason: null,
    optOutAcknowledgedAt: null,
    dataChecksum: null,
    updatedAt: now,
    createdAt: now,
  }));
}

const sectionsEndpoint = 'http://localhost:5052/api/financial-profile/:userId/sections';

function TestConsumer() {
  const ob = useOnboarding();
  return (
    <div>
      <div data-testid="current-step">{ob.current.id}</div>
      <div data-testid="completed-count">{ob.completed.size}</div>
      <div data-testid="hydrated">{ob.hydrated ? 'yes' : 'no'}</div>
      <button onClick={() => { ob.markComplete(); ob.goNext(); }}>advance</button>
      <button onClick={() => { void ob.reset(); }} data-testid="reset-button">reset</button>
      <button onClick={() => { void ob.refresh(); }} data-testid="refresh-button">refresh</button>
    </div>
  );
}

describe('Onboarding persistence integration', () => {
  beforeEach(() => {
    act(() => {
      updateFlags({ onboarding_persistence_enabled: true });
    });
    act(() => {
      setDevUserId(null);
    });
  });

  it('hydrates from backend section statuses', async () => {
    const statusStore = new Map<number, StatusOverrides>([[1, { household: 'completed', 'risk-goals': 'completed' }]]);
    mswServer.use(
      http.get(sectionsEndpoint, ({ params }) => {
        const userId = Number(params.userId);
        return HttpResponse.json(buildStatuses(userId, statusStore.get(userId)));
      }),
    );

    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);

    await waitFor(() => expect(screen.getByTestId('hydrated').textContent).toBe('yes'));
    expect(screen.getByTestId('current-step').textContent).toBe('tsp');
    expect(screen.getByTestId('completed-count').textContent).toBe('2');
  });

  it('treats 404 as fresh start', async () => {
    mswServer.use(
      http.get(sectionsEndpoint, () =>
        HttpResponse.json({ message: 'not found' }, { status: 404 }),
      ),
    );

    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);

    await waitFor(() => expect(screen.getByTestId('hydrated').textContent).toBe('yes'));
    expect(screen.getByTestId('current-step').textContent).toBe('household');
    expect(screen.getByTestId('completed-count').textContent).toBe('0');
  });

  it('marks completion locally when advancing', async () => {
    mswServer.use(
      http.get(sectionsEndpoint, ({ params }) => HttpResponse.json(buildStatuses(Number(params.userId)))),
    );

    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);

    await waitFor(() => expect(screen.getByTestId('hydrated').textContent).toBe('yes'));
    expect(screen.getByTestId('completed-count').textContent).toBe('0');
    expect(screen.getByTestId('current-step').textContent).toBe('household');

    await act(async () => {
      screen.getByText('advance').click();
    });

    expect(screen.getByTestId('completed-count').textContent).toBe('1');
    expect(screen.getByTestId('current-step').textContent).toBe('risk-goals');
  });

  it('rehydrates when dev user switches', async () => {
    const statusStore = new Map<number, StatusOverrides>([
      [101, { household: 'completed' }],
      [202, { household: 'completed', 'risk-goals': 'completed' }],
    ]);

    mswServer.use(
      http.get(sectionsEndpoint, ({ params }) => {
        const userId = Number(params.userId);
        return HttpResponse.json(buildStatuses(userId, statusStore.get(userId)));
      }),
    );

    await act(async () => {
      setDevUserId(101);
    });

    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);

    await waitFor(() => expect(screen.getByTestId('current-step').textContent).toBe('risk-goals'));

    await act(async () => {
      setDevUserId(202);
    });

    await waitFor(() => expect(screen.getByTestId('current-step').textContent).toBe('tsp'));
  });

  it('reset rehydrates using latest section statuses', async () => {
    const statusStore = new Map<number, StatusOverrides>([[1, { household: 'completed', 'risk-goals': 'completed', tsp: 'completed' }]]);

    mswServer.use(
      http.get(sectionsEndpoint, ({ params }) => {
        const userId = Number(params.userId);
        return HttpResponse.json(buildStatuses(userId, statusStore.get(userId)));
      }),
    );

    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);

    await waitFor(() => expect(screen.getByTestId('current-step').textContent).toBe('cash'));

    statusStore.set(1, {});

    await act(async () => {
      screen.getByTestId('reset-button').click();
    });

    await waitFor(() => expect(screen.getByTestId('current-step').textContent).toBe('household'));
    expect(screen.getByTestId('completed-count').textContent).toBe('0');
  });

  it('surfaces baseline state when fetch fails', async () => {
    mswServer.use(
      http.get(sectionsEndpoint, () => HttpResponse.json({ message: 'oops' }, { status: 500 })),
    );

    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);

    await waitFor(() => expect(screen.getByTestId('hydrated').textContent).toBe('yes'));
    expect(screen.getByTestId('current-step').textContent).toBe('household');
    expect(screen.getByTestId('completed-count').textContent).toBe('0');
  });

  it('supports manual refresh after transient failures', async () => {
    let callCount = 0;
    mswServer.use(
      http.get(sectionsEndpoint, ({ params }) => {
        callCount += 1;
        const userId = Number(params.userId);
        if (callCount === 1) {
          return HttpResponse.json({ message: 'temporary' }, { status: 503 });
        }
        return HttpResponse.json(buildStatuses(userId, { household: 'completed', 'risk-goals': 'completed' }));
      }),
    );

    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);

    await waitFor(() => expect(screen.getByTestId('hydrated').textContent).toBe('yes'));
    expect(screen.getByTestId('current-step').textContent).toBe('household');
    expect(callCount).toBe(1);

    await act(async () => {
      screen.getByTestId('refresh-button').click();
    });

    await waitFor(() => expect(screen.getByTestId('current-step').textContent).toBe('tsp'));
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  afterEach(() => {
    mswServer.resetHandlers();
    act(() => {
      setDevUserId(null);
    });
  });
});
