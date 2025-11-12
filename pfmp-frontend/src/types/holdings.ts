export interface Holding {
  holdingId: number;
  accountId: number;
  symbol: string;
  name: string | null;
  assetType: string;
  quantity: number;
  averageCostBasis: number;
  currentPrice: number;
  currentValue: number;
  totalCostBasis: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercentage: number | null;
  annualDividendYield: number | null;
  stakingAPY: number | null;
  annualDividendIncome: number | null;
  lastDividendDate: string | null;
  nextDividendDate: string | null;
  beta: number | null;
  sectorAllocation: string | null;
  geographicAllocation: string | null;
  isQualifiedDividend: boolean;
  purchaseDate: string | null;
  isLongTermCapitalGains: boolean;
  createdAt: string;
  updatedAt: string;
  lastPriceUpdate: string | null;
  notes: string | null;
}

export interface CreateHoldingRequest {
  accountId: number;
  symbol: string;
  name?: string;
  assetType: number;
  quantity: number;
  averageCostBasis: number;
  currentPrice: number;
  annualDividendYield?: number;
  stakingAPY?: number;
  annualDividendIncome?: number;
  lastDividendDate?: string;
  nextDividendDate?: string;
  beta?: number;
  sectorAllocation?: string;
  geographicAllocation?: string;
  isQualifiedDividend?: boolean;
  purchaseDate?: string;
  isLongTermCapitalGains?: boolean;
  notes?: string;
}

export interface UpdateHoldingRequest {
  name?: string;
  quantity?: number;
  averageCostBasis?: number;
  currentPrice?: number;
  annualDividendYield?: number;
  stakingAPY?: number;
  annualDividendIncome?: number;
  lastDividendDate?: string;
  nextDividendDate?: string;
  beta?: number;
  sectorAllocation?: string;
  geographicAllocation?: string;
  isQualifiedDividend?: boolean;
  purchaseDate?: string;
  isLongTermCapitalGains?: boolean;
  notes?: string;
}

export const AssetTypeEnum = {
  Stock: 0,
  ETF: 1,
  MutualFund: 2,
  Index: 3,
  Bond: 4,
  TreasuryBill: 5,
  CorporateBond: 6,
  Cash: 7,
  MoneyMarket: 8,
  Cryptocurrency: 9,
  CryptoStaking: 10,
  DeFiToken: 11,
  NFT: 12,
  RealEstate: 13,
  REIT: 14,
  Commodity: 15,
  TSPGFund: 16,
  TSPFFund: 17,
  TSPCFund: 18,
  TSPSFund: 19,
  TSPIFund: 20,
  TSPLifecycleFund: 21,
  Option: 22,
  Futures: 23,
  Other: 24,
} as const;

export const AssetTypeLabels: Record<number, string> = {
  [AssetTypeEnum.Stock]: 'Stock',
  [AssetTypeEnum.ETF]: 'ETF',
  [AssetTypeEnum.MutualFund]: 'Mutual Fund',
  [AssetTypeEnum.Index]: 'Index',
  [AssetTypeEnum.Bond]: 'Bond',
  [AssetTypeEnum.TreasuryBill]: 'Treasury Bill',
  [AssetTypeEnum.CorporateBond]: 'Corporate Bond',
  [AssetTypeEnum.Cash]: 'Cash',
  [AssetTypeEnum.MoneyMarket]: 'Money Market',
  [AssetTypeEnum.Cryptocurrency]: 'Cryptocurrency',
  [AssetTypeEnum.CryptoStaking]: 'Crypto Staking',
  [AssetTypeEnum.DeFiToken]: 'DeFi Token',
  [AssetTypeEnum.NFT]: 'NFT',
  [AssetTypeEnum.RealEstate]: 'Real Estate',
  [AssetTypeEnum.REIT]: 'REIT',
  [AssetTypeEnum.Commodity]: 'Commodity',
  [AssetTypeEnum.TSPGFund]: 'TSP G Fund',
  [AssetTypeEnum.TSPFFund]: 'TSP F Fund',
  [AssetTypeEnum.TSPCFund]: 'TSP C Fund',
  [AssetTypeEnum.TSPSFund]: 'TSP S Fund',
  [AssetTypeEnum.TSPIFund]: 'TSP I Fund',
  [AssetTypeEnum.TSPLifecycleFund]: 'TSP Lifecycle Fund',
  [AssetTypeEnum.Option]: 'Option',
  [AssetTypeEnum.Futures]: 'Futures',
  [AssetTypeEnum.Other]: 'Other',
};
