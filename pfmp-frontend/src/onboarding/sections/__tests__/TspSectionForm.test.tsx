import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TspSectionForm from '../TspSectionForm';

vi.mock('../../services/financialProfileApi', () => ({
  fetchTspProfile: vi.fn(async () => ({
    contributionRatePercent: 5,
    lifecyclePositions: [
      { fundCode: 'G', contributionPercent: 100, units: 0 },
    ],
  })),
  upsertTspProfile: vi.fn(async () => {}),
}));

describe('TspSectionForm', () => {
  it('renders contribution rate and editable fund fields only', async () => {
    render(<TspSectionForm userId={1} onStatusChange={() => {}} currentStatus={'needs_info'} />);
    const rate = await screen.findByLabelText(/Contribution rate/);
    expect(rate).toBeInTheDocument();
    // Should NOT render read-only computed fields on onboarding form
    expect(screen.queryByLabelText('Current balance')).toBeNull();
    expect(screen.queryByLabelText('Current mix (%)')).toBeNull();
    expect(screen.queryByLabelText('TSP total')).toBeNull();
    expect(screen.queryByLabelText('As of')).toBeNull();
  });
});
