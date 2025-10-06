import { createMockDashboardService } from './mockDashboardService';
import { createApiDashboardService } from './apiDashboardService';
import type { DashboardService } from './types';
import { isFeatureEnabled } from '../../flags/featureFlags';

type DashboardServiceMode = 'mock' | 'api';

let instance: DashboardService | null = null;
let instanceMode: DashboardServiceMode | null = null;

function resolveMode(): DashboardServiceMode {
  return isFeatureEnabled('dashboard_wave4_real_data') ? 'api' : 'mock';
}

export function getDashboardService(): DashboardService {
  const desiredMode = resolveMode();
  if (!instance || instanceMode !== desiredMode) {
    instance = desiredMode === 'api'
      ? createApiDashboardService()
      : createMockDashboardService();
    instanceMode = desiredMode;
  }
  return instance;
}

export function __resetDashboardServiceForTest() {
  instance = null;
  instanceMode = null;
}

export * from './types';
