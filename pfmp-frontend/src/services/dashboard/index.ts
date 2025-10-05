import { createMockDashboardService } from './mockDashboardService';
import type { DashboardService } from './types';

let instance: DashboardService | null = null;

export function getDashboardService(): DashboardService {
  if (!instance) {
    // Future: switch based on env/flag to real implementation.
    instance = createMockDashboardService();
  }
  return instance;
}

export * from './types';
