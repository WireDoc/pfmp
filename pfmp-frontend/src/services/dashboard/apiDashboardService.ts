import type { SilentRequest } from '@azure/msal-browser';
import { isFeatureEnabled } from '../../flags/featureFlags';
import { pfmpApiScopes } from '../../config/authConfig';
import { msalInstance } from '../../contexts/auth/msalInstance';
import type {
  DashboardData,
  DashboardService,
  AlertCard,
  AdviceItem,
  TaskItem,
  CreateFollowUpTaskRequest,
  UpdateTaskStatusRequest,
  UpdateTaskProgressRequest,
  CompleteTaskRequestPayload,
  LongTermObligationSummary,
  LongTermObligationListener,
} from './types';
import {
  TASK_PRIORITY_FROM_ENUM,
  TASK_STATUS_FROM_ENUM,
  TASK_STATUS_TO_ENUM,
  TASK_TYPE_FROM_ENUM,
} from './types';

interface TaskCreateResponseDto {
  taskId: number;
}

function isTaskCreateResponseDto(payload: unknown): payload is TaskCreateResponseDto {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  const candidate = payload as { taskId?: unknown };
  return typeof candidate.taskId === 'number';
}

interface ApiDashboardSummaryResponse {
  netWorth: DashboardData['netWorth'];
  accounts?: DashboardData['accounts'];
  insights?: DashboardData['insights'];
  longTermObligationCount?: number | null;
  longTermObligationEstimate?: number | null;
  nextObligationDueDate?: string | null;
}

// Use the configured API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, ''); // Remove trailing /api or /api/

const DASHBOARD_BASE = `${API_ORIGIN}/api/dashboard`;
const DEFAULT_DASHBOARD_USER_ID = (import.meta.env?.VITE_PFMP_DASHBOARD_USER_ID ?? '1').toString();

const ALERTS_URL = `${API_ORIGIN}/api/alerts?userId=${encodeURIComponent(DEFAULT_DASHBOARD_USER_ID)}&isActive=true`;
const ADVICE_URL = `${API_ORIGIN}/api/Advice/user/${encodeURIComponent(DEFAULT_DASHBOARD_USER_ID)}?status=Proposed&includeDismissed=false`;
const TASKS_URL = `${API_ORIGIN}/api/Tasks?userId=${encodeURIComponent(DEFAULT_DASHBOARD_USER_ID)}&status=Pending`;
const TASKS_CREATE_URL = `${API_ORIGIN}/api/Tasks`;
const TASK_STATUS_URL = (taskId: number | string) => `${API_ORIGIN}/api/Tasks/${encodeURIComponent(taskId)}/status`;
const TASK_PROGRESS_URL = (taskId: number | string) => `${API_ORIGIN}/api/Tasks/${encodeURIComponent(taskId)}/progress`;
const TASK_COMPLETE_URL = (taskId: number | string) => `${API_ORIGIN}/api/Tasks/${encodeURIComponent(taskId)}/complete`;
const OBLIGATION_POLL_INTERVAL_MS = 45000;

function extractObligations(dto: ApiDashboardSummaryResponse): LongTermObligationSummary | undefined {
  if (
    dto.longTermObligationCount != null ||
    dto.longTermObligationEstimate != null ||
    dto.nextObligationDueDate != null
  ) {
    return {
      count: dto.longTermObligationCount ?? 0,
      totalEstimate: dto.longTermObligationEstimate ?? 0,
      nextDueDate: dto.nextObligationDueDate ?? null,
    } satisfies LongTermObligationSummary;
  }
  return undefined;
}

async function resolveAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window === 'undefined') {
    return {};
  }
  if (isFeatureEnabled('use_simulated_auth')) {
    return {};
  }

  try {
    // Initialize lazily; safe to call repeatedly.
    await msalInstance.initialize();
    const activeAccount = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0] ?? null;
    if (!activeAccount) {
      return {};
    }
    const request: SilentRequest = {
      account: activeAccount,
      scopes: pfmpApiScopes.read,
    };
    const tokenResponse = await msalInstance.acquireTokenSilent(request);
    if (!tokenResponse?.accessToken) {
      return {};
    }
    return { Authorization: `Bearer ${tokenResponse.accessToken}` };
  } catch (error) {
    if (import.meta.env?.MODE === 'development' || import.meta.env?.MODE === 'test') {
      console.warn('Dashboard API token acquisition failed; continuing without auth', error);
    }
    return {};
  }
}

async function buildJsonHeaders(): Promise<Record<string, string>> {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(await resolveAuthHeaders()),
  };
}

async function safeJson<T>(resp: Response): Promise<T> {
  const text = await resp.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

async function fetchSummary(headers: HeadersInit): Promise<ApiDashboardSummaryResponse> {
  const url = `${DASHBOARD_BASE}/summary?userId=${encodeURIComponent(DEFAULT_DASHBOARD_USER_ID)}`;
  console.log('[Dashboard API] Fetching summary from:', url);
  console.log('[Dashboard API] DASHBOARD_BASE:', DASHBOARD_BASE);
  console.log('[Dashboard API] API_ORIGIN:', API_ORIGIN);
  console.log('[Dashboard API] API_BASE_URL:', API_BASE_URL);
  const resp = await fetch(url, {
    headers,
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch dashboard summary (${resp.status})`);
  }
  return safeJson<ApiDashboardSummaryResponse>(resp);
}

async function fetchList<T>(url: string, headers: HeadersInit, context: 'alerts' | 'advice' | 'tasks'): Promise<T[]> {
  const resp = await fetch(url, { headers });
  if (resp.status === 204 || resp.status === 404) {
    return [];
  }
  if (!resp.ok) {
    throw new Error(`Failed to fetch dashboard ${context} (${resp.status})`);
  }
  const data = await safeJson<unknown>(resp);
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (data && typeof data === 'object') {
    const maybeItems = (data as Record<string, unknown>)['items'];
    if (Array.isArray(maybeItems)) {
      return maybeItems as T[];
    }
  }
  return [];
}

const TASK_STATUS_LABELS = Object.values(TASK_STATUS_FROM_ENUM);
const TASK_PRIORITY_LABELS = Object.values(TASK_PRIORITY_FROM_ENUM);

function normalizeTaskStatus(value: unknown): TaskItem['status'] {
  if (typeof value === 'number') {
    return TASK_STATUS_FROM_ENUM[value] ?? 'Pending';
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    const match = TASK_STATUS_LABELS.find(label => label.toLowerCase() === normalized.toLowerCase());
    return (match ?? normalized) as TaskItem['status'];
  }
  return 'Pending';
}

function normalizeTaskPriority(value: unknown): TaskItem['priority'] {
  if (typeof value === 'number') {
    return TASK_PRIORITY_FROM_ENUM[value] ?? 'Medium';
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    const match = TASK_PRIORITY_LABELS.find(label => label.toLowerCase() === normalized.toLowerCase());
    return (match ?? normalized) as TaskItem['priority'];
  }
  return 'Medium';
}

function normalizeTaskType(value: unknown): string {
  if (typeof value === 'number') {
    return TASK_TYPE_FROM_ENUM[value] ?? `TaskType${value}`;
  }
  if (typeof value === 'string') {
    return value;
  }
  return 'Task';
}

function normalizeIsoString(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date().toISOString();
}

function normalizeNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeTaskPayload(payload: Record<string, unknown>): TaskItem {
  const taskId = normalizeNullableNumber(payload.taskId ?? payload.TaskId) ?? Date.now();
  const userId = normalizeNullableNumber(payload.userId ?? payload.UserId) ?? 0;
  const status = normalizeTaskStatus(payload.status ?? payload.Status);
  const priority = normalizeTaskPriority(payload.priority ?? payload.Priority);
  const type = normalizeTaskType(payload.type ?? payload.Type ?? 'Task');
  const createdDate = normalizeIsoString(payload.createdDate ?? payload.CreatedDate);
  const dueDateRaw = payload.dueDate ?? payload.DueDate;
  const dueDate = typeof dueDateRaw === 'string' ? dueDateRaw : null;
  const sourceAlertId = normalizeNullableNumber(payload.sourceAlertId ?? payload.SourceAlertId);
  const sourceAdviceId = normalizeNullableNumber(payload.sourceAdviceId ?? payload.SourceAdviceId);
  const progressPercentage = normalizeNullableNumber(payload.progressPercentage ?? payload.ProgressPercentage) ?? 0;
  const confidenceScore = normalizeNullableNumber(payload.confidenceScore ?? payload.ConfidenceScore);
  const descriptionRaw = payload.description ?? payload.Description;
  const titleRaw = payload.title ?? payload.Title;

  return {
    taskId,
    userId,
    type,
    title: typeof titleRaw === 'string' ? titleRaw : 'Task',
    description: typeof descriptionRaw === 'string' ? descriptionRaw : '',
    priority,
    status,
    createdDate,
    dueDate,
    sourceAdviceId,
    sourceAlertId,
    progressPercentage,
    confidenceScore,
  } satisfies TaskItem;
}

export function createApiDashboardService(): DashboardService {
  let lastKnownObligations: LongTermObligationSummary | undefined;

  return {
    async load() {
      const headers: HeadersInit = {
        Accept: 'application/json',
        ...(await resolveAuthHeaders()),
      };

      const [dto, alerts, advice, tasks] = await Promise.all([
        fetchSummary(headers),
        fetchList<AlertCard>(ALERTS_URL, headers, 'alerts').catch((error) => {
          if (import.meta.env?.MODE !== 'production') {
            console.warn('Dashboard API alerts fetch failed; defaulting to empty list', error);
          }
          return [] as AlertCard[];
        }),
        fetchList<AdviceItem>(ADVICE_URL, headers, 'advice').catch((error) => {
          if (import.meta.env?.MODE !== 'production') {
            console.warn('Dashboard API advice fetch failed; defaulting to empty list', error);
          }
          return [] as AdviceItem[];
        }),
        fetchList<Record<string, unknown>>(TASKS_URL, headers, 'tasks').catch((error) => {
          if (import.meta.env?.MODE !== 'production') {
            console.warn('Dashboard API tasks fetch failed; defaulting to empty list', error);
          }
          return [] as Record<string, unknown>[];
        }),
      ]);

      if (!dto.netWorth) {
        throw new Error('Dashboard summary response missing netWorth payload');
      }
      const obligations = extractObligations(dto);
      lastKnownObligations = obligations;
      return {
        netWorth: dto.netWorth,
        accounts: dto.accounts ?? [],
        insights: dto.insights ?? [],
        longTermObligations: obligations,
        alerts,
        advice,
        tasks: tasks.map(normalizeTaskPayload),
      } satisfies DashboardData;
    },
    subscribeToLongTermObligations(listener: LongTermObligationListener) {
      if (typeof window === 'undefined') {
        return () => {};
      }

      let cancelled = false;
      let lastSerialized = lastKnownObligations ? JSON.stringify(lastKnownObligations) : null;

      if (lastKnownObligations) {
        queueMicrotask(() => {
          if (!cancelled) {
            listener(lastKnownObligations);
          }
        });
      }

      const poll = async () => {
        if (cancelled) {
          return;
        }
        try {
          const headers: HeadersInit = {
            Accept: 'application/json',
            ...(await resolveAuthHeaders()),
          };
          const dto = await fetchSummary(headers);
          const next = extractObligations(dto);
          lastKnownObligations = next;
          const serialized = next ? JSON.stringify(next) : null;
          if (serialized !== lastSerialized) {
            lastSerialized = serialized;
            if (!cancelled) {
              listener(next);
            }
          }
        } catch (error) {
          if (import.meta.env?.MODE !== 'production') {
            console.warn('Dashboard obligation polling failed', error);
          }
        }
      };

      let intervalId: ReturnType<typeof setInterval> | null = null;

      poll();
      intervalId = setInterval(poll, OBLIGATION_POLL_INTERVAL_MS);

      return () => {
        cancelled = true;
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    },
    async createFollowUpTask(request: CreateFollowUpTaskRequest) {
      const headers = await buildJsonHeaders();
      const resp = await fetch(TASKS_CREATE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });
      if (!resp.ok) {
        throw new Error(`Failed to create dashboard task (${resp.status})`);
      }
      const payload = await safeJson<unknown>(resp);
      if (isTaskCreateResponseDto(payload)) {
        return { taskId: payload.taskId };
      }
      return { taskId: null };
    },
    async updateTaskStatus(request: UpdateTaskStatusRequest) {
      const headers = await buildJsonHeaders();
      const statusEnum = TASK_STATUS_TO_ENUM[request.status] ?? TASK_STATUS_TO_ENUM['Pending'];
      const resp = await fetch(TASK_STATUS_URL(request.taskId), {
        method: 'PATCH',
        headers,
        body: JSON.stringify(statusEnum),
      });
      if (!resp.ok) {
        throw new Error(`Failed to update dashboard task status (${resp.status})`);
      }
    },
    async updateTaskProgress(request: UpdateTaskProgressRequest) {
      const headers = await buildJsonHeaders();
      const progress = Math.max(0, Math.min(100, Math.round(request.progressPercentage)));
      const resp = await fetch(TASK_PROGRESS_URL(request.taskId), {
        method: 'PATCH',
        headers,
        body: JSON.stringify(progress),
      });
      if (!resp.ok) {
        throw new Error(`Failed to update dashboard task progress (${resp.status})`);
      }
    },
    async completeTask(request: CompleteTaskRequestPayload) {
      const headers = await buildJsonHeaders();
      const resp = await fetch(TASK_COMPLETE_URL(request.taskId), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ completionNotes: request.completionNotes ?? null }),
      });
      if (!resp.ok) {
        throw new Error(`Failed to complete dashboard task (${resp.status})`);
      }
    },
  };
}
