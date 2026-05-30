import { describe, it, expect } from 'vitest';
import {
  INCOME_FREQUENCY_FACTORS,
  monthlyEquivalent,
  type IncomeStreamFrequency,
} from '../../services/financialProfileApi';

describe('Wave 14 P2.5 — income stream frequency conversion', () => {
  it.each<[IncomeStreamFrequency, number, number]>([
    ['Weekly', 200, 866.67],
    ['Biweekly', 450, 975.00],
    ['Semimonthly', 487.50, 975.00],
    ['Monthly', 975, 975.00],
  ])('%s × per-period $%s → ≈ $%s/mo', (freq, perPeriod, expectedMonthly) => {
    const result = monthlyEquivalent(perPeriod, freq);
    expect(Number(result.toFixed(2))).toBeCloseTo(expectedMonthly, 2);
  });

  it('returns 0 for null or zero per-period amount', () => {
    expect(monthlyEquivalent(null, 'Biweekly')).toBe(0);
    expect(monthlyEquivalent(0, 'Weekly')).toBe(0);
    expect(monthlyEquivalent(undefined, 'Monthly')).toBe(0);
  });

  it('exposes factors matching the backend IncomeStreamFrequencyExtensions.MonthlyFactor()', () => {
    // Keep these in sync with PFMP-API/Models/FinancialProfile/IncomeStreamProfile.cs
    expect(INCOME_FREQUENCY_FACTORS.Weekly).toBeCloseTo(52 / 12, 6);
    expect(INCOME_FREQUENCY_FACTORS.Biweekly).toBeCloseTo(26 / 12, 6);
    expect(INCOME_FREQUENCY_FACTORS.Semimonthly).toBe(2);
    expect(INCOME_FREQUENCY_FACTORS.Monthly).toBe(1);
  });
});
