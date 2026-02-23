import { http, HttpResponse } from 'msw';
import type { OnboardingProgressDTO } from '../../onboarding/persistence';
import type { AlertCard, AdviceItem, TaskItem } from '../../services/dashboard';

type JsonPrimitive = string | number | boolean | null;
type JsonRecord = { [key: string]: JsonValue } | { readonly [key: string]: JsonValue };
type JsonArray = JsonValue[] | readonly JsonValue[];
type JsonValue = JsonPrimitive | JsonRecord | JsonArray;

const emptyModule = () =>
  HttpResponse.text('export {}\n', {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
    },
  });

const moduleRouteExpressions = [
  /\/src\/.*/,
  /^https?:\/\/localhost(?::\d+)?\/src\/.*/,
  /^https?:\/\/(?:127\.0\.0\.1|\[::1])(?::\d+)?\/src\/.*/,
] as const;

const dashboardSummaryMatchers = [
  /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1])(?::\d+)?\/api\/dashboard\/summary$/i,
  /\/api\/dashboard\/summary$/,
] as const;

const alertsMatchers = [
  /\/api\/alerts(\/|\?.*)?$/i,
] as const;

const adviceMatchers = [
  /\/api\/advice\/user\/\d+(\/|\?.*)?$/i,
] as const;

const tasksMatchers = [
  /\/api\/tasks(\/|\?.*)?$/i,
] as const;

const onboardingProgressMatcher = /\/api\/onboarding\/progress(?:\?.*)?$/;
const onboardingStepMatcher = /\/api\/onboarding\/progress\/step\/(?:[^/?]+)(?:\?.*)?$/;
const onboardingResetMatcher = /\/api\/onboarding\/progress\/reset(?:\?.*)?$/;
const financialProfileSectionsMatcher = /\/financial-profile\/\d+\/sections(?:\?.*)?$/;
const financialProfileSectionUpdateMatcher = /\/financial-profile\/\d+\/sections\/[^/?]+(?:\?.*)?$/;
const financialProfileSnapshotMatcher = /\/financial-profile\/\d+\/snapshot(?:\?.*)?$/;
const financialProfileHouseholdMatcher = /\/financial-profile\/\d+\/household(?:\?.*)?$/;
const financialProfileRiskGoalsMatcher = /\/financial-profile\/\d+\/risk-goals(?:\?.*)?$/;
const financialProfileTspMatcher = /\/financial-profile\/\d+\/tsp(?:\?.*)?$/;
const financialProfileTspSummaryLiteMatcher = /\/financial-profile\/\d+\/tsp\/summary-lite(?:\?.*)?$/;
const financialProfileTspSnapshotMatcher = /\/financial-profile\/\d+\/tsp\/snapshot(?:\?.*)?$/;
const financialProfileTspSnapshotLatestMatcher = /\/financial-profile\/\d+\/tsp\/snapshot\/latest(?:\?.*)?$/;
const financialProfileCashMatcher = /\/financial-profile\/\d+\/cash(?:\?.*)?$/;
const financialProfileInvestmentsMatcher = /\/financial-profile\/\d+\/investments(?:\?.*)?$/;
const financialProfileRealEstateMatcher = /\/financial-profile\/\d+\/real-estate(?:\?.*)?$/;
const financialProfileLongTermObligationsMatcher = /\/financial-profile\/\d+\/long-term-obligations(?:\?.*)?$/;
const financialProfileLiabilitiesMatcher = /\/financial-profile\/\d+\/liabilities(?:\?.*)?$/;
const financialProfileExpensesMatcher = /\/financial-profile\/\d+\/expenses(?:\?.*)?$/;
const financialProfileTaxMatcher = /\/financial-profile\/\d+\/tax(?:\?.*)?$/;
const financialProfileInsuranceMatcher = /\/financial-profile\/\d+\/insurance(?:\?.*)?$/;
const financialProfileBenefitsMatcher = /\/financial-profile\/\d+\/benefits(?:\?.*)?$/;
const financialProfileIncomeMatcher = /\/financial-profile\/\d+\/income(?:\?.*)?$/;
const financialProfileEquityMatcher = /\/financial-profile\/\d+\/equity(?:\?.*)?$/;
const netWorthSparklineMatcher = /\/api\/dashboard\/net-worth\/sparkline(?:\?.*)?$/i;

const createDashboardSummaryHandlers = (
  resolver: Parameters<typeof http.get>[1],
) => dashboardSummaryMatchers.map((matcher) => http.get(matcher, resolver));

const createAlertsHandlers = (
  resolver: Parameters<typeof http.get>[1],
) => alertsMatchers.map((matcher) => http.get(matcher, resolver));

const createAdviceHandlers = (
  resolver: Parameters<typeof http.get>[1],
) => adviceMatchers.map((matcher) => http.get(matcher, resolver));

const createTasksHandlers = (
  resolver: Parameters<typeof http.get>[1],
) => tasksMatchers.map((matcher) => http.get(matcher, resolver));

const createSectionHandlers = (matcher: RegExp, responseBody: JsonValue = {}) => ([
  http.get(matcher, () => HttpResponse.json(responseBody, { status: 200 })),
  http.post(matcher, () => HttpResponse.json({}, { status: 204 })),
]);

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
  ...createAlertsHandlers(() => HttpResponse.json([], { status: 200 })),
  ...createAdviceHandlers(() => HttpResponse.json([], { status: 200 })),
  ...createTasksHandlers(() => HttpResponse.json([], { status: 200 })),
  http.get(onboardingProgressMatcher, () =>
    HttpResponse.json(
      { message: 'No mock registered for onboarding progress' },
      { status: 404 },
    ),
  ),
  http.put(onboardingProgressMatcher, () => HttpResponse.json({}, { status: 204 })),
  http.patch(onboardingStepMatcher, () => HttpResponse.json({}, { status: 204 })),
  http.post(onboardingResetMatcher, () => HttpResponse.json({}, { status: 204 })),
  http.get(financialProfileSectionsMatcher, () => HttpResponse.json([], { status: 200 })),
  http.put(financialProfileSectionUpdateMatcher, () => HttpResponse.json({}, { status: 200 })),
  http.get(financialProfileSnapshotMatcher, () =>
    HttpResponse.json(
      { message: 'No mock registered for financial profile snapshot' },
      { status: 404 },
    ),
  ),
  ...createSectionHandlers(financialProfileHouseholdMatcher),
  ...createSectionHandlers(financialProfileRiskGoalsMatcher),
  // TSP: Pre-populate base funds with units > 0 so compact UI renders rows by default in tests
  http.get(financialProfileTspMatcher, () =>
    HttpResponse.json(
      {
        contributionRatePercent: 5,
        employerMatchPercent: 5,
        currentBalance: null,
        targetBalance: null,
        gFundPercent: null,
        fFundPercent: null,
        cFundPercent: null,
        sFundPercent: null,
        iFundPercent: null,
        lifecyclePercent: null,
        lifecycleBalance: null,
        lifecyclePositions: [
          { fundCode: 'G', contributionPercent: null, units: 1, dateUpdated: new Date().toISOString() },
          { fundCode: 'F', contributionPercent: null, units: 1, dateUpdated: new Date().toISOString() },
          { fundCode: 'C', contributionPercent: null, units: 1, dateUpdated: new Date().toISOString() },
          { fundCode: 'S', contributionPercent: null, units: 1, dateUpdated: new Date().toISOString() },
          { fundCode: 'I', contributionPercent: null, units: 1, dateUpdated: new Date().toISOString() },
        ],
        optOut: { isOptedOut: false, reason: null, acknowledgedAt: null },
      },
      { status: 200 },
    ),
  ),
  http.post(financialProfileTspMatcher, () => HttpResponse.json({}, { status: 204 })),
  // TSP summary-lite returns a shape with items/totalBalance/asOfUtc
  http.get(financialProfileTspSummaryLiteMatcher, () =>
    HttpResponse.json({ items: [], totalBalance: 0, asOfUtc: new Date().toISOString() }, { status: 200 }),
  ),
  // Snapshot endpoints are idempotent and can be no-ops in tests
  http.post(financialProfileTspSnapshotMatcher, () => HttpResponse.json({}, { status: 204 })),
  http.get(financialProfileTspSnapshotLatestMatcher, () =>
    HttpResponse.json({ userId: 1, asOfUtc: new Date().toISOString() }, { status: 200 }),
  ),
  ...createSectionHandlers(financialProfileCashMatcher, { accounts: [] }),
  ...createSectionHandlers(financialProfileInvestmentsMatcher, { accounts: [] }),
  ...createSectionHandlers(financialProfileRealEstateMatcher, { properties: [] }),
  ...createSectionHandlers(financialProfileLongTermObligationsMatcher, { obligations: [] }),
  ...createSectionHandlers(financialProfileLiabilitiesMatcher, { liabilities: [] }),
  ...createSectionHandlers(financialProfileExpensesMatcher, { expenses: [] }),
  ...createSectionHandlers(financialProfileTaxMatcher),
  ...createSectionHandlers(financialProfileInsuranceMatcher, { policies: [] }),
  ...createSectionHandlers(financialProfileBenefitsMatcher, { benefits: [] }),
  ...createSectionHandlers(financialProfileIncomeMatcher, { streams: [] }),
  ...createSectionHandlers(financialProfileEquityMatcher),
  http.get(netWorthSparklineMatcher, () => HttpResponse.json([], { status: 200 })),
  http.options(netWorthSparklineMatcher, () => new HttpResponse(null, { status: 204 })),
];

export const mockDashboardSummary = (data: JsonValue, init?: ResponseInit) =>
  createDashboardSummaryHandlers(() => HttpResponse.json(data, init));

export const mockDashboardAlerts = (data: AlertCard[], init?: ResponseInit) =>
  createAlertsHandlers(() => HttpResponse.json(data, init ?? { status: 200 }));

export const mockDashboardAdvice = (data: AdviceItem[], init?: ResponseInit) =>
  createAdviceHandlers(() => HttpResponse.json(data, init ?? { status: 200 }));

export const mockDashboardTasks = (data: TaskItem[], init?: ResponseInit) =>
  createTasksHandlers(() => HttpResponse.json(data, init ?? { status: 200 }));

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
