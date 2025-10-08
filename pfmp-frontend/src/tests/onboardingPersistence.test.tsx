import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import { useOnboarding } from '../onboarding/useOnboarding';
import { updateFlags } from '../flags/featureFlags';
import { setDevUserId } from '../dev/devUserState';
import { createOnboardingApiMock, http, HttpResponse } from './mocks/handlers';
import { mswServer } from './mocks/server';
import type { OnboardingProgressDTO } from '../onboarding/persistence';
import type { OnboardingStepId } from '../onboarding/steps';

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
    act(() => {
      setDevUserId(null);
    });
  });

  it('hydrates from existing progress DTO', async () => {
    const dto: OnboardingProgressDTO = {
      userId: 'dev-user',
      completedStepIds: ['demographics'] as OnboardingStepId[],
      currentStepId: 'risk',
      updatedUtc: new Date().toISOString(),
    };
    const api = createOnboardingApiMock({ 'dev-user': dto });
    mswServer.use(...api.handlers);

    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);

    await waitFor(() => expect(screen.getByTestId('hydrated').textContent).toBe('yes'));
    expect(screen.getByTestId('hydrated').textContent).toBe('yes');
    expect(screen.getByTestId('current-step').textContent).toBe('risk');
    expect(screen.getByTestId('completed-count').textContent).toBe('1');
  });

  it('treats 404 as fresh start', async () => {
    const api = createOnboardingApiMock();
    mswServer.use(...api.handlers);
    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);
    await waitFor(() => expect(screen.getByTestId('hydrated').textContent).toBe('yes'));
    expect(screen.getByTestId('hydrated').textContent).toBe('yes');
    expect(screen.getByTestId('current-step').textContent).toBe('demographics');
  });

  it('PATCH called on step completion + NEXT (debounced)', async () => {
    const api = createOnboardingApiMock();
    mswServer.use(...api.handlers);

    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);
    await waitFor(() => expect(screen.getByTestId('hydrated').textContent).toBe('yes'));

    await act(async () => {
      screen.getByText('advance').click();
    });

    await waitFor(() => {
      expect(api.patchLog.length).toBeGreaterThan(0);
      expect(api.putLog.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('rehydrates when dev user switches', async () => {
    const firstDto: OnboardingProgressDTO = {
      userId: '101',
      completedStepIds: ['demographics'] as OnboardingStepId[],
      currentStepId: 'risk',
      updatedUtc: new Date().toISOString(),
    };
    const secondDto: OnboardingProgressDTO = {
      userId: '202',
      completedStepIds: ['demographics', 'risk'] as OnboardingStepId[],
      currentStepId: 'income',
      updatedUtc: new Date().toISOString(),
    };
    const api = createOnboardingApiMock({
      '101': firstDto,
      '202': secondDto,
    });
    mswServer.use(...api.handlers);

    await act(async () => {
      setDevUserId(101);
    });

    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);

    await waitFor(() => expect(screen.getByTestId('current-step').textContent).toBe('risk'));

    await act(async () => {
      setDevUserId(202);
    });

    await waitFor(() => expect(screen.getByTestId('current-step').textContent).toBe('income'));
    expect(api.getState('101')?.currentStepId).toBe('risk');
    expect(api.getState('202')?.currentStepId).toBe('income');
  });

  it('reset API clears progress and rehydrates baseline', async () => {
    const initialDto: OnboardingProgressDTO = {
      userId: 'dev-user',
      completedStepIds: ['demographics', 'risk'] as OnboardingStepId[],
      currentStepId: 'tsp',
      updatedUtc: new Date().toISOString(),
    };
    const api = createOnboardingApiMock({ 'dev-user': initialDto });
    mswServer.use(...api.handlers);

    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);

    await waitFor(() => expect(screen.getByTestId('current-step').textContent).toBe('tsp'));

    await act(async () => {
      screen.getByTestId('reset-button').click();
    });

    await waitFor(() => {
      expect(api.resetLog.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('current-step').textContent).toBe('demographics');
    });
    const snapshot = api.getState('dev-user');
    expect(snapshot?.currentStepId).toBe('demographics');
    expect(snapshot?.completedStepIds).toEqual([]);
  });

  it('surfaces default state when fetch fails', async () => {
    mswServer.use(
      http.get('http://localhost/api/onboarding/progress', () =>
        HttpResponse.json({ message: 'oops' }, { status: 500 }),
      ),
    );

    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>);

    await waitFor(() => expect(screen.getByTestId('hydrated').textContent).toBe('yes'));
    expect(screen.getByTestId('current-step').textContent).toBe('demographics');
  });

  afterEach(() => {
    act(() => {
      setDevUserId(null);
    });
  });
});
