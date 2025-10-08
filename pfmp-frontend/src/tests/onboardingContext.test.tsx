import { describe, it, expect } from 'vitest';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import { useOnboarding } from '../onboarding/useOnboarding';
import { renderHook, act } from '@testing-library/react';

function setup() {
  return renderHook(() => useOnboarding(), {
    wrapper: ({ children }) => <OnboardingProvider skipAutoHydrate>{children}</OnboardingProvider>
  });
}

describe('OnboardingContext', () => {
  it('initializes at first step with 0% progress', () => {
    const { result } = setup();
    expect(result.current.current.index).toBe(0);
    expect(result.current.progressPercent).toBe(0);
  });

  it('marks a step complete and advances', () => {
    const { result } = setup();
    act(() => { result.current.markComplete(); result.current.goNext(); });
    expect(result.current.current.index).toBe(1);
    expect(result.current.completed.size).toBe(1);
    expect(result.current.progressPercent).toBeGreaterThan(0);
  });

  it('does not advance past last step', () => {
    const { result } = setup();
    // Complete all steps
    for (let i = 0; i < result.current.steps.length + 2; i++) {
      act(() => { result.current.markComplete(); result.current.goNext(); });
    }
    expect(result.current.current.index).toBe(result.current.steps.length - 1);
  });
});
