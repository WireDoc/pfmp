import { describe, it, expect, afterEach, vi } from 'vitest';
import { mockDashboardSummary } from './mocks/handlers';
import { mswServer } from './mocks/server';
import { getDashboardService, __resetDashboardServiceForTest } from '../services/dashboard';
import { updateFlags } from '../flags/featureFlags';

const originalFetch = global.fetch;

const apiSummary = {
	netWorth: {
		totalAssets: { amount: 1_234, currency: 'USD' },
		totalLiabilities: { amount: 345, currency: 'USD' },
		netWorth: { amount: 889, currency: 'USD' },
		lastUpdated: '2025-10-06T12:00:00Z',
	},
	accounts: [],
	insights: [],
} as const;

afterEach(() => {
	updateFlags({ dashboard_wave4_real_data: false });
	__resetDashboardServiceForTest();
	vi.restoreAllMocks();
	if (originalFetch) {
		global.fetch = originalFetch;
	}
	mswServer.resetHandlers();
});

describe('dashboard service selection', () => {
	it('uses mock service when real-data flag disabled', async () => {
		const fetchSpy = vi.spyOn(global, 'fetch');
		updateFlags({ dashboard_wave4_real_data: false });
		const service = getDashboardService();
		const data = await service.load();
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(data.accounts.length).toBeGreaterThan(0);
		// Mock service net worth is deterministic (250000 - 67500 = 182500)
		expect(data.netWorth.netWorth.amount).toBe(182_500);
	});

	it('switches to API service when real-data flag enabled', async () => {
		const fetchSpy = vi.spyOn(global, 'fetch');
		mswServer.use(...mockDashboardSummary(apiSummary));
		updateFlags({ dashboard_wave4_real_data: true });
		const service = getDashboardService();
		const data = await service.load();
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('/api/dashboard/summary');
		expect(data.netWorth.netWorth.amount).toBe(apiSummary.netWorth.netWorth.amount);
	});

	it('updates cached instance when flag toggles between modes', async () => {
		updateFlags({ dashboard_wave4_real_data: false });
		const initialService = getDashboardService();
		const fetchSpy = vi.spyOn(global, 'fetch');
		mswServer.use(...mockDashboardSummary(apiSummary));
		updateFlags({ dashboard_wave4_real_data: true });
		const apiService = getDashboardService();
		expect(apiService).not.toBe(initialService);
		await apiService.load();
		updateFlags({ dashboard_wave4_real_data: false });
		const backToMock = getDashboardService();
		expect(backToMock).not.toBe(apiService);
		const data = await backToMock.load();
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(data.netWorth.netWorth.amount).toBe(182_500);
	});
});
