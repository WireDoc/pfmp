import { http, HttpResponse } from 'msw';

const emptyModule = () =>
  HttpResponse.text('export {}\n', {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
    },
  });

const moduleRouteExpressions = [
  /\/src\/.*/,
  'http://localhost/src/:path*',
] as const;

const dashboardSummaryMatchers = [
  'http://localhost/api/dashboard/summary',
  'http://localhost:3000/api/dashboard/summary',
  'http://127.0.0.1:3000/api/dashboard/summary',
  'http://[::1]:3000/api/dashboard/summary',
  /\/api\/dashboard\/summary$/,
] as const;

const createDashboardSummaryHandlers = (
  resolver: Parameters<typeof http.get>[1],
) => dashboardSummaryMatchers.map((matcher) => http.get(matcher, resolver));

export const defaultHandlers = [
  ...moduleRouteExpressions.map((expr) =>
    http.get(expr as string | RegExp, () => emptyModule()),
  ),
  ...createDashboardSummaryHandlers(() =>
    HttpResponse.json(
      { message: 'No mock registered for dashboard summary' },
      { status: 501 },
    ),
  ),
];

export const mockDashboardSummary = (data: any, init?: ResponseInit) =>
  createDashboardSummaryHandlers(() => HttpResponse.json(data, init));

export { http, HttpResponse };
