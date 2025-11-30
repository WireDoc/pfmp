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

// Must match backend AssetType enum in Models/Holding.cs exactly
export const AssetTypeEnum = {
  // Equities
  Stock: 0,
  ETF: 1,
  MutualFund: 2,
  Index: 3,
  // Fixed Income
  Bond: 4,
  TreasuryBill: 5,
  CorporateBond: 6,
  MunicipalBond: 7,
  // Cash Equivalents
  Cash: 8,
  MoneyMarket: 9,
  CertificateOfDeposit: 10,
  // Cryptocurrency
  Cryptocurrency: 11,
  CryptoStaking: 12,
  DeFiToken: 13,
  NFT: 14,
  // Alternatives
  RealEstate: 15,
  REIT: 16,
  Commodity: 17,
  PreciousMetal: 18,
  // TSP Funds
  TSPGFund: 19,
  TSPFFund: 20,
  TSPCFund: 21,
  TSPSFund: 22,
  TSPIFund: 23,
  TSPLifecycleFund: 24,
  // Other
  Option: 25,
  Futures: 26,
  Other: 27,
} as const;

export const AssetTypeLabels: Record<number, string> = {
  // Equities
  [AssetTypeEnum.Stock]: 'Stock',
  [AssetTypeEnum.ETF]: 'ETF',
  [AssetTypeEnum.MutualFund]: 'Mutual Fund',
  [AssetTypeEnum.Index]: 'Index',
  // Fixed Income
  [AssetTypeEnum.Bond]: 'Bond',
  [AssetTypeEnum.TreasuryBill]: 'Treasury Bill',
  [AssetTypeEnum.CorporateBond]: 'Corporate Bond',
  [AssetTypeEnum.MunicipalBond]: 'Municipal Bond',
  // Cash Equivalents
  [AssetTypeEnum.Cash]: 'Cash',
  [AssetTypeEnum.MoneyMarket]: 'Money Market',
  [AssetTypeEnum.CertificateOfDeposit]: 'Certificate of Deposit',
  // Cryptocurrency
  [AssetTypeEnum.Cryptocurrency]: 'Cryptocurrency',
  [AssetTypeEnum.CryptoStaking]: 'Crypto Staking',
  [AssetTypeEnum.DeFiToken]: 'DeFi Token',
  [AssetTypeEnum.NFT]: 'NFT',
  // Alternatives
  [AssetTypeEnum.RealEstate]: 'Real Estate',
  [AssetTypeEnum.REIT]: 'REIT',
  [AssetTypeEnum.Commodity]: 'Commodity',
  [AssetTypeEnum.PreciousMetal]: 'Precious Metal',
  // TSP Funds
  [AssetTypeEnum.TSPGFund]: 'TSP G Fund',
  [AssetTypeEnum.TSPFFund]: 'TSP F Fund',
  [AssetTypeEnum.TSPCFund]: 'TSP C Fund',
  [AssetTypeEnum.TSPSFund]: 'TSP S Fund',
  [AssetTypeEnum.TSPIFund]: 'TSP I Fund',
  [AssetTypeEnum.TSPLifecycleFund]: 'TSP Lifecycle Fund',
  // Other
  [AssetTypeEnum.Option]: 'Option',
  [AssetTypeEnum.Futures]: 'Futures',
  [AssetTypeEnum.Other]: 'Other',
};

// Reverse mapping: enum string name → numeric value
// Backend returns enum names as strings (e.g., "Cryptocurrency", "Stock")
export const AssetTypeNameToValue: Record<string, number> = {
  'Stock': AssetTypeEnum.Stock,
  'ETF': AssetTypeEnum.ETF,
  'MutualFund': AssetTypeEnum.MutualFund,
  'Index': AssetTypeEnum.Index,
  'Bond': AssetTypeEnum.Bond,
  'TreasuryBill': AssetTypeEnum.TreasuryBill,
  'CorporateBond': AssetTypeEnum.CorporateBond,
  'MunicipalBond': AssetTypeEnum.MunicipalBond,
  'Cash': AssetTypeEnum.Cash,
  'MoneyMarket': AssetTypeEnum.MoneyMarket,
  'CertificateOfDeposit': AssetTypeEnum.CertificateOfDeposit,
  'Cryptocurrency': AssetTypeEnum.Cryptocurrency,
  'CryptoStaking': AssetTypeEnum.CryptoStaking,
  'DeFiToken': AssetTypeEnum.DeFiToken,
  'NFT': AssetTypeEnum.NFT,
  'RealEstate': AssetTypeEnum.RealEstate,
  'REIT': AssetTypeEnum.REIT,
  'Commodity': AssetTypeEnum.Commodity,
  'PreciousMetal': AssetTypeEnum.PreciousMetal,
  'TSPGFund': AssetTypeEnum.TSPGFund,
  'TSPFFund': AssetTypeEnum.TSPFFund,
  'TSPCFund': AssetTypeEnum.TSPCFund,
  'TSPSFund': AssetTypeEnum.TSPSFund,
  'TSPIFund': AssetTypeEnum.TSPIFund,
  'TSPLifecycleFund': AssetTypeEnum.TSPLifecycleFund,
  'Option': AssetTypeEnum.Option,
  'Futures': AssetTypeEnum.Futures,
  'Other': AssetTypeEnum.Other,
};
