import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DevFlagsPanel } from '../components/dev/DevFlagsPanel';
import { updateFlags, isFeatureEnabled } from '../flags/featureFlags';

// Panel relies directly on feature flag store via hooks; no provider needed.

describe('DevFlagsPanel', () => {
  it('toggles a flag and reflects change in store', () => {
    // Ensure known initial state
    updateFlags({ onboarding_enabled: false });
    render(<DevFlagsPanel />);

    // Open panel
    fireEvent.click(screen.getByRole('button', { name: /flags/i }));

    // Find checkbox for onboarding_enabled
    const checkbox = screen.getByLabelText('onboarding_enabled') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    // Toggle it
    fireEvent.click(checkbox);

    // Should be checked now and reflected in store
    expect(checkbox.checked).toBe(true);
    expect(isFeatureEnabled('onboarding_enabled')).toBe(true);
  });
});
