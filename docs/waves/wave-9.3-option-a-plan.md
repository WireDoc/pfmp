# Wave 9.3 Option A: Enhanced Investment Metrics - Implementation Plan

**Date Created:** November 16, 2025  
**Status:** Planning  
**Timeline:** 2-3 weeks  
**Estimated Effort:** 1,200-1,500 lines of code

---

## Executive Summary

Wave 9.3 Option A adds advanced investment analytics to provide deep performance insights, risk analysis, tax planning, and portfolio optimization capabilities. This transforms PFMP from a basic portfolio tracker into a sophisticated investment analysis platform comparable to Bloomberg Terminal or Morningstar.

**Core Features:**
1. **Performance Metrics** - TWR, MWR, Sharpe ratio, benchmark comparison
2. **Asset Allocation Drill-Down** - Sector analysis, geographic breakdown, market cap
3. **Tax Insights** - Unrealized gains/losses, tax-loss harvesting opportunities
4. **Risk Analysis** - Volatility, beta, correlation matrix, max drawdown

---

## 1. Feature Specifications

### 1.1 Performance Metrics Tab

**User Story:**  
_As an investor, I want to see my portfolio performance across multiple time periods compared to market benchmarks so I can evaluate my investment strategy effectiveness._

**Components:**
- **PerformanceMetricsCard** - Summary metrics (total return, TWR, MWR)
- **PerformanceChart** - Historical performance vs benchmarks
- **BenchmarkComparisonTable** - Side-by-side comparison with indices

**Metrics to Calculate:**

#### Time-Weighted Return (TWR)
- Measures investment skill independent of cash flows
- Formula: `TWR = ∏(1 + Rᵢ) - 1` where Rᵢ = (Ending Value - Beginning Value - Cash Flows) / Beginning Value
- Best for comparing to benchmarks
- Time periods: 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, All-Time

#### Money-Weighted Return (MWR/IRR)
- Measures actual investor experience including timing of cash flows
- Formula: IRR where NPV = 0 for all cash flows
- Better reflects real-world returns
- Shows impact of buy/sell timing decisions

#### Total Return
- Simple calculation: `(Current Value - Initial Investment + Withdrawals - Deposits) / Initial Investment`
- Both dollar amount and percentage
- Easy to understand for beginners

#### Sharpe Ratio
- Risk-adjusted return metric
- Formula: `(Return - Risk-Free Rate) / Standard Deviation`
- Use 10-year Treasury yield as risk-free rate
- Higher is better (>1.0 is good, >2.0 is excellent)

**Benchmarks:**
- S&P 500 (SPY)
- Total Stock Market (VTI)
- Nasdaq 100 (QQQ)
- Russell 2000 (IWM)
- International (VEU)
- Bonds (AGG)

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Performance Metrics                                         │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│ │ Total   │ │ TWR     │ │ MWR     │ │ Sharpe  │           │
│ │ Return  │ │ 12.5%   │ │ 11.2%   │ │ Ratio   │           │
│ │ $45,230 │ │         │ │         │ │ 1.82    │           │
│ │ +15.3%  │ │         │ │         │ │         │           │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│ Period Selector: [1M] [3M] [6M] [YTD] [1Y] [3Y] [5Y] [All] │
├─────────────────────────────────────────────────────────────┤
│ ┌─ Performance Chart ──────────────────────────────────────┐│
│ │                                                           ││
│ │   120% ┼╮                                                ││
│ │        │ ╲                                               ││
│ │   110% ┤  ╲         Portfolio                           ││
│ │        │   ╲       ─────────                            ││
│ │   100% ┤    ╰──────      S&P 500                        ││
│ │        │            ─ ─ ─                                ││
│ │        └────┬────┬────┬────┬────┬────                   ││
│ │           Jan   Mar   May   Jul   Sep   Nov             ││
│ └──────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ Benchmark Comparison                                        │
│ ┌────────────────┬──────────┬──────────┬──────────────────┐│
│ │ Benchmark      │ Return   │ Vol      │ Sharpe           ││
│ ├────────────────┼──────────┼──────────┼──────────────────┤│
│ │ Your Portfolio │ +15.3%   │ 18.5%    │ 1.82             ││
│ │ S&P 500        │ +12.1%   │ 16.2%    │ 1.54             ││
│ │ Total Market   │ +11.8%   │ 16.8%    │ 1.47             ││
│ │ Nasdaq 100     │ +18.2%   │ 22.4%    │ 1.71             ││
│ └────────────────┴──────────┴──────────┴──────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

### 1.2 Asset Allocation Drill-Down

**User Story:**  
_As an investor, I want to analyze my portfolio composition across multiple dimensions (sector, geography, market cap, asset class) so I can identify concentration risks and rebalancing opportunities._

**Components:**
- **AllocationSunburstChart** - Interactive multi-level visualization
- **AllocationTableView** - Detailed breakdown with drill-down
- **RebalancingRecommendations** - Suggested trades to reach target allocation
- **DriftAlerts** - Warnings when allocation deviates >5% from target

**Allocation Dimensions:**

#### Asset Class
- US Stocks
- International Stocks
- Bonds
- Real Estate (REITs)
- Commodities
- Cash
- Crypto (if applicable)

#### Sector (for stocks)
- Technology
- Healthcare
- Financials
- Consumer Discretionary
- Consumer Staples
- Energy
- Industrials
- Materials
- Utilities
- Real Estate
- Communication Services

#### Geography
- US (total %)
- Developed International (Europe, Japan, etc.)
- Emerging Markets (China, India, Brazil, etc.)

#### Market Cap (for stocks)
- Large Cap (>$10B)
- Mid Cap ($2B-$10B)
- Small Cap (<$2B)

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Asset Allocation                                            │
├─────────────────────────────────────────────────────────────┤
│ View By: [Asset Class] [Sector] [Geography] [Market Cap]   │
├─────────────────────────────────────────────────────────────┤
│ ┌─ Sunburst Chart ─────────┐ ┌─ Allocation Table ────────┐ │
│ │                           │ │ Asset Class    Current   │ │
│ │         ╱─────╲          │ │ ─────────────────────────│ │
│ │       ╱    US   ╲        │ │ US Stocks      62.3%    │ │
│ │      │  Stocks   │       │ │ Intl Stocks    18.5%    │ │
│ │      │   62%     │       │ │ Bonds          15.2%    │ │
│ │       ╲         ╱        │ │ Real Estate     3.0%    │ │
│ │         ───────          │ │ Cash            1.0%    │ │
│ │    Intl   Bonds         │ │                          │ │
│ │    18%     15%          │ │ Drill down: [Sectors →] │ │
│ └───────────────────────────┘ └───────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Rebalancing Recommendations                                 │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ ⚠️  US Stocks 5.3% over target (57% → 62.3%)            ││
│ │     Sell $12,500 VTI                                     ││
│ │                                                           ││
│ │ ⚠️  International Stocks 1.5% under target (20% → 18.5%)││
│ │     Buy $3,500 VEU                                       ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

### 1.3 Tax Insights Tab

**User Story:**  
_As a taxable investor, I want to see my unrealized gains/losses and identify tax-loss harvesting opportunities so I can minimize my tax liability._

**Components:**
- **TaxSummaryCard** - Total unrealized gains/losses
- **TaxLotTable** - Per-holding gains/losses with holding period
- **HarvestingOpportunities** - Identified tax-loss harvesting candidates
- **EstimatedTaxLiability** - Projected taxes if all positions sold

**Calculations:**

#### Unrealized Gains/Losses
- Formula: `(Current Market Value - Cost Basis) per holding`
- Separate short-term (<1 year) vs long-term (≥1 year)
- Show both dollar amount and percentage

#### Tax-Loss Harvesting Opportunities
- Identify holdings with losses >$500
- Check for wash sale violations (same security purchased within 30 days)
- Suggest similar ETFs for replacement (avoid wash sale)
- Calculate potential tax savings (loss × marginal tax rate)

#### Estimated Tax Liability
- Short-term gains taxed at ordinary income rate (assume 24% marginal)
- Long-term gains taxed at preferential rate (15% or 20%)
- Net Investment Income Tax (3.8% for high earners)
- State taxes (user configurable)

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Tax Insights                                                │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐│
│ │ Unrealized   │ │ Short-Term   │ │ Long-Term              ││
│ │ Gains        │ │ Gains        │ │ Gains                  ││
│ │ $18,450      │ │ $2,300       │ │ $16,150                ││
│ │ +6.2%        │ │ +3.1%        │ │ +7.8%                  ││
│ └──────────────┘ └──────────────┘ └────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ Holdings Summary                                            │
│ ┌──────────┬────────┬───────────┬──────────┬─────────────┐ │
│ │ Holding  │ Cost   │ Current   │ Gain/    │ Holding     │ │
│ │          │ Basis  │ Value     │ Loss     │ Period      │ │
│ ├──────────┼────────┼───────────┼──────────┼─────────────┤ │
│ │ AAPL     │$15,000 │ $18,500   │ +$3,500  │ 2.3 years   │ │
│ │ MSFT     │$12,000 │ $14,200   │ +$2,200  │ 1.8 years   │ │
│ │ TSLA     │$8,000  │ $7,200    │ -$800    │ 8 months 🔴 │ │
│ │ NVDA     │$10,000 │ $15,500   │ +$5,500  │ 3.1 years   │ │
│ └──────────┴────────┴───────────┴──────────┴─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Tax-Loss Harvesting Opportunities                           │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 💡 TSLA: -$800 loss (8 months holding period)           ││
│ │    Sell TSLA, buy similar ETF (e.g., VGT) to avoid      ││
│ │    wash sale. Tax savings: ~$192 (24% bracket)          ││
│ └──────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ Estimated Tax Liability (if all sold today)                │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Short-term gains: $2,300 × 24% = $552                   ││
│ │ Long-term gains: $16,150 × 15% = $2,423                 ││
│ │ Total federal tax: $2,975                                ││
│ │ (Plus state/local taxes if applicable)                   ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

### 1.4 Risk Analysis Tab

**User Story:**  
_As a risk-conscious investor, I want to understand my portfolio's volatility, correlation to market indices, and maximum drawdown so I can assess if my risk exposure aligns with my goals._

**Components:**
- **RiskMetricsCard** - Summary risk statistics
- **VolatilityChart** - Historical volatility over time
- **CorrelationMatrix** - Correlation between holdings and benchmarks
- **DrawdownChart** - Underwater chart showing peak-to-trough declines

**Metrics to Calculate:**

#### Portfolio Volatility (Standard Deviation)
- Formula: `σ = √(Σ(Rᵢ - R̄)² / (n-1))`
- Annualized using √252 trading days
- Typical ranges: 10-15% (moderate), 15-25% (aggressive), >25% (very aggressive)

#### Beta
- Measures sensitivity to market movements
- Formula: `β = Cov(Portfolio, Market) / Var(Market)`
- β = 1.0 means moves with market, <1.0 is less volatile, >1.0 is more volatile

#### Maximum Drawdown
- Largest peak-to-trough decline
- Formula: `MDD = (Trough - Peak) / Peak`
- Shows worst-case scenario loss

#### Correlation Matrix
- Correlation between each holding and benchmarks
- Values from -1 (inverse) to +1 (perfect correlation)
- Helps identify diversification

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Risk Analysis                                               │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐│
│ │ Volatility   │ │ Beta         │ │ Max Drawdown           ││
│ │ (Annualized) │ │ (vs S&P 500) │ │                        ││
│ │ 18.5%        │ │ 1.12         │ │ -22.3%                 ││
│ │ Moderate     │ │ Slightly     │ │ (Mar 2020)             ││
│ │              │ │ Aggressive   │ │                        ││
│ └──────────────┘ └──────────────┘ └────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ Volatility Over Time (30-day rolling)                      │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 30% ┼                                                     ││
│ │     │     ╭─╮                                            ││
│ │ 20% ┤    ╱   ╲                                           ││
│ │     │   ╱     ╰─╮                                        ││
│ │ 10% ┤  ╱        ╰────────────────                        ││
│ │     └──┬─────┬─────┬─────┬─────┬─────                   ││
│ │      2020   2021   2022   2023   2024   2025            ││
│ └──────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ Correlation Matrix                                          │
│ ┌─────────┬──────┬──────┬──────┬──────┬──────────────────┐ │
│ │         │ AAPL │ MSFT │ TSLA │ NVDA │ S&P 500          │ │
│ ├─────────┼──────┼──────┼──────┼──────┼──────────────────┤ │
│ │ AAPL    │ 1.00 │ 0.75 │ 0.42 │ 0.68 │ 0.82             │ │
│ │ MSFT    │ 0.75 │ 1.00 │ 0.38 │ 0.71 │ 0.85             │ │
│ │ TSLA    │ 0.42 │ 0.38 │ 1.00 │ 0.55 │ 0.45             │ │
│ │ NVDA    │ 0.68 │ 0.71 │ 0.55 │ 1.00 │ 0.76             │ │
│ │ S&P 500 │ 0.82 │ 0.85 │ 0.45 │ 0.76 │ 1.00             │ │
│ └─────────┴──────┴──────┴──────┴──────┴──────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Drawdown Chart (Underwater)                                 │
│ ┌──────────────────────────────────────────────────────────┐│
│ │   0% ┼─────╮              ╭──────────────────           ││
│ │      │      ╲            ╱                               ││
│ │ -10% ┤       ╲          ╱                                ││
│ │      │        ╲        ╱                                 ││
│ │ -20% ┤         ╰──────╯  ← Max Drawdown: -22.3%         ││
│ │      └──┬─────┬─────┬─────┬─────┬─────                  ││
│ │       2020   2021   2022   2023   2024   2025           ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Architecture

### 2.1 Backend Structure

**New Files:**

```
PFMP-API/
├── Controllers/
│   └── PortfolioAnalyticsController.cs (NEW - 400 lines)
├── Services/
│   ├── PerformanceCalculationService.cs (NEW - 300 lines)
│   ├── TaxInsightsService.cs (NEW - 250 lines)
│   ├── RiskAnalysisService.cs (NEW - 350 lines)
│   └── BenchmarkDataService.cs (NEW - 200 lines)
├── Models/
│   ├── Analytics/
│   │   ├── PerformanceMetrics.cs (NEW - 80 lines)
│   │   ├── AllocationBreakdown.cs (NEW - 100 lines)
│   │   ├── TaxInsights.cs (NEW - 90 lines)
│   │   └── RiskMetrics.cs (NEW - 110 lines)
```

**Total Backend:** ~1,880 lines

### 2.2 Frontend Structure

**New Files:**

```
pfmp-frontend/
├── src/
│   ├── components/
│   │   └── portfolio-analytics/
│   │       ├── PerformanceMetricsCard.tsx (NEW - 150 lines)
│   │       ├── PerformanceChart.tsx (NEW - 180 lines)
│   │       ├── BenchmarkComparisonTable.tsx (NEW - 120 lines)
│   │       ├── AllocationSunburstChart.tsx (NEW - 220 lines)
│   │       ├── AllocationTableView.tsx (NEW - 180 lines)
│   │       ├── RebalancingRecommendations.tsx (NEW - 140 lines)
│   │       ├── TaxSummaryCard.tsx (NEW - 130 lines)
│   │       ├── TaxLotTable.tsx (NEW - 170 lines)
│   │       ├── HarvestingOpportunities.tsx (NEW - 150 lines)
│   │       ├── RiskMetricsCard.tsx (NEW - 140 lines)
│   │       ├── VolatilityChart.tsx (NEW - 160 lines)
│   │       ├── CorrelationMatrix.tsx (NEW - 200 lines)
│   │       └── DrawdownChart.tsx (NEW - 170 lines)
│   ├── services/
│   │   └── portfolioAnalyticsApi.ts (NEW - 200 lines)
│   ├── utils/
│   │   └── financialCalculations.ts (NEW - 180 lines)
│   └── views/
│       └── dashboard/
│           └── InvestmentAccountDetail.tsx (MODIFIED +200 lines)
```

**Total Frontend:** ~2,490 lines

### 2.3 API Endpoints

#### Performance Metrics
```
GET /api/portfolios/{accountId}/performance?period=1Y
Response:
{
  "totalReturn": { "dollar": 45230.50, "percent": 15.3 },
  "timeWeightedReturn": 12.5,
  "moneyWeightedReturn": 11.2,
  "sharpeRatio": 1.82,
  "volatility": 18.5,
  "benchmarks": [
    { "name": "S&P 500", "return": 12.1, "volatility": 16.2, "sharpe": 1.54 },
    { "name": "Nasdaq 100", "return": 18.2, "volatility": 22.4, "sharpe": 1.71 }
  ],
  "historicalPerformance": [
    { "date": "2024-01-01", "portfolioValue": 295000, "benchmarkValue": 100 },
    { "date": "2024-02-01", "portfolioValue": 302500, "benchmarkValue": 102.5 }
  ]
}
```

#### Asset Allocation
```
GET /api/portfolios/{accountId}/allocation?dimension=sector
Response:
{
  "dimension": "sector",
  "allocations": [
    { "category": "Technology", "value": 120500, "percent": 40.8, "target": 35.0, "drift": 5.8 },
    { "category": "Healthcare", "value": 55000, "percent": 18.6, "target": 20.0, "drift": -1.4 }
  ],
  "rebalancingRecommendations": [
    {
      "action": "sell",
      "holding": "VGT",
      "shares": 25,
      "reason": "Technology 5.8% over target"
    }
  ]
}
```

#### Tax Insights
```
GET /api/portfolios/{accountId}/tax-insights
Response:
{
  "unrealizedGains": {
    "shortTerm": { "dollar": 2300, "percent": 3.1 },
    "longTerm": { "dollar": 16150, "percent": 7.8 },
    "total": { "dollar": 18450, "percent": 6.2 }
  },
  "holdings": [
    {
      "symbol": "AAPL",
      "costBasis": 15000,
      "currentValue": 18500,
      "gainLoss": 3500,
      "percentGain": 23.3,
      "holdingPeriod": "2.3 years",
      "taxType": "longTerm"
    }
  ],
  "harvestingOpportunities": [
    {
      "symbol": "TSLA",
      "loss": -800,
      "holdingPeriod": "8 months",
      "taxSavings": 192,
      "replacement": "VGT"
    }
  ],
  "estimatedTaxLiability": {
    "shortTermTax": 552,
    "longTermTax": 2423,
    "totalFederalTax": 2975
  }
}
```

#### Risk Metrics
```
GET /api/portfolios/{accountId}/risk-metrics?period=1Y
Response:
{
  "volatility": 18.5,
  "beta": 1.12,
  "maxDrawdown": -22.3,
  "maxDrawdownDate": "2020-03-23",
  "correlationMatrix": [
    { "symbol1": "AAPL", "symbol2": "MSFT", "correlation": 0.75 },
    { "symbol1": "AAPL", "symbol2": "SPY", "correlation": 0.82 }
  ],
  "volatilityHistory": [
    { "date": "2024-01-01", "volatility": 15.2 },
    { "date": "2024-02-01", "volatility": 16.8 }
  ],
  "drawdownHistory": [
    { "date": "2024-01-01", "drawdown": 0 },
    { "date": "2024-03-15", "drawdown": -8.5 }
  ]
}
```

---

## 3. Implementation Phases

### Phase 1: Backend Foundation (Week 1 - Days 1-3)

**Goal:** Build calculation services and API endpoints

**Tasks:**
1. Create `PerformanceCalculationService.cs`
   - Implement TWR calculation algorithm
   - Implement MWR/IRR calculation using Newton-Raphson method
   - Calculate Sharpe ratio
   - Fetch benchmark data from FMP API
   
2. Create `TaxInsightsService.cs`
   - Calculate unrealized gains/losses per holding
   - Identify short-term vs long-term holdings
   - Find tax-loss harvesting opportunities
   - Estimate tax liability

3. Create `RiskAnalysisService.cs`
   - Calculate portfolio volatility (standard deviation)
   - Calculate beta vs S&P 500
   - Find maximum drawdown
   - Build correlation matrix

4. Create `BenchmarkDataService.cs`
   - Fetch S&P 500, Nasdaq, Russell 2000 historical data
   - Cache benchmark data (update daily)
   - Calculate benchmark returns for comparison

5. Create `PortfolioAnalyticsController.cs`
   - 4 GET endpoints (performance, allocation, tax, risk)
   - Error handling and validation
   - Response DTOs

**Testing:**
- Unit tests for TWR/MWR calculations
- Unit tests for tax calculations
- Integration tests for API endpoints

**Estimated:** 3 days, 1,500 lines

---

### Phase 2: Frontend Components (Week 1 Days 4-5, Week 2 Days 1-3)

**Goal:** Build UI components for each analytics tab

**Day 4-5: Performance Tab**
1. `PerformanceMetricsCard.tsx` - Summary metrics cards
2. `PerformanceChart.tsx` - Recharts line chart with multiple series
3. `BenchmarkComparisonTable.tsx` - MUI DataGrid with benchmark data

**Week 2 Day 1-2: Allocation & Tax Tabs**
4. `AllocationSunburstChart.tsx` - D3.js sunburst or Recharts pie chart
5. `AllocationTableView.tsx` - Drill-down table with expand/collapse
6. `RebalancingRecommendations.tsx` - Alert cards with actions
7. `TaxSummaryCard.tsx` - Summary cards
8. `TaxLotTable.tsx` - DataGrid with sorting/filtering
9. `HarvestingOpportunities.tsx` - Action cards with recommendations

**Week 2 Day 3: Risk Tab**
10. `RiskMetricsCard.tsx` - Summary cards
11. `VolatilityChart.tsx` - Line chart with rolling volatility
12. `CorrelationMatrix.tsx` - Heatmap visualization
13. `DrawdownChart.tsx` - Area chart showing underwater periods

**Estimated:** 5 days, 2,200 lines

---

### Phase 3: Integration & Polish (Week 2 Days 4-5, Week 3)

**Goal:** Integrate components, add interactivity, test thoroughly

**Week 2 Days 4-5:**
1. Update `InvestmentAccountDetail.tsx` with new tabs
2. Wire up API calls using React Query
3. Add loading states and error handling
4. Implement period selector state management
5. Add drill-down interactivity for allocation charts

**Week 3:**
1. E2E testing with real account data
2. Performance optimization (memoization, lazy loading)
3. Mobile responsive design tweaks
4. Documentation updates
5. User acceptance testing
6. Bug fixes and polish

**Estimated:** 5 days, 500 lines

---

## 4. Dependencies & Libraries

### Backend
- **Existing:** Entity Framework Core, Npgsql, FMP API client
- **New:** None (use existing infrastructure)

### Frontend
- **Existing:** React, Material-UI, Recharts, React Query
- **New (Optional):**
  - `d3` - For advanced visualizations (sunburst, correlation heatmap)
  - `mathjs` - For complex financial calculations if needed

---

## 5. Database Schema Changes

**No schema changes required!** All analytics are calculated on-the-fly from existing data:
- `Holdings` table (cost basis, shares, current prices)
- `Transactions` table (buys, sells, dividends)
- FMP API (historical prices for benchmark comparison)

**Future Enhancement:** Consider caching calculated metrics in a new table:
```sql
CREATE TABLE PortfolioAnalyticsCache (
  AccountId INT PRIMARY KEY,
  CalculatedDate TIMESTAMP NOT NULL,
  TWR DECIMAL(10,4),
  MWR DECIMAL(10,4),
  Volatility DECIMAL(10,4),
  Beta DECIMAL(10,4),
  MaxDrawdown DECIMAL(10,4),
  JsonData JSONB -- Store full analytics payload
);
```

---

## 6. Financial Calculation Details

### 6.1 Time-Weighted Return (TWR)

**Why TWR?**
- Removes impact of cash flows (deposits/withdrawals)
- Better for comparing investment skill vs benchmarks
- Industry standard for fund managers

**Algorithm:**
```csharp
public decimal CalculateTWR(List<Transaction> transactions, List<DailyBalance> balances)
{
    decimal twrProduct = 1.0m;
    
    for (int i = 0; i < balances.Count - 1; i++)
    {
        var startBalance = balances[i].Balance;
        var endBalance = balances[i + 1].Balance;
        
        // Find cash flows between these dates
        var cashFlows = transactions
            .Where(t => t.Date > balances[i].Date && t.Date <= balances[i + 1].Date)
            .Sum(t => t.Type == "Buy" ? -t.Amount : t.Amount);
        
        // Period return = (Ending - Beginning - Cash Flows) / Beginning
        var periodReturn = (endBalance - startBalance - cashFlows) / startBalance;
        
        twrProduct *= (1 + periodReturn);
    }
    
    return (twrProduct - 1) * 100; // Convert to percentage
}
```

**Challenges:**
- Need daily balance history (can reconstruct from transactions + prices)
- Performance optimization for large datasets (>1000 transactions)

---

### 6.2 Money-Weighted Return (MWR/IRR)

**Why MWR?**
- Shows actual investor experience
- Accounts for timing of cash flows
- Penalizes poor timing (buying high, selling low)

**Algorithm (Newton-Raphson):**
```csharp
public decimal CalculateMWR(List<CashFlow> cashFlows, decimal finalValue)
{
    // Initial guess: 10% annual return
    decimal irr = 0.10m;
    int maxIterations = 100;
    decimal tolerance = 0.0001m;
    
    for (int i = 0; i < maxIterations; i++)
    {
        decimal npv = -finalValue; // Final value is an outflow
        decimal dnpv = 0;
        
        foreach (var cf in cashFlows)
        {
            var years = (DateTime.Today - cf.Date).Days / 365.25;
            var discountFactor = Math.Pow(1 + irr, years);
            
            npv += cf.Amount / discountFactor;
            dnpv -= years * cf.Amount / discountFactor / (1 + irr);
        }
        
        var irrNew = irr - (npv / dnpv);
        
        if (Math.Abs(irrNew - irr) < tolerance)
            return irrNew * 100; // Convert to percentage
        
        irr = irrNew;
    }
    
    throw new Exception("MWR calculation did not converge");
}
```

**Challenges:**
- Convergence issues if cash flows are irregular
- Need to handle edge cases (no transactions, zero balance)

---

### 6.3 Sharpe Ratio

**Formula:**
```
Sharpe Ratio = (Portfolio Return - Risk-Free Rate) / Portfolio Standard Deviation
```

**Implementation:**
```csharp
public decimal CalculateSharpeRatio(decimal portfolioReturn, decimal volatility, decimal riskFreeRate = 0.043m)
{
    // Risk-free rate: 10-year Treasury yield (~4.3% as of Nov 2025)
    var excessReturn = portfolioReturn - riskFreeRate;
    return excessReturn / volatility;
}
```

**Interpretation:**
- < 1.0: Poor risk-adjusted return
- 1.0 - 2.0: Good
- > 2.0: Excellent

---

### 6.4 Beta Calculation

**Formula:**
```
Beta = Covariance(Portfolio, Market) / Variance(Market)
```

**Implementation:**
```csharp
public decimal CalculateBeta(List<decimal> portfolioReturns, List<decimal> marketReturns)
{
    var portfolioMean = portfolioReturns.Average();
    var marketMean = marketReturns.Average();
    
    decimal covariance = 0;
    decimal marketVariance = 0;
    
    for (int i = 0; i < portfolioReturns.Count; i++)
    {
        covariance += (portfolioReturns[i] - portfolioMean) * (marketReturns[i] - marketMean);
        marketVariance += Math.Pow(marketReturns[i] - marketMean, 2);
    }
    
    covariance /= (portfolioReturns.Count - 1);
    marketVariance /= (portfolioReturns.Count - 1);
    
    return covariance / marketVariance;
}
```

---

### 6.5 Maximum Drawdown

**Formula:**
```
MDD = (Trough Value - Peak Value) / Peak Value
```

**Implementation:**
```csharp
public (decimal maxDrawdown, DateTime peakDate, DateTime troughDate) 
    CalculateMaxDrawdown(List<DailyBalance> balances)
{
    decimal maxDrawdown = 0;
    decimal peak = balances[0].Balance;
    DateTime peakDate = balances[0].Date;
    DateTime troughDate = balances[0].Date;
    
    foreach (var balance in balances)
    {
        if (balance.Balance > peak)
        {
            peak = balance.Balance;
            peakDate = balance.Date;
        }
        
        var drawdown = (balance.Balance - peak) / peak;
        
        if (drawdown < maxDrawdown)
        {
            maxDrawdown = drawdown;
            troughDate = balance.Date;
        }
    }
    
    return (maxDrawdown * 100, peakDate, troughDate);
}
```

---

## 7. Testing Strategy

### Unit Tests
```csharp
[Test]
public void TWR_WithNoTransactions_ReturnsZero()
{
    var service = new PerformanceCalculationService();
    var result = service.CalculateTWR(new List<Transaction>(), new List<DailyBalance>());
    Assert.AreEqual(0, result);
}

[Test]
public void TWR_With10PercentGain_Returns10()
{
    var balances = new List<DailyBalance>
    {
        new() { Date = DateTime.Today.AddDays(-365), Balance = 10000 },
        new() { Date = DateTime.Today, Balance = 11000 }
    };
    
    var result = service.CalculateTWR(new List<Transaction>(), balances);
    Assert.AreEqual(10.0, result, 0.01);
}

[Test]
public void MWR_WithMidYearDeposit_AccountsForTiming()
{
    var cashFlows = new List<CashFlow>
    {
        new() { Date = DateTime.Today.AddDays(-365), Amount = -10000 }, // Initial deposit
        new() { Date = DateTime.Today.AddDays(-180), Amount = -5000 }   // Mid-year deposit
    };
    
    var result = service.CalculateMWR(cashFlows, finalValue: 16500);
    Assert.IsTrue(result > 0 && result < 15); // Should be positive but less than 15%
}
```

### Integration Tests
```csharp
[Test]
public async Task PerformanceEndpoint_ReturnsValidMetrics()
{
    var response = await _client.GetAsync("/api/portfolios/123/performance?period=1Y");
    response.EnsureSuccessStatusCode();
    
    var metrics = await response.Content.ReadAsAsync<PerformanceMetrics>();
    
    Assert.IsNotNull(metrics.TotalReturn);
    Assert.IsTrue(metrics.TimeWeightedReturn >= -100 && metrics.TimeWeightedReturn <= 1000);
    Assert.IsTrue(metrics.SharpeRatio >= -5 && metrics.SharpeRatio <= 10);
}
```

### E2E Tests (Manual)
- [ ] Load investment account with 10+ holdings
- [ ] Verify TWR calculation matches Excel spreadsheet
- [ ] Verify MWR calculation with deposits/withdrawals
- [ ] Check allocation sunburst chart renders correctly
- [ ] Verify tax insights show correct short/long-term splits
- [ ] Verify risk metrics (volatility, beta, max drawdown) are reasonable
- [ ] Test period selector (1M, 3M, 6M, 1Y, etc.)
- [ ] Test benchmark comparison chart

---

## 8. Success Criteria

### Performance Metrics
- [ ] TWR calculation accurate within 0.1% vs Excel
- [ ] MWR calculation converges within 100 iterations
- [ ] Sharpe ratio calculated correctly using 10-year Treasury rate
- [ ] Benchmark data updates daily from FMP API
- [ ] Performance chart renders in <2 seconds for 5-year history

### Asset Allocation
- [ ] Allocation sums to 100% (no rounding errors)
- [ ] Sunburst chart supports drill-down (click to expand sectors)
- [ ] Rebalancing recommendations suggest specific trades
- [ ] Drift alerts trigger when allocation >5% off target

### Tax Insights
- [ ] Unrealized gains/losses match broker statements
- [ ] Short-term vs long-term classification correct (365-day threshold)
- [ ] Tax-loss harvesting identifies losses >$500
- [ ] Wash sale warnings for securities purchased within 30 days
- [ ] Estimated tax liability within 10% of actual (verified with tax software)

### Risk Analysis
- [ ] Volatility calculation matches industry standards
- [ ] Beta correlation with S&P 500 is reasonable (0.8-1.2 for diversified portfolios)
- [ ] Max drawdown accurately identifies worst decline
- [ ] Correlation matrix shows expected relationships (tech stocks correlated)

### User Experience
- [ ] All charts render correctly on desktop and mobile
- [ ] Loading states show skeletons (not blank screens)
- [ ] Error messages are user-friendly
- [ ] Period selector switches data without page reload
- [ ] Export functionality for all analytics (CSV/PDF)

---

## 9. Future Enhancements

### Phase 2 (Post-Option A)
1. **Custom Benchmarks**
   - Allow users to define custom benchmark portfolios
   - Compare against 60/40, target-date funds, etc.

2. **Monte Carlo Simulation**
   - Forecast future portfolio value with confidence intervals
   - Retirement planning: "Will I have enough?"

3. **Factor Analysis**
   - Fama-French 3-factor or 5-factor model
   - Identify sources of returns (size, value, momentum, quality, low volatility)

4. **Scenario Analysis**
   - "What if market crashes 30%?"
   - Stress testing against historical downturns

5. **Tax Optimization**
   - Automated tax-loss harvesting suggestions
   - Asset location optimization (tax-efficient vs taxable accounts)

---

## 10. Resources & References

### Financial Formulas
- [Investopedia: Time-Weighted Return](https://www.investopedia.com/terms/t/time-weightedror.asp)
- [Investopedia: Internal Rate of Return](https://www.investopedia.com/terms/i/irr.asp)
- [Investopedia: Sharpe Ratio](https://www.investopedia.com/terms/s/sharperatio.asp)
- [Investopedia: Beta](https://www.investopedia.com/terms/b/beta.asp)

### Implementation Examples
- [Portfolio Performance Calculator (GitHub)](https://github.com/buchen/portfolio)
- [QuantLib C++ Financial Library](https://www.quantlib.org/)
- [Python: empyrical (Quantopian)](https://github.com/quantopian/empyrical)

### APIs
- [Financial Modeling Prep](https://site.financialmodelingprep.com/developer/docs)
- [Alpha Vantage](https://www.alphavantage.co/documentation/)

---

## 11. Timeline & Milestones

### Week 1 (Nov 18-22, 2025)
- **Day 1-3:** Backend services + API endpoints
  - Milestone: All 4 endpoints working with test data
- **Day 4-5:** Performance tab components
  - Milestone: Performance tab rendering with sample data

### Week 2 (Nov 25-29, 2025)
- **Day 1-2:** Allocation & Tax tab components
  - Milestone: All analytics tabs rendering
- **Day 3:** Risk tab components
  - Milestone: Complete UI implementation
- **Day 4-5:** Integration & testing
  - Milestone: All tabs integrated into account detail view

### Week 3 (Dec 2-6, 2025)
- **Day 1-2:** Bug fixes & polish
- **Day 3:** Performance optimization
- **Day 4:** Documentation & demos
- **Day 5:** User acceptance testing
  - **Final Milestone:** Option A complete ✅

---

## 12. Risk Mitigation

### Technical Risks
1. **Financial calculation complexity**
   - Mitigation: Start with simplified formulas, add complexity iteratively
   - Validation: Compare results with Excel spreadsheets and broker statements

2. **Performance with large datasets**
   - Mitigation: Implement caching, use database aggregations
   - Validation: Load test with 1000+ holdings, 10,000+ transactions

3. **Historical price data gaps**
   - Mitigation: Handle missing data gracefully, interpolate if needed
   - Validation: Test with delisted stocks, IPOs, etc.

### Business Risks
1. **Accuracy concerns**
   - Mitigation: Add disclaimers, allow user to verify calculations
   - Validation: Beta test with financially literate users

2. **Regulatory compliance**
   - Mitigation: Do not provide investment advice, only analytics
   - Validation: Legal review of UI copy

---

## Conclusion

Wave 9.3 Option A transforms PFMP into a professional-grade investment analytics platform. The combination of performance metrics, tax insights, and risk analysis provides users with institutional-quality tools to optimize their portfolios.

**Next Action:** Begin Phase 1 - Backend Foundation

**Estimated Completion:** December 6, 2025

---

**Document Status:** Planning Phase  
**Last Updated:** November 16, 2025  
**Author:** AI Assistant + User Collaboration
