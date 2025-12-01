# Wave 9.3 Option B: Loan & Credit Card Views - Implementation Plan

**Date Created:** November 30, 2025  
**Status:** 📋 Planning  
**Timeline:** December 2025 (3-4 weeks)  
**Estimated Effort:** 2,000-2,500 lines

---

## Executive Summary

Wave 9.3 Option B completes the account type coverage by delivering comprehensive views for loan accounts (mortgages, auto loans, personal loans, student loans) and credit card accounts. This rounds out PFMP's ability to display all major financial account types.

**Core Features:**
1. **Loan Account Detail Views** - Amortization schedules, payoff calculators, extra payment analysis
2. **Credit Card Views** - Spending breakdown, utilization tracking, payment history
3. **Debt Payoff Strategies** - Avalanche vs snowball methods, interest savings calculations

---

## 1. Current State Analysis

### Existing Account Types in Database
The `Accounts` table already supports these account types via the `AccountType` enum:

**Loan Types:**
- `Mortgage` (6)
- `AutoLoan` (7)
- `PersonalLoan` (8)
- `StudentLoan` (9)

**Credit Types:**
- `CreditCard` (5)

### Existing Account Schema
```csharp
// Already in Account.cs
public decimal InterestRate { get; set; }          // APR/APY
public decimal CreditLimit { get; set; }           // For credit cards
public decimal MinimumPayment { get; set; }        // Monthly minimum
public DateTime? PaymentDueDate { get; set; }      // Next payment due
public int? LoanTermMonths { get; set; }           // Total loan term
public DateTime? LoanStartDate { get; set; }       // When loan originated
public decimal OriginalLoanAmount { get; set; }    // Original principal
```

### Current UI State
- Loan and credit card accounts display on dashboard
- No dedicated detail views exist
- Clicking these accounts shows generic placeholder or investment-style view (incorrect)

---

## 2. Feature Specifications

### 2.1 Loan Account Detail Views

**User Story:**  
_As a borrower, I want to see my loan details including amortization schedule, remaining payments, and payoff scenarios so I can plan my debt repayment strategy._

**Applicable Account Types:**
- Mortgage
- Auto Loan
- Personal Loan
- Student Loan

**Components:**

#### LoanSummaryHeader
- Current balance (prominent)
- Original loan amount
- Interest rate (APR)
- Monthly payment amount
- Remaining term (e.g., "48 months remaining")
- Loan start date
- Estimated payoff date
- Total interest paid to date
- Total interest remaining

#### AmortizationScheduleTable
- DataGrid with monthly breakdown
- Columns: Payment #, Date, Payment, Principal, Interest, Balance
- Highlight current month
- Show cumulative totals (total principal paid, total interest paid)
- Export to CSV functionality
- Pagination (12/24/60/All rows)

#### PayoffCalculator
- Input: Extra monthly payment amount
- Output:
  - New payoff date
  - Months saved
  - Interest saved
  - Total cost comparison (original vs accelerated)
- Slider for easy adjustment ($0 to $1,000 extra)
- Visual comparison chart

#### LoanProgressCard
- Progress bar showing % paid off
- Principal vs Interest pie chart (total paid)
- Equity visualization (for mortgages: home value vs remaining balance)

#### PaymentHistory
- List of past payments
- Date, Amount, Principal Applied, Interest Applied
- Late payment indicators
- Running balance

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ LoanSummaryHeader                                           │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│ │ Balance  │ │ Rate     │ │ Payment  │ │ Payoff Date      │ │
│ │ $245,000 │ │ 6.5%     │ │ $1,896   │ │ Jan 2054         │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Tabs: [Overview] [Amortization] [Payoff Calculator] [History]
├─────────────────────────────────────────────────────────────┤
│ Overview Tab:                                               │
│ ┌─ Progress ────────────────┐ ┌─ Principal vs Interest ───┐ │
│ │ ████████░░░░░░░░░░░ 18%   │ │      ╱─────╲             │ │
│ │ $55,000 of $300,000 paid  │ │     │ 28%  │ Principal   │ │
│ │                           │ │     │      │ $55,000     │ │
│ │ Est. payoff: Jan 2054     │ │      ╲─────╱             │ │
│ └───────────────────────────┘ │      72% Interest        │ │
│                               │      $142,000 (total)    │ │
│                               └──────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Amortization Tab:                                           │
│ ┌────────┬──────────┬─────────┬──────────┬─────────┬───────┐│
│ │ # │ Date    │ Payment │ Principal│ Interest │ Balance ││
│ ├────────┼──────────┼─────────┼──────────┼─────────┼───────┤│
│ │ 1 │ Feb 2024│ $1,896  │ $271     │ $1,625   │$299,729││
│ │ 2 │ Mar 2024│ $1,896  │ $273     │ $1,623   │$299,456││
│ │...│ ...     │ ...     │ ...      │ ...      │ ...    ││
│ └────────┴──────────┴─────────┴──────────┴─────────┴───────┘│
├─────────────────────────────────────────────────────────────┤
│ Payoff Calculator Tab:                                      │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Extra Monthly Payment: $_________ [━━━━━●━━━━━] $500    ││
│ │                                                          ││
│ │ ┌────────────────────┬────────────────────┐              ││
│ │ │ Current Plan       │ With Extra Payment │              ││
│ │ ├────────────────────┼────────────────────┤              ││
│ │ │ Payoff: Jan 2054   │ Payoff: Mar 2047   │              ││
│ │ │ Total Int: $383K   │ Total Int: $248K   │              ││
│ │ │ Total Cost: $683K  │ Total Cost: $548K  │              ││
│ │ └────────────────────┴────────────────────┘              ││
│ │                                                          ││
│ │ 💰 You save: 7 years and $135,000 in interest!          ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

### 2.2 Credit Card Views

**User Story:**  
_As a credit card holder, I want to see my spending patterns, credit utilization, and payment history so I can manage my credit responsibly._

**Applicable Account Types:**
- Credit Card

**Components:**

#### CreditCardSummaryHeader
- Current balance (what you owe)
- Available credit
- Credit limit
- Utilization percentage (with color coding)
- APR
- Minimum payment due
- Payment due date
- Statement balance

#### UtilizationGauge
- Visual gauge (0-100%)
- Color zones: Green (0-30%), Yellow (30-50%), Red (50%+)
- Current vs recommended utilization
- Impact on credit score messaging

#### SpendingBreakdownChart
- Pie chart by category (if transaction data available)
- Categories: Groceries, Dining, Gas, Shopping, Travel, Entertainment, Bills, Other
- Time period selector: This Month, Last Month, Last 3 Months, YTD
- Fallback: "Add transactions to see spending breakdown"

#### PaymentHistory
- List of payments made
- Date, Amount, On-Time indicator
- Payment streak (e.g., "12 months on-time payments")

#### StatementHistory
- Monthly statement balances
- Line chart showing balance over time
- Highlight minimum payment vs actual payment

#### RewardsTracker (if applicable)
- Points/Cashback earned
- Redemption options (placeholder - future feature)

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ CreditCardSummaryHeader                                     │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│ │ Balance  │ │ Available│ │ APR      │ │ Due Date         │ │
│ │ $2,450   │ │ $7,550   │ │ 24.99%   │ │ Dec 15, 2025     │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Tabs: [Overview] [Spending] [Payments] [Statements]         │
├─────────────────────────────────────────────────────────────┤
│ Overview Tab:                                               │
│ ┌─ Credit Utilization ─────┐ ┌─ Payment Status ───────────┐ │
│ │                          │ │ Next Payment Due:          │ │
│ │   ╭────────────────╮     │ │ $75.00 minimum             │ │
│ │   │    24.5%       │     │ │ by Dec 15, 2025            │ │
│ │   │   ████████░░   │     │ │                            │ │
│ │   ╰────────────────╯     │ │ [Pay Now] [Schedule]       │ │
│ │   $2,450 of $10,000      │ │                            │ │
│ │   ✓ Good utilization     │ │ 🔥 12-month streak!        │ │
│ └──────────────────────────┘ └────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Spending Tab:                                               │
│ ┌─ By Category ────────────┐ ┌─ Top Merchants ────────────┐ │
│ │      ╱─────╲             │ │ 1. Amazon       $450       │ │
│ │     ╱ Dining ╲           │ │ 2. Whole Foods  $320       │ │
│ │    │   35%    │          │ │ 3. Shell Gas    $180       │ │
│ │     ╲ $875   ╱           │ │ 4. Netflix      $15        │ │
│ │      ╲─────╱             │ │ 5. Spotify      $10        │ │
│ │  Gas 15% │ Shop 25%      │ └────────────────────────────┘ │
│ └──────────────────────────┘                                │
├─────────────────────────────────────────────────────────────┤
│ Payments Tab:                                               │
│ ┌──────────┬──────────┬────────────────────────────────────┐│
│ │ Date     │ Amount   │ Status                             ││
│ ├──────────┼──────────┼────────────────────────────────────┤│
│ │ Nov 15   │ $500.00  │ ✓ On-Time (above minimum)         ││
│ │ Oct 15   │ $2,100   │ ✓ On-Time (paid in full)          ││
│ │ Sep 15   │ $75.00   │ ✓ On-Time (minimum payment)       ││
│ └──────────┴──────────┴────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

### 2.3 Debt Payoff Strategies

**User Story:**  
_As someone with multiple debts, I want to see different payoff strategies compared so I can choose the best approach for my situation._

**Components:**

#### DebtOverviewDashboard
- Total debt across all loan/credit accounts
- Average interest rate (weighted)
- Total minimum payments
- Estimated debt-free date (current pace)

#### PayoffStrategyComparison
- Side-by-side comparison of:
  - **Avalanche Method**: Pay highest interest first
  - **Snowball Method**: Pay lowest balance first
  - **Current (Minimum Payments)**: Just minimums
- For each strategy show:
  - Debt-free date
  - Total interest paid
  - Monthly payment recommendation

#### DebtPayoffSimulator
- Input: Extra monthly amount to put toward debt
- Drag-and-drop to prioritize debts manually
- Visual timeline showing each debt being paid off
- Milestone celebrations

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Debt Payoff Strategies                                      │
├─────────────────────────────────────────────────────────────┤
│ Your Debt Overview                                          │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Total Debt: $285,450    Avg Rate: 8.2%    Min/Mo: $2,650 ││
│ └──────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ Compare Strategies:                                         │
│ ┌───────────────────┬───────────────────┬──────────────────┐│
│ │ 🔥 Avalanche      │ ❄️ Snowball       │ 📉 Minimum Only  ││
│ │ (Highest Rate)    │ (Lowest Balance)  │ (No Extra)       ││
│ ├───────────────────┼───────────────────┼──────────────────┤│
│ │ Debt-free:        │ Debt-free:        │ Debt-free:       ││
│ │ Mar 2032          │ Jun 2032          │ Jan 2054         ││
│ │                   │                   │                  ││
│ │ Total Interest:   │ Total Interest:   │ Total Interest:  ││
│ │ $45,200           │ $48,900           │ $385,000         ││
│ │                   │                   │                  ││
│ │ Extra/month: $500 │ Extra/month: $500 │ Extra: $0        ││
│ ├───────────────────┼───────────────────┼──────────────────┤│
│ │ [Select Plan]     │ [Select Plan]     │                  ││
│ └───────────────────┴───────────────────┴──────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ Payoff Order (Avalanche):                                   │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 1. Credit Card (24.99%) ████████░░░░ Paid off: Jun 2026  ││
│ │ 2. Personal Loan (12%) ██████░░░░░░░ Paid off: Dec 2027  ││
│ │ 3. Auto Loan (6.9%) ████░░░░░░░░░░░░ Paid off: Aug 2028  ││
│ │ 4. Mortgage (6.5%) ██░░░░░░░░░░░░░░░ Paid off: Mar 2032  ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Technical Architecture

### 3.1 Backend Structure

**New Files:**

```
PFMP-API/
├── Controllers/
│   └── LoanAnalyticsController.cs (NEW - 300 lines)
├── Services/
│   ├── AmortizationService.cs (NEW - 200 lines)
│   ├── CreditUtilizationService.cs (NEW - 150 lines)
│   └── DebtPayoffService.cs (NEW - 250 lines)
├── DTOs/
│   └── LoanDTOs.cs (NEW - 100 lines)
```

**Total Backend:** ~1,000 lines

### 3.2 Frontend Structure

**New Files:**

```
pfmp-frontend/
├── src/
│   ├── components/
│   │   ├── loan-accounts/
│   │   │   ├── LoanSummaryHeader.tsx (NEW - 150 lines)
│   │   │   ├── AmortizationTable.tsx (NEW - 200 lines)
│   │   │   ├── PayoffCalculator.tsx (NEW - 250 lines)
│   │   │   ├── LoanProgressCard.tsx (NEW - 120 lines)
│   │   │   └── LoanPaymentHistory.tsx (NEW - 150 lines)
│   │   ├── credit-card-accounts/
│   │   │   ├── CreditCardSummaryHeader.tsx (NEW - 150 lines)
│   │   │   ├── UtilizationGauge.tsx (NEW - 100 lines)
│   │   │   ├── SpendingBreakdownChart.tsx (NEW - 180 lines)
│   │   │   ├── CreditCardPaymentHistory.tsx (NEW - 120 lines)
│   │   │   └── StatementHistory.tsx (NEW - 130 lines)
│   │   └── debt-strategies/
│   │       ├── DebtOverviewDashboard.tsx (NEW - 150 lines)
│   │       ├── PayoffStrategyComparison.tsx (NEW - 200 lines)
│   │       └── DebtPayoffSimulator.tsx (NEW - 250 lines)
│   ├── views/
│   │   └── dashboard/
│   │       ├── LoanAccountDetailView.tsx (NEW - 200 lines)
│   │       └── CreditCardDetailView.tsx (NEW - 200 lines)
│   └── services/
│       └── loanAnalyticsApi.ts (NEW - 150 lines)
```

**Total Frontend:** ~2,300 lines

### 3.3 API Endpoints

#### Amortization Schedule
```
GET /api/loans/{accountId}/amortization
Response:
{
  "accountId": 123,
  "loanDetails": {
    "originalAmount": 300000,
    "currentBalance": 245000,
    "interestRate": 6.5,
    "monthlyPayment": 1896.20,
    "termMonths": 360,
    "startDate": "2024-01-15",
    "estimatedPayoffDate": "2054-01-15"
  },
  "schedule": [
    {
      "paymentNumber": 1,
      "date": "2024-02-15",
      "payment": 1896.20,
      "principal": 271.20,
      "interest": 1625.00,
      "balance": 299728.80,
      "cumulativePrincipal": 271.20,
      "cumulativeInterest": 1625.00
    },
    // ... 360 payments
  ],
  "summary": {
    "totalPayments": 682632.00,
    "totalInterest": 382632.00,
    "percentPaid": 18.33,
    "paymentsRemaining": 348
  }
}
```

#### Payoff Calculator
```
POST /api/loans/{accountId}/payoff-calculator
Request:
{
  "extraMonthlyPayment": 500.00
}
Response:
{
  "currentPlan": {
    "payoffDate": "2054-01-15",
    "totalInterest": 382632.00,
    "totalCost": 682632.00,
    "monthsRemaining": 348
  },
  "acceleratedPlan": {
    "payoffDate": "2047-03-15",
    "totalInterest": 248000.00,
    "totalCost": 548000.00,
    "monthsRemaining": 268
  },
  "savings": {
    "monthsSaved": 80,
    "interestSaved": 134632.00,
    "yearsSaved": 6.67
  }
}
```

#### Credit Utilization
```
GET /api/credit-cards/{accountId}/utilization
Response:
{
  "accountId": 456,
  "currentBalance": 2450.00,
  "creditLimit": 10000.00,
  "availableCredit": 7550.00,
  "utilizationPercent": 24.5,
  "utilizationStatus": "Good", // Good (<30%), Fair (30-50%), Poor (>50%)
  "utilizationHistory": [
    { "date": "2025-11-01", "utilization": 32.1 },
    { "date": "2025-10-01", "utilization": 28.5 },
    // ... 12 months
  ]
}
```

#### Debt Payoff Strategies
```
GET /api/debt/payoff-strategies?extraMonthlyPayment=500
Response:
{
  "totalDebt": 285450.00,
  "averageInterestRate": 8.2,
  "totalMinimumPayment": 2650.00,
  "debts": [
    {
      "accountId": 456,
      "accountName": "Chase Credit Card",
      "balance": 2450.00,
      "interestRate": 24.99,
      "minimumPayment": 75.00
    },
    // ... other debts
  ],
  "strategies": {
    "avalanche": {
      "payoffDate": "2032-03-15",
      "totalInterest": 45200.00,
      "order": [456, 789, 101, 123]
    },
    "snowball": {
      "payoffDate": "2032-06-15",
      "totalInterest": 48900.00,
      "order": [456, 101, 789, 123]
    },
    "minimumOnly": {
      "payoffDate": "2054-01-15",
      "totalInterest": 385000.00
    }
  }
}
```

---

## 4. Implementation Phases

### Phase 1: Backend Services (Week 1)

**Days 1-2: Amortization Service**
- Calculate standard amortization schedule
- Support different compounding frequencies
- Handle extra payments

**Days 3-4: Credit Utilization Service**
- Calculate current utilization
- Track utilization history
- Generate utilization status

**Day 5: Debt Payoff Service**
- Implement avalanche algorithm
- Implement snowball algorithm
- Compare strategies

### Phase 2: Loan Account Views (Week 2)

**Days 1-2: LoanAccountDetailView**
- Create view with tab structure
- Implement LoanSummaryHeader
- Implement LoanProgressCard

**Days 3-4: Amortization & Payoff**
- AmortizationTable with DataGrid
- PayoffCalculator with slider

**Day 5: Payment History**
- LoanPaymentHistory component
- Integration with transactions

### Phase 3: Credit Card Views (Week 3)

**Days 1-2: CreditCardDetailView**
- Create view with tab structure
- CreditCardSummaryHeader
- UtilizationGauge

**Days 3-4: Spending & Payments**
- SpendingBreakdownChart (requires transaction categorization)
- CreditCardPaymentHistory
- StatementHistory

**Day 5: Integration**
- Wire up to AccountDetailView routing
- Test with sample data

### Phase 4: Debt Strategies & Polish (Week 4)

**Days 1-2: Debt Overview**
- DebtOverviewDashboard
- PayoffStrategyComparison

**Days 3-4: Simulator & Testing**
- DebtPayoffSimulator
- End-to-end testing
- Bug fixes

**Day 5: Documentation & Cleanup**
- Update documentation
- Code review
- Final polish

---

## 5. Database Considerations

### Existing Fields (Already in Account model)
```csharp
public decimal InterestRate { get; set; }
public decimal CreditLimit { get; set; }
public decimal MinimumPayment { get; set; }
public DateTime? PaymentDueDate { get; set; }
public int? LoanTermMonths { get; set; }
public DateTime? LoanStartDate { get; set; }
public decimal OriginalLoanAmount { get; set; }
```

### Potential New Fields (Evaluate during implementation)
```csharp
// Consider adding if needed:
public decimal? StatementBalance { get; set; }      // Last statement
public DateTime? StatementDate { get; set; }        // Statement close date
public int? PaymentStreak { get; set; }             // Consecutive on-time payments
public decimal? CashbackEarned { get; set; }        // Rewards tracking
```

### Sample Data Requirements
- Create test loan accounts with realistic terms
- Create test credit card accounts with utilization
- Seed transaction history for spending breakdown

---

## 6. Dependencies

### Backend
```csharp
// No new dependencies - use existing EF Core, math operations
```

### Frontend
```json
{
  // No new dependencies - use existing:
  // - Recharts for charts
  // - MUI DataGrid for tables
  // - MUI Slider for payoff calculator
}
```

---

## 7. Testing Strategy

### Unit Tests
- Amortization calculation accuracy
- Payoff date calculation
- Utilization percentage calculation
- Avalanche vs snowball ordering

### Integration Tests
- API endpoints return correct data
- Edge cases: 0% interest, paid-off loans, maxed-out cards

### Manual Testing Checklist
- [ ] Loan account displays correct summary
- [ ] Amortization schedule matches expected values
- [ ] Extra payment calculator shows savings
- [ ] Credit card utilization gauge works
- [ ] Spending breakdown renders (with/without transactions)
- [ ] Debt strategies compare correctly
- [ ] Responsive design on mobile

---

## 8. Success Criteria

### Functional Requirements
- [ ] Loan accounts show amortization schedules
- [ ] Payoff calculator accurately projects savings
- [ ] Credit cards show utilization with color coding
- [ ] Debt strategies provide actionable recommendations
- [ ] All views handle empty/missing data gracefully

### Performance Requirements
- [ ] Amortization calculation <500ms for 30-year loans
- [ ] Views render in <1 second
- [ ] Charts animate smoothly

### User Experience
- [ ] Clear visual hierarchy in all views
- [ ] Intuitive navigation between tabs
- [ ] Helpful empty states with guidance
- [ ] Mobile-responsive design

---

## 9. Known Limitations & Future Enhancements

### Current Scope Limitations
1. **No Payment Integration**: View-only, no actual payment processing
2. **No Category AI**: Spending breakdown requires manual categorization
3. **No Alerts**: Payment reminders not automated (future Wave 10)
4. **Single Currency**: USD only

### Future Enhancements (Post-Option B)
- [ ] Payment scheduling and reminders
- [ ] AI-powered transaction categorization
- [ ] Multi-currency support
- [ ] Linked account auto-sync (Wave 11)
- [ ] Bill negotiation recommendations
- [ ] Refinancing comparisons

---

## 10. Roadmap Alignment

**Before Option B:**
- ✅ Wave 9.3 Option C: Cash Account UX
- ✅ Wave 9.3 Option A: Investment Metrics (All Parts)

**Option B Delivers:**
- Complete account type coverage (loans, credit cards)
- Foundation for debt management features
- User-facing debt payoff tools

**After Option B:**
- Wave 10: Background Jobs (if needed before Plaid)
- Wave 11: Plaid Bank Linking (January 2026)
- Debt alerts and automation

---

## 11. References

1. **Amortization Formulas**: Standard PMT calculation
2. **Credit Utilization Best Practices**: FICO scoring guidelines
3. **Debt Payoff Methods**: Ramsey (Snowball) vs mathematical (Avalanche)
4. **Existing Code**: `CashAccountDetailView.tsx`, `AccountDetailView.tsx`

---

**Document Status:** 📋 Planning  
**Next Action:** Begin Phase 1 - Backend Services  
**Start Date:** December 2025  
**Estimated Completion:** Late December 2025
