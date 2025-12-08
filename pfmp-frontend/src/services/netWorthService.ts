import api from './api';

// Response types matching backend DTOs

export interface TimelineDataPoint {
  date: string; // DateOnly serializes as string
  totalNetWorth: number;
  investments: number;
  cash: number;
  realEstate: number;
  retirement: number;
  liabilities: number;
}

export interface TimelineSummary {
  startValue: number;
  endValue: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  average: number;
}

export interface TimelineResponse {
  userId: number;
  period: string;
  startDate: string;
  endDate: string;
  dataPoints: number;
  snapshots: TimelineDataPoint[];
  summary: TimelineSummary;
}

export interface CurrentNetWorthResponse {
  userId: number;
  hasData: boolean;
  message?: string;
  snapshotDate?: string;
  totalNetWorth: number;
  investments: number;
  cash: number;
  realEstate: number;
  retirement: number;
  liabilities: number;
  change: number;
  changePercent: number;
  previousDate?: string;
}

export interface SparklinePoint {
  date: string;
  value: number;
}

export interface SparklineResponse {
  userId: number;
  dataPoints: number;
  minDataPointsRequired: number;
  hasEnoughData: boolean;
  points: SparklinePoint[];
  change: number;
  changePercent: number;
  currentValue: number;
}

export type TimelinePeriod = '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';

/**
 * Net Worth Timeline API Service
 * Wave 10: Background Jobs & Automation - Phase 3
 */
export const netWorthService = {
  /**
   * Get timeline data for charts
   */
  async getTimeline(userId: number, period: TimelinePeriod = '3M'): Promise<TimelineResponse> {
    const { data } = await api.get<TimelineResponse>(
      `/dashboard/net-worth/timeline`,
      { params: { userId, period } }
    );
    return data;
  },

  /**
   * Get current net worth with change from previous snapshot
   */
  async getCurrentNetWorth(userId: number): Promise<CurrentNetWorthResponse> {
    const { data } = await api.get<CurrentNetWorthResponse>(
      `/dashboard/net-worth/current`,
      { params: { userId } }
    );
    return data;
  },

  /**
   * Get sparkline data (last 30 days) for dashboard widget
   */
  async getSparkline(userId: number): Promise<SparklineResponse> {
    const { data } = await api.get<SparklineResponse>(
      `/dashboard/net-worth/sparkline`,
      { params: { userId } }
    );
    return data;
  },

  /**
   * Trigger manual snapshot for a user
   */
  async triggerSnapshot(userId: number): Promise<{ success: boolean; totalNetWorth?: number }> {
    const { data } = await api.post<{ success: boolean; totalNetWorth?: number }>(
      `/accounts/snapshot`,
      null,
      { params: { userId } }
    );
    return data;
  },
};

export default netWorthService;
