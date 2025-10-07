import { http, HttpResponse } from 'msw';
import type { OnboardingProgressDTO } from '../../onboarding/persistence';

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

const onboardingProgressMatcher = /\/api\/onboarding\/progress(?:\?.*)?$/;
const onboardingStepMatcher = /\/api\/onboarding\/progress\/step\/(?:[^/?]+)(?:\?.*)?$/;
const onboardingResetMatcher = /\/api\/onboarding\/progress\/reset(?:\?.*)?$/;

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
  http.get(onboardingProgressMatcher, () =>
    HttpResponse.json(
      { message: 'No mock registered for onboarding progress' },
      { status: 404 },
    ),
  ),
  http.put(onboardingProgressMatcher, () => HttpResponse.json({}, { status: 204 })),
  http.patch(onboardingStepMatcher, () => HttpResponse.json({}, { status: 204 })),
  http.post(onboardingResetMatcher, () => HttpResponse.json({}, { status: 204 })),
];

export const mockDashboardSummary = (data: any, init?: ResponseInit) =>
  createDashboardSummaryHandlers(() => HttpResponse.json(data, init));

export interface OnboardingApiMock {
  handlers: ReturnType<typeof http.get>[];
  getState(userId?: string): OnboardingProgressDTO | null;
  setState(userId: string, dto: OnboardingProgressDTO | null): void;
  patchLog: Array<{ userId: string; stepId: string; payload: { data?: unknown; completed?: boolean } }>;
  putLog: Array<{ userId: string; body: Omit<OnboardingProgressDTO, 'updatedUtc'> }>;
  resetLog: Array<{ userId: string }>;
}

function deriveUserId(url: URL): string {
  return url.searchParams.get('userId') ?? 'dev-user';
}

function timestamp(): string {
  return new Date().toISOString();
}

export function createOnboardingApiMock(initial?: Record<string, OnboardingProgressDTO | null>): OnboardingApiMock {
  const store = new Map<string, OnboardingProgressDTO | null>(Object.entries(initial ?? {}));
  const patchLog: OnboardingApiMock['patchLog'] = [];
  const putLog: OnboardingApiMock['putLog'] = [];
  const resetLog: OnboardingApiMock['resetLog'] = [];

  const handlers: OnboardingApiMock['handlers'] = [
    http.get(onboardingProgressMatcher, ({ request }) => {
      const key = deriveUserId(new URL(request.url));
      const dto = store.get(key) ?? null;
      if (!dto) {
        return HttpResponse.json({ message: 'Not found' }, { status: 404 });
      }
      return HttpResponse.json(dto);
    }),
    http.put(onboardingProgressMatcher, async ({ request }) => {
      const key = deriveUserId(new URL(request.url));
      const body = (await request.json()) as Omit<OnboardingProgressDTO, 'updatedUtc'>;
      const dto: OnboardingProgressDTO = { ...body, updatedUtc: timestamp() };
      store.set(key, dto);
      putLog.push({ userId: key, body });
      return HttpResponse.json(dto, { status: 200 });
    }),
    http.patch(onboardingStepMatcher, async ({ request, params }) => {
      const key = deriveUserId(new URL(request.url));
      const stepId = (params?.stepId ?? '') as string;
      const payload = (await request.json()) as { data?: unknown; completed?: boolean };
      const fallback: OnboardingProgressDTO = {
        userId: key,
        completedStepIds: [],
        currentStepId: stepId as OnboardingProgressDTO['currentStepId'],
        stepPayloads: {},
        updatedUtc: timestamp(),
      };
      const current = store.get(key) ?? fallback;
      const completed = new Set(current.completedStepIds ?? []);
      if (payload.completed) {
        completed.add(stepId as OnboardingProgressDTO['currentStepId']);
      }
      const nextPayloads = { ...(current.stepPayloads ?? {}) };
      if (payload.data !== undefined) {
        nextPayloads[stepId] = payload.data;
      }
      const next: OnboardingProgressDTO = {
        ...current,
        completedStepIds: Array.from(completed),
        stepPayloads: nextPayloads,
        updatedUtc: timestamp(),
      };
      store.set(key, next);
      patchLog.push({ userId: key, stepId, payload });
      return HttpResponse.json(next, { status: 200 });
    }),
    http.post(onboardingResetMatcher, ({ request }) => {
      const key = deriveUserId(new URL(request.url));
      store.delete(key);
      resetLog.push({ userId: key });
      return HttpResponse.json({}, { status: 200 });
    }),
  ];

  return {
    handlers,
    getState(userId = 'dev-user') {
      return store.get(userId) ?? null;
    },
    setState(userId, dto) {
      if (dto) {
        store.set(userId, dto);
      } else {
        store.delete(userId);
      }
    },
    patchLog,
    putLog,
    resetLog,
  };
}

export { http, HttpResponse };
