/**
 * Wave 23 — News digest API client. Talks to /api/news on the backend.
 * Used by the dashboard NewsDigestWidget (compact summary) and the
 * NewsDigestDetailView (per-category drill-down + linked articles).
 */
import apiClient from './api';

// ----- Types matching the C# DTOs in NewsController.cs -----

export interface NewsDigestCategories {
  macro: string | null;
  federal: string | null;
  holdings: string | null;
  weather: string | null;
  regulatory: string | null;
  crypto: string | null;
  geopolitical: string | null;
}

export interface NewsDigest {
  digestId: number;
  userId: number;
  generatedAt: string;   // ISO 8601
  periodStart: string;
  periodEnd: string;
  headline: string | null;
  /** 2-3 paragraph "morning briefing" narrative weaving the period's threads. */
  narrativeSummary: string | null;
  overallSentiment: string | null; // bullish | cautiously_bullish | neutral | mixed | cautiously_bearish | bearish
  confidence: number | null;       // 0..1
  articleCount: number;
  categories: NewsDigestCategories;
  llmCostUsd: number;
}

export interface NewsArticle {
  articleId: number;
  source: string;
  title: string;
  url: string;
  summary: string | null;
  publishedAt: string;
  category: string | null;
  tags: string | null;
}

export interface NewsTriggerResponse {
  jobId: string;
}

// ----- API calls -----

export async function fetchLatestDigest(userId: number): Promise<NewsDigest | null> {
  try {
    const resp = await apiClient.get<NewsDigest>('/news/digest', { params: { userId } });
    return resp.data;
  } catch (err: unknown) {
    // 404 means no digest yet — caller can render an empty state instead of erroring out.
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

export async function fetchDigestArticles(userId: number, category?: string): Promise<NewsArticle[]> {
  const resp = await apiClient.get<NewsArticle[]>('/news/articles', {
    params: { userId, ...(category ? { category } : {}) },
  });
  return resp.data;
}

export async function triggerNewsIngestion(): Promise<NewsTriggerResponse> {
  const resp = await apiClient.post<NewsTriggerResponse>('/news/trigger');
  return resp.data;
}
