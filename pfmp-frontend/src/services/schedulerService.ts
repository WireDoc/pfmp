/**
 * Scheduler Admin Service
 * Wave 10: Background Jobs & Automation - Phase 4
 * 
 * API client for managing Hangfire scheduled jobs
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api').replace(/\/api\/?$/, '');

export interface RecurringJobInfo {
  id: string;
  cron: string;
  queue: string;
  nextExecution: string | null;
  lastExecution: string | null;
  lastJobId: string | null;
  lastJobState: string | null;
  createdAt: string | null;
  timeZoneId: string;
  retryCount: number;
}

export interface SchedulerJobsResponse {
  jobs: RecurringJobInfo[];
  totalCount: number;
  retrievedAt: string;
}

export interface QueueInfo {
  name: string;
  length: number;
  fetched: number;
}

export interface JobStatistics {
  servers: number;
  recurring: number;
  enqueued: number;
  scheduled: number;
  processing: number;
  succeeded: number;
  failed: number;
  deleted: number;
}

export interface QueueStatsResponse {
  queues: QueueInfo[];
  statistics: JobStatistics;
  retrievedAt: string;
}

export interface TriggerJobResponse {
  success: boolean;
  jobId: string;
  message: string;
  triggeredAt: string;
}

export interface JobHistoryItem {
  jobId: string;
  state: string;
  jobName: string;
  succeededAt?: string;
  failedAt?: string;
  startedAt?: string;
  duration?: string;
  exceptionMessage?: string;
  exceptionType?: string;
  serverId?: string;
}

export interface JobHistoryResponse {
  succeeded: JobHistoryItem[];
  failed: JobHistoryItem[];
  processing: JobHistoryItem[];
  retrievedAt: string;
}

/**
 * Get all recurring jobs with their status
 */
export async function getRecurringJobs(): Promise<SchedulerJobsResponse> {
  const response = await fetch(`${API_BASE}/api/admin/scheduler/jobs`);
  if (!response.ok) {
    throw new Error(`Failed to fetch jobs: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<QueueStatsResponse> {
  const response = await fetch(`${API_BASE}/api/admin/scheduler/queues`);
  if (!response.ok) {
    throw new Error(`Failed to fetch queue stats: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Trigger a recurring job to run immediately
 */
export async function triggerJob(jobId: string): Promise<TriggerJobResponse> {
  const response = await fetch(`${API_BASE}/api/admin/scheduler/jobs/${encodeURIComponent(jobId)}/trigger`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to trigger job: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Trigger the price refresh job
 */
export async function triggerPriceRefresh(): Promise<TriggerJobResponse> {
  const response = await fetch(`${API_BASE}/api/admin/scheduler/trigger/price-refresh`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to trigger price refresh: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Trigger the net worth snapshot job
 */
export async function triggerNetWorthSnapshot(): Promise<TriggerJobResponse> {
  const response = await fetch(`${API_BASE}/api/admin/scheduler/trigger/networth-snapshot`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to trigger snapshot: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get recent job history
 */
export async function getJobHistory(limit = 20): Promise<JobHistoryResponse> {
  const response = await fetch(`${API_BASE}/api/admin/scheduler/history?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch job history: ${response.statusText}`);
  }
  return response.json();
}

const schedulerService = {
  getRecurringJobs,
  getQueueStats,
  triggerJob,
  triggerPriceRefresh,
  triggerNetWorthSnapshot,
  getJobHistory,
};

export default schedulerService;
