import { describe, it, expect, afterEach, vi } from 'vitest';
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

function toUrl(input: RequestInfo | URL): string {
	if (typeof input === 'string') return input;
	if (input instanceof URL) return input.toString();
	if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
	return String(input);
}

afterEach(() => {
	updateFlags({ dashboard_wave4_real_data: false });
	__resetDashboardServiceForTest();
	vi.restoreAllMocks();
	if (originalFetch) {
		global.fetch = originalFetch;
	}
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
		const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
			const url = toUrl(input);
			if (url.includes('/api/dashboard/summary')) {
				return new Response(JSON.stringify(apiSummary), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return Promise.reject(new Error(`Unexpected fetch call during dashboard selection test: ${url}`));
		});
		updateFlags({ dashboard_wave4_real_data: true });
		const service = getDashboardService();
		const data = await service.load();
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0]?.[0]).toContain('/api/dashboard/summary');
		expect(data.netWorth.netWorth.amount).toBe(apiSummary.netWorth.netWorth.amount);
	});

	it('updates cached instance when flag toggles between modes', async () => {
		updateFlags({ dashboard_wave4_real_data: false });
		const initialService = getDashboardService();
		const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
			const url = toUrl(input);
			if (url.includes('/api/dashboard/summary')) {
				return new Response(JSON.stringify(apiSummary), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return Promise.reject(new Error(`Unexpected fetch call during dashboard selection test: ${url}`));
		});
		updateFlags({ dashboard_wave4_real_data: true });
		const apiService = getDashboardService();
		expect(apiService).not.toBe(initialService);
		await apiService.load();
		updateFlags({ dashboard_wave4_real_data: false });
		const backToMock = getDashboardService();
		expect(backToMock).not.toBe(apiService);
		const data = await backToMock.load();
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(data.netWorth.netWorth.amount).toBe(182_500);
	});
});
