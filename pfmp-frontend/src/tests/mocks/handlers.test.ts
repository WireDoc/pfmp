import { describe, it, expect } from 'vitest';
import { mswServer } from './server';
import { mockDashboardAlerts, mockDashboardAdvice, mockDashboardTasks } from './handlers';

const ALERTS_URL = 'http://localhost:3000/api/alerts?userId=1&isActive=true';
const ADVICE_URL = 'http://localhost:3000/api/Advice/user/1?status=Proposed&includeDismissed=false';
const TASKS_URL = 'http://localhost:3000/api/Tasks?userId=1&status=Pending';

describe('dashboard MSW handlers', () => {
  it('responds with 200 for alerts advice and tasks', async () => {
    mswServer.use(
      ...mockDashboardAlerts([]),
      ...mockDashboardAdvice([]),
      ...mockDashboardTasks([]),
    );

    const [alerts, advice, tasks] = await Promise.all([
      fetch(ALERTS_URL),
      fetch(ADVICE_URL),
      fetch(TASKS_URL),
    ]);

    expect(alerts.status).toBe(200);
    expect(advice.status).toBe(200);
    expect(tasks.status).toBe(200);
  });
});
