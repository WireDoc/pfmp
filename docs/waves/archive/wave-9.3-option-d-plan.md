# Wave 9.3 Option D: Advanced Portfolio Visualization

> **Status**: 📋 Planning  
> **Priority**: Medium  
> **Estimated Effort**: 1-2 sessions  
> **Prerequisites**: Wave 9.3 Options A, B, C complete ✅

## Summary

Wave 9.3 Option D enhances PFMP's data visualization capabilities with interactive D3.js-powered charts that provide deeper insight into portfolio composition, cash flow, and historical trends. This is primarily a frontend effort since all backend analytics are already in place from Option A.

## Goals

1. **Upgrade allocation visualization** from static pie charts to interactive sunburst
2. **Add net worth timeline** showing historical growth across all account types
3. **Improve correlation visibility** with interactive heatmap
4. **Visualize cash flow** with Sankey diagram showing income → savings → investments

## Features

### 1. Allocation Sunburst Chart (Priority 1)

**Location**: Investment Account Detail → Allocation Tab

Replace or augment the current pie chart with an interactive D3 sunburst:

```
                    ┌─────────────────┐
                   /   Asset Class    \
                  /  ┌─────────────┐   \
                 /  /    Sector     \   \
                /  /  ┌───────────┐  \   \
               /  /  /   Holding   \  \   \
              │  │  │     AAPL      │  │   │
              │  │  │    $5,000     │  │   │
               \  \  \             /  /   /
                \  \  └───────────┘  /   /
                 \  └─────────────┘   /
                  \                   /
                   └─────────────────┘
```

**Features**:
- 3-level hierarchy: Asset Class → Sector → Individual Holdings
- Click to zoom into a segment
- Breadcrumb trail for navigation back up
- Hover tooltips showing value and percentage
- Smooth animated transitions

**Data source**: `/api/investment-analytics/{accountId}/allocation` (existing)

### 2. Net Worth Timeline (Priority 2)

**Location**: Main Dashboard (new widget or dedicated page)

Stacked area chart showing net worth growth over time by category:

```
  $500K ┤                                    ╭──── Investments
        │                              ╭─────╯
  $400K ┤                        ╭─────╯
        │                  ╭─────╯
  $300K ┤            ╭─────╯                 ╭──── Real Estate (equity)
        │      ╭─────╯               ╭───────╯
  $200K ┤╭─────╯               ╭─────╯
        ││             ╭───────╯             ╭──── Cash
  $100K ┤│       ╭─────╯               ╭─────╯
        ││ ╭─────╯               ╭─────╯
    $0K ┼┴─┴─────┴───────┴───────┴───────┴───────
        Jan   Mar   May   Jul   Sep   Nov   Dec
```

**Features**:
- Toggle between 1M, 3M, 6M, 1Y, YTD, ALL timeframes
- Stack by: Account Type, Asset Class, or Individual Account
- Hover shows breakdown at any point in time
- Milestone markers for major events (contributions, withdrawals)

**Data source**: Requires new endpoint or aggregation from existing snapshots

### 3. Correlation Heatmap (Priority 3)

**Location**: Investment Account Detail → Risk Analysis Tab

Interactive matrix showing correlation between holdings:

```
           AAPL   MSFT   GOOGL   VTI   BND
    AAPL   1.00   0.85   0.72   0.65  -0.12
    MSFT   0.85   1.00   0.78   0.70  -0.08
    GOOGL  0.72   0.78   1.00   0.68  -0.15
    VTI    0.65   0.70   0.68   1.00   0.05
    BND   -0.12  -0.08  -0.15   0.05   1.00
```

**Features**:
- Color scale: Red (negative) → White (zero) → Green (positive)
- Hover shows exact correlation value and interpretation
- Click cell to see detailed scatter plot of the two assets
- Sort by highest/lowest correlation to identify diversification gaps

**Data source**: `/api/investment-analytics/{accountId}/risk` (existing, may need extension)

### 4. Cash Flow Sankey Diagram (Priority 4 - Stretch)

**Location**: New "Cash Flow" dashboard page or modal

Visualize money flow from income sources through to savings/investments:

```
                    ┌────────────────┐
    Salary ────────►│                │───────► TSP Contributions
                    │                │
    Bonus ─────────►│   Total        │───────► Brokerage Deposits
                    │   Income       │
    Rental ────────►│                │───────► Savings Account
                    │                │
                    │                │───────► Emergency Fund
                    └────────────────┘
                           │
                           ▼
                      Expenses
```

**Features**:
- Width of flow lines proportional to dollar amount
- Color coding by category
- Hover shows amounts and percentages
- Time period selector (monthly/quarterly/annual)

**Data source**: Would need transaction categorization (future feature)

---

## Technical Approach

### Library Choice: D3.js vs Recharts

| Feature | Recharts (current) | D3.js |
|---------|-------------------|-------|
| Pie/Bar/Line | ✅ Easy | ✅ More work |
| Sunburst | ❌ Not supported | ✅ Native |
| Sankey | ❌ Not supported | ✅ Native |
| Heatmap | ⚠️ Limited | ✅ Full control |
| Bundle size | ~180KB | ~250KB |
| Learning curve | Low | Medium-High |

**Recommendation**: Use D3.js for sunburst and Sankey, keep Recharts for line/bar charts.

### Component Architecture

```
pfmp-frontend/src/
├── components/
│   └── visualizations/
│       ├── SunburstChart.tsx         # D3 sunburst with React wrapper
│       ├── CorrelationHeatmap.tsx    # D3 heatmap
│       ├── SankeyDiagram.tsx         # D3 Sankey (stretch)
│       ├── NetWorthTimeline.tsx      # Recharts stacked area
│       └── index.ts
└── hooks/
    └── useD3.ts                      # D3 + React integration hook
```

### D3 + React Integration Pattern

```typescript
// useD3.ts - Reusable hook for D3 in React
import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export function useD3(
  renderFn: (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => void,
  dependencies: React.DependencyList
) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (ref.current) {
      renderFn(d3.select(ref.current));
    }
  }, dependencies);

  return ref;
}
```

---

## Implementation Phases

### Phase 1: Sunburst Chart (Priority)
- Install D3.js: `npm install d3 @types/d3`
- Create `useD3` hook
- Build `SunburstChart` component
- Integrate into Allocation tab
- Add zoom/breadcrumb interaction

**Estimated**: 2-3 hours

### Phase 2: Net Worth Timeline
- Create endpoint or aggregate existing data
- Build `NetWorthTimeline` with Recharts
- Add to dashboard or new dedicated page
- Time range selector

**Estimated**: 2-3 hours

### Phase 3: Correlation Heatmap
- Build `CorrelationHeatmap` component
- Integrate into Risk Analysis tab
- Add hover tooltips and interactions

**Estimated**: 1-2 hours

### Phase 4: Sankey Diagram (Stretch)
- Requires transaction categorization data
- May defer to Wave 10+

**Estimated**: 3-4 hours (if data available)

---

## Success Criteria

1. ✅ Sunburst chart renders allocation with 3 levels of drill-down
2. ✅ Users can click to zoom and navigate back via breadcrumbs
3. ✅ Net worth timeline shows historical growth by category
4. ✅ Correlation heatmap displays in Risk Analysis tab
5. ✅ All charts are responsive (mobile-friendly)
6. ✅ Performance: Charts render in <500ms

---

## Dependencies

- **D3.js** - `npm install d3 @types/d3`
- Existing backend endpoints (no new APIs needed for Phase 1-3)

---

## Files to Create/Modify

### New Files
```
pfmp-frontend/src/
├── components/visualizations/
│   ├── SunburstChart.tsx         (~200 lines)
│   ├── CorrelationHeatmap.tsx    (~150 lines)
│   ├── NetWorthTimeline.tsx      (~180 lines)
│   └── index.ts
└── hooks/
    └── useD3.ts                  (~30 lines)
```

### Modified Files
```
pfmp-frontend/src/views/dashboard/
├── InvestmentAccountDetailView.tsx  # Add sunburst to Allocation tab
└── components/analytics/
    └── AllocationTab.tsx            # Replace/augment pie chart
    └── RiskAnalysisTab.tsx          # Add correlation heatmap
```

---

## Document Status

**Planning**: ✅ Complete  
**Implementation**: 📋 Ready to start  
**Next Document**: `wave-9.3-option-d-complete.md` (after implementation)

---

**After Wave 9.3 Option D**: Wave 9.3 will be fully complete. Move to Wave 10 (Background Jobs) or Wave 11 (Plaid Integration).
