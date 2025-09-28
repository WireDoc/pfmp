/**
 * Minimal component-facing types for dashboard replacements of `any`.
 * Keep fields optional and aligned with actual usage in components.
 */

export interface InvestmentCapacitySummary {
  monthlyInvestableAmount: number;
  recommendedEmergencyFund: number;
  currentLiquidAssets: number;
  investmentRecommendation: string;
  // Allow future expansion without breaking changes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
