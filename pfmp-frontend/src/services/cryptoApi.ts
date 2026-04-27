/**
 * Wave 13: Crypto exchange API client.
 * Wraps /api/crypto endpoints (connections + holdings + transactions + sync).
 */
import apiClient from './api';

export type ExchangeConnectionStatus = 'Active' | 'Expired' | 'RevokedByUser' | 'Error';

export type CryptoTransactionType =
  | 'Buy'
  | 'Sell'
  | 'Deposit'
  | 'Withdrawal'
  | 'StakingReward'
  | 'EarnInterest'
  | 'Fee'
  | 'Transfer'
  | 'Other';

export interface ExchangeConnection {
  exchangeConnectionId: number;
  provider: string;
  nickname: string | null;
  status: ExchangeConnectionStatus;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  scopes: string[];
  dateCreated: string;
}

export interface CreateExchangeConnectionRequest {
  provider: string;
  nickname?: string | null;
  apiKey: string;
  apiSecret: string;
}

export interface CryptoHolding {
  cryptoHoldingId: number;
  exchangeConnectionId: number;
  provider: string;
  symbol: string;
  coinGeckoId: string | null;
  quantity: number;
  avgCostBasisUsd: number | null;
  marketValueUsd: number;
  isStaked: boolean;
  stakingApyPercent: number | null;
  lastPriceAt: string;
}

export interface CryptoTransaction {
  cryptoTransactionId: number;
  exchangeConnectionId: number;
  provider: string;
  exchangeTxId: string;
  transactionType: CryptoTransactionType;
  symbol: string;
  quantity: number;
  priceUsd: number | null;
  feeUsd: number | null;
  executedAt: string;
}

export interface CryptoSyncResponse {
  holdingsUpserted: number;
  transactionsInserted: number;
  transactionsSkipped: number;
  error: string | null;
  lastSyncAt: string | null;
}

export async function listExchangeConnections(userId: number): Promise<ExchangeConnection[]> {
  const { data } = await apiClient.get<ExchangeConnection[]>(`/crypto/connections`, { params: { userId } });
  return data;
}

export async function createExchangeConnection(
  userId: number,
  request: CreateExchangeConnectionRequest,
): Promise<ExchangeConnection> {
  const { data } = await apiClient.post<ExchangeConnection>(`/crypto/connections`, request, { params: { userId } });
  return data;
}

export async function deleteExchangeConnection(userId: number, connectionId: number): Promise<void> {
  await apiClient.delete(`/crypto/connections/${connectionId}`, { params: { userId } });
}

export async function syncExchangeConnection(userId: number, connectionId: number): Promise<CryptoSyncResponse> {
  const { data } = await apiClient.post<CryptoSyncResponse>(`/crypto/connections/${connectionId}/sync`, null, {
    params: { userId },
  });
  return data;
}

export async function listCryptoHoldings(userId: number): Promise<CryptoHolding[]> {
  const { data } = await apiClient.get<CryptoHolding[]>(`/crypto/holdings`, { params: { userId } });
  return data;
}

export async function listCryptoTransactions(
  userId: number,
  options?: { connectionId?: number; since?: string },
): Promise<CryptoTransaction[]> {
  const { data } = await apiClient.get<CryptoTransaction[]>(`/crypto/transactions`, {
    params: { userId, connectionId: options?.connectionId, since: options?.since },
  });
  return data;
}

// ---- Wave 13 Phase 3: Tax lots, realized P/L, staking summary ----

export interface CryptoTaxLot {
  cryptoTaxLotId: number;
  exchangeConnectionId: number;
  provider: string;
  symbol: string;
  acquiredAt: string;
  originalQuantity: number;
  remainingQuantity: number;
  costBasisUsdPerUnit: number;
  realizedProceedsUsd: number;
  realizedCostBasisUsd: number;
  realizedShortTermGainUsd: number;
  realizedLongTermGainUsd: number;
  isClosed: boolean;
  closedAt: string | null;
  isRewardLot: boolean;
}

export interface CryptoRealizedPnLBySymbol {
  symbol: string;
  proceedsUsd: number;
  costBasisUsd: number;
  shortTermGainUsd: number;
  longTermGainUsd: number;
  totalGainUsd: number;
}

export interface CryptoRealizedPnLSummary {
  year: number | null;
  totalProceedsUsd: number;
  totalCostBasisUsd: number;
  totalShortTermGainUsd: number;
  totalLongTermGainUsd: number;
  totalRealizedGainUsd: number;
  bySymbol: CryptoRealizedPnLBySymbol[];
}

export interface CryptoStakingByAsset {
  symbol: string;
  quantity: number;
  marketValueUsd: number;
  apyPercent: number | null;
}

export interface CryptoStakingSummary {
  totalStakedValueUsd: number;
  weightedApyPercent: number | null;
  ytdRewardsUsd: number;
  stakedAssetCount: number;
  byAsset: CryptoStakingByAsset[];
}

export async function listCryptoTaxLots(
  userId: number,
  options?: { symbol?: string; openOnly?: boolean },
): Promise<CryptoTaxLot[]> {
  const { data } = await apiClient.get<CryptoTaxLot[]>(`/crypto/tax-lots`, {
    params: { userId, symbol: options?.symbol, openOnly: options?.openOnly },
  });
  return data;
}

export async function getCryptoRealizedPnL(
  userId: number,
  year?: number,
): Promise<CryptoRealizedPnLSummary> {
  const { data } = await apiClient.get<CryptoRealizedPnLSummary>(`/crypto/realized-pnl`, {
    params: { userId, year },
  });
  return data;
}

export async function getCryptoStakingSummary(userId: number): Promise<CryptoStakingSummary> {
  const { data } = await apiClient.get<CryptoStakingSummary>(`/crypto/staking-summary`, {
    params: { userId },
  });
  return data;
}
