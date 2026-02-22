# Plaid Custom Sandbox Users for PFMP Testing

This document contains JSON configurations for creating custom Plaid sandbox users to test various investment scenarios.

## How to Create Custom Users

1. Go to [Plaid Dashboard → Developers → Sandbox → Custom Sandbox Users](https://dashboard.plaid.com/developers/sandbox?tab=testUsers)
2. Click "Create Custom User"
3. Enter a username (e.g., `custom_pfmp_new_investor`)
4. Paste the JSON configuration as the password
5. Click Create

Then in PFMP, use Plaid Link with that username and any non-empty password.

---

## Test User 0: Minimal JSON Test User

**Username:** `custom_pfmp_minimal`

**Scenario:** Bare minimum JSON to validate schema. Use this to incrementally add fields and test.

```json
{
  "version": 2,
  "override_accounts": [
    {
      "type": "investment",
      "subtype": "brokerage",
      "starting_balance": 10000,
      "currency": "USD",
      "holdings": [
        {
          "quantity": 10,
          "institution_price": 195.50,
          "institution_price_as_of": "2025-12-16",
          "cost_basis": 1900,
          "currency": "USD",
          "security": {
            "ticker_symbol": "AAPL",
            "name": "Apple Inc.",
            "currency": "USD"
          }
        }
      ],
      "investment_transactions": [
        {
          "date": "2025-11-25",
          "name": "Buy AAPL",
          "quantity": 10,
          "price": 190,
          "fees": 0,
          "type": "buy",
          "currency": "USD",
          "security": {
            "ticker_symbol": "AAPL",
            "name": "Apple Inc.",
            "currency": "USD"
          }
        }
      ]
    }
  ]
}
```

---

## Test User 1: New Investor (Transactions Reconcile)

**Username:** `custom_pfmp_new_investor`

**Scenario:** New brokerage account opened 20 days ago. All buys are within Plaid's history window, so transactions should fully reconcile to current holdings. This tests the "no opening balance needed" case.

**Note:** The `starting_balance` is the cash balance Plaid reports, NOT the holdings total. For simplicity, set it to match holdings value ($10,350) or set to 0 if the investor is fully invested.

```json
{
  "version": 2,
  "override_accounts": [
    {
      "type": "investment",
      "subtype": "brokerage",
      "starting_balance": 10350,
      "currency": "USD",
      "holdings": [
        {
          "quantity": 10,
          "institution_price": 195.50,
          "institution_price_as_of": "2025-12-16",
          "cost_basis": 1900,
          "currency": "USD",
          "security": {
            "ticker_symbol": "AAPL",
            "name": "Apple Inc.",
            "currency": "USD"
          }
        },
        {
          "quantity": 15,
          "institution_price": 425,
          "institution_price_as_of": "2025-12-16",
          "cost_basis": 6150,
          "currency": "USD",
          "security": {
            "ticker_symbol": "MSFT",
            "name": "Microsoft Corporation",
            "currency": "USD"
          }
        },
        {
          "quantity": 8,
          "institution_price": 252.50,
          "institution_price_as_of": "2025-12-16",
          "cost_basis": 2000,
          "currency": "USD",
          "security": {
            "ticker_symbol": "VTI",
            "name": "Vanguard Total Stock Market ETF",
            "currency": "USD"
          }
        }
      ],
      "investment_transactions": [
        {
          "date": "2025-11-25",
          "name": "Buy AAPL",
          "quantity": 10,
          "price": 190,
          "fees": 0,
          "type": "buy",
          "currency": "USD",
          "security": {
            "ticker_symbol": "AAPL",
            "name": "Apple Inc.",
            "currency": "USD"
          }
        },
        {
          "date": "2025-11-27",
          "name": "Buy MSFT",
          "quantity": 15,
          "price": 410,
          "fees": 0,
          "type": "buy",
          "currency": "USD",
          "security": {
            "ticker_symbol": "MSFT",
            "name": "Microsoft Corporation",
            "currency": "USD"
          }
        },
        {
          "date": "2025-12-01",
          "name": "Buy VTI",
          "quantity": 8,
          "price": 250,
          "fees": 0,
          "type": "buy",
          "currency": "USD",
          "security": {
            "ticker_symbol": "VTI",
            "name": "Vanguard Total Stock Market ETF",
            "currency": "USD"
          }
        }
      ]
    }
  ]
}
```

---

## Test User 2: Established Investor (Needs Opening Balance)

**Username:** `custom_pfmp_established`

**Scenario:** Long-standing brokerage account with positions acquired years ago. Plaid only shows recent 30 days of transactions (a dividend and a small buy), but current holdings are much larger. This tests the "opening balance required" case.

```json
{
  "version": 2,
  "override_accounts": [
    {
      "type": "investment",
      "subtype": "brokerage",
      "starting_balance": 5000,
      "currency": "USD",
      "holdings": [
        {
          "quantity": 100,
          "institution_price": 520.00,
          "institution_price_as_of": "2025-12-16",
          "cost_basis": 35000.00,
          "currency": "USD",
          "security": {
            "ticker_symbol": "VOO",
            "name": "Vanguard S&P 500 ETF",
            "currency": "USD"
          }
        },
        {
          "quantity": 150,
          "institution_price": 185.00,
          "institution_price_as_of": "2025-12-16",
          "cost_basis": 20000.00,
          "currency": "USD",
          "security": {
            "ticker_symbol": "VIG",
            "name": "Vanguard Dividend Appreciation ETF",
            "currency": "USD"
          }
        },
        {
          "quantity": 25,
          "institution_price": 82.00,
          "institution_price_as_of": "2025-12-16",
          "cost_basis": 1800.00,
          "currency": "USD",
          "security": {
            "ticker_symbol": "SCHD",
            "name": "Schwab US Dividend Equity ETF",
            "currency": "USD"
          }
        }
      ],
      "investment_transactions": [
        {
          "date": "2025-12-05",
          "name": "Dividend VOO",
          "quantity": 0,
          "price": 0,
          "fees": 0,
          "type": "cash",
          "currency": "USD",
          "security": {
            "ticker_symbol": "VOO",
            "name": "Vanguard S&P 500 ETF",
            "currency": "USD"
          }
        },
        {
          "date": "2025-12-10",
          "name": "Buy SCHD",
          "quantity": 5,
          "price": 80.00,
          "fees": 0,
          "type": "buy",
          "currency": "USD",
          "security": {
            "ticker_symbol": "SCHD",
            "name": "Schwab US Dividend Equity ETF",
            "currency": "USD"
          }
        }
      ]
    }
  ]
}
```

**Expected Result:** 
- VOO: 100 shares current, 0 from transactions → needs opening balance
- VIG: 150 shares current, 0 from transactions → needs opening balance  
- SCHD: 25 shares current, 5 from transactions → needs opening balance (20 missing)

---

## Test User 3: Mixed Holdings (Some Complete, Some Not)

**Username:** `custom_pfmp_mixed`

**Scenario:** Mix of new positions (fully tracked) and old positions (incomplete). Tests per-holding detection.

```json
{
  "version": 2,
  "override_accounts": [
    {
      "type": "investment",
      "subtype": "brokerage",
      "starting_balance": 3000,
      "currency": "USD",
      "holdings": [
        {
          "quantity": 20,
          "institution_price": 140.00,
          "institution_price_as_of": "2025-12-16",
          "cost_basis": 2600.00,
          "currency": "USD",
          "security": {
            "ticker_symbol": "NVDA",
            "name": "NVIDIA Corporation",
            "currency": "USD"
          }
        },
        {
          "quantity": 50,
          "institution_price": 175.00,
          "institution_price_as_of": "2025-12-16",
          "cost_basis": 5000.00,
          "currency": "USD",
          "security": {
            "ticker_symbol": "GOOGL",
            "name": "Alphabet Inc.",
            "currency": "USD"
          }
        },
        {
          "quantity": 30,
          "institution_price": 225.00,
          "institution_price_as_of": "2025-12-16",
          "cost_basis": 6500.00,
          "currency": "USD",
          "security": {
            "ticker_symbol": "AMZN",
            "name": "Amazon.com Inc.",
            "currency": "USD"
          }
        }
      ],
      "investment_transactions": [
        {
          "date": "2025-11-20",
          "name": "Buy NVDA",
          "quantity": 20,
          "price": 130.00,
          "fees": 0,
          "type": "buy",
          "currency": "USD",
          "security": {
            "ticker_symbol": "NVDA",
            "name": "NVIDIA Corporation",
            "currency": "USD"
          }
        },
        {
          "date": "2025-11-25",
          "name": "Buy AMZN",
          "quantity": 30,
          "price": 216.67,
          "fees": 0,
          "type": "buy",
          "currency": "USD",
          "security": {
            "ticker_symbol": "AMZN",
            "name": "Amazon.com Inc.",
            "currency": "USD"
          }
        }
      ]
    }
  ]
}
```

**Expected Result:**
- NVDA: 20 shares current, 20 from transactions → ✅ Complete (reconciles)
- GOOGL: 50 shares current, 0 from transactions → ❌ Needs opening balance
- AMZN: 30 shares current, 30 from transactions → ✅ Complete (reconciles)

---

## Test User 4: 401k with Employer Match

**Username:** `custom_pfmp_401k`

**Scenario:** Retirement account with target-date fund, employer contributions showing as separate transactions.

```json
{
  "version": 2,
  "override_accounts": [
    {
      "type": "investment",
      "subtype": "401k",
      "starting_balance": 0,
      "currency": "USD",
      "holdings": [
        {
          "quantity": 2500,
          "institution_price": 50.00,
          "institution_price_as_of": "2025-12-16",
          "cost_basis": 95000.00,
          "currency": "USD",
          "security": {
            "ticker_symbol": "VFFVX",
            "name": "Vanguard Target Retirement 2055 Fund",
            "currency": "USD"
          }
        }
      ],
      "investment_transactions": [
        {
          "date": "2025-11-15",
          "name": "Employee Contribution",
          "quantity": 20,
          "price": 50.00,
          "fees": 0,
          "type": "buy",
          "currency": "USD",
          "security": {
            "ticker_symbol": "VFFVX",
            "name": "Vanguard Target Retirement 2055 Fund",
            "currency": "USD"
          }
        },
        {
          "date": "2025-11-15",
          "name": "Employer Match",
          "quantity": 10,
          "price": 50.00,
          "fees": 0,
          "type": "buy",
          "currency": "USD",
          "security": {
            "ticker_symbol": "VFFVX",
            "name": "Vanguard Target Retirement 2055 Fund",
            "currency": "USD"
          }
        },
        {
          "date": "2025-12-01",
          "name": "Employee Contribution",
          "quantity": 20,
          "price": 50.00,
          "fees": 0,
          "type": "buy",
          "currency": "USD",
          "security": {
            "ticker_symbol": "VFFVX",
            "name": "Vanguard Target Retirement 2055 Fund",
            "currency": "USD"
          }
        },
        {
          "date": "2025-12-01",
          "name": "Employer Match",
          "quantity": 10,
          "price": 50.00,
          "fees": 0,
          "type": "buy",
          "currency": "USD",
          "security": {
            "ticker_symbol": "VFFVX",
            "name": "Vanguard Target Retirement 2055 Fund",
            "currency": "USD"
          }
        }
      ]
    }
  ]
}
```

**Expected Result:**
- VFFVX: 2500 shares current, 60 from transactions → ❌ Needs opening balance (2440 missing)

---

## Test User 5: Closed Positions

**Username:** `custom_pfmp_closed`

**Scenario:** Account with a position that was fully sold. Tests handling of closed positions.

```json
{
  "version": 2,
  "override_accounts": [
    {
      "type": "investment",
      "subtype": "brokerage",
      "starting_balance": 15000,
      "currency": "USD",
      "holdings": [
        {
          "quantity": 25,
          "institution_price": 200.00,
          "institution_price_as_of": "2025-12-16",
          "cost_basis": 4500.00,
          "currency": "USD",
          "security": {
            "ticker_symbol": "TSLA",
            "name": "Tesla Inc.",
            "currency": "USD"
          }
        }
      ],
      "investment_transactions": [
        {
          "date": "2025-11-15",
          "name": "Buy TSLA",
          "quantity": 25,
          "price": 180.00,
          "fees": 0,
          "type": "buy",
          "currency": "USD",
          "security": {
            "ticker_symbol": "TSLA",
            "name": "Tesla Inc.",
            "currency": "USD"
          }
        },
        {
          "date": "2025-11-20",
          "name": "Buy META",
          "quantity": 10,
          "price": 550.00,
          "fees": 0,
          "type": "buy",
          "currency": "USD",
          "security": {
            "ticker_symbol": "META",
            "name": "Meta Platforms Inc.",
            "currency": "USD"
          }
        },
        {
          "date": "2025-12-05",
          "name": "Sell META",
          "quantity": -10,
          "price": 600.00,
          "fees": 0,
          "type": "sell",
          "currency": "USD",
          "security": {
            "ticker_symbol": "META",
            "name": "Meta Platforms Inc.",
            "currency": "USD"
          }
        }
      ]
    }
  ]
}
```

**Expected Result:**
- TSLA: 25 shares current, 25 from transactions → ✅ Complete (reconciles)
- META: 0 shares current (closed), 10-10=0 from transactions → ✅ Complete (reconciles to 0)

---

## Schema Lessons Learned (for LLMs)

The Plaid custom user JSON schema has undocumented requirements that differ from their API response format. Key pitfalls:

| ❌ Wrong | ✅ Correct |
|----------|------------|
| `"version": "2"` (string) | `"version": 2` (integer) |
| `accounts: [...]` | `override_accounts: [...]` |
| `balance: { current: 1000, iso_currency_code: "USD" }` | `starting_balance: 1000, currency: "USD"` (flat) |
| Account-level `name`, `mask` fields | Omit these - not supported |
| Transaction without `currency` | Every transaction needs `"currency": "USD"` |

**Debugging approach:** Start with minimal JSON (1 account, 1 holding, 1 transaction) and add fields incrementally. The error messages are vague ("does not match expected schema").

**Working minimal template:**
```json
{
  "version": 2,
  "override_accounts": [{
    "type": "investment",
    "subtype": "brokerage",
    "starting_balance": 10000,
    "currency": "USD",
    "holdings": [{ "quantity": 10, "institution_price": 100, "cost_basis": 900, "currency": "USD",
      "security": { "ticker_symbol": "AAPL", "name": "Apple", "currency": "USD" }}],
    "investment_transactions": [{ "date": "2025-11-25", "name": "Buy", "quantity": 10, "price": 90, "fees": 0, "type": "buy", "currency": "USD",
      "security": { "ticker_symbol": "AAPL", "name": "Apple", "currency": "USD" }}]
  }]
}
```

---

## Summary Table

| Username | Scenario | Expected Behavior |
|----------|----------|-------------------|
| `custom_pfmp_new_investor` | All new buys | ✅ No banner, performance works |
| `custom_pfmp_established` | Old positions, recent activity | ❌ Banner shows, all 3 holdings need opening balance |
| `custom_pfmp_mixed` | Mix of new and old | ⚠️ Banner shows for GOOGL only |
| `custom_pfmp_401k` | Retirement with contributions | ❌ Banner shows, needs opening balance |
| `custom_pfmp_closed` | Has fully sold position | ✅ No banner, closed position handled |

---

## Liabilities Custom Users (Wave 12.5)

Plaid's default `user_good` includes liabilities (credit cards, mortgages, student loans). Use these custom users for specific liability testing scenarios.

### Test User 6: Credit Card with High Utilization

**Username:** `custom_pfmp_credit_high_util`

**Scenario:** Credit card approaching limit, overdue payment. Tests alert generation.

```json
{
  "version": 2,
  "override_accounts": [
    {
      "type": "credit",
      "subtype": "credit card",
      "starting_balance": 4500,
      "currency": "USD",
      "meta": {
        "limit": 5000,
        "apr_percentage": 24.99,
        "minimum_payment_amount": 150,
        "is_overdue": true,
        "next_payment_due_date": "2026-01-01"
      }
    }
  ]
}
```

**Expected Results:**
- 90% utilization → generates alert
- Overdue flag → urgent alert
- Shows in Liabilities panel

---

### Test User 7: Mortgage with Property Address

**Username:** `custom_pfmp_mortgage`

**Scenario:** Mortgage with full property data for property auto-creation.

```json
{
  "version": 2,
  "override_accounts": [
    {
      "type": "loan",
      "subtype": "mortgage",
      "starting_balance": 285000,
      "currency": "USD",
      "meta": {
        "origination_principal_amount": 300000,
        "interest_rate_percentage": 6.875,
        "next_monthly_payment": 2150,
        "next_payment_due_date": "2026-02-01",
        "loan_term": "30 year",
        "maturity_date": "2054-01-01",
        "ytd_interest_paid": 19500,
        "ytd_principal_paid": 4200,
        "property_address": {
          "street": "123 Oak Street",
          "city": "Springfield",
          "region": "VA",
          "postal_code": "22150",
          "country": "US"
        }
      }
    }
  ]
}
```

**Expected Results:**
- Creates PropertyProfile record with address
- Links to mortgage LiabilityAccount
- Property detail shows linked mortgage info

---

### Test User 8: Student Loan Portfolio

**Username:** `custom_pfmp_student_loans`

**Scenario:** Multiple student loans at different stages.

```json
{
  "version": 2,
  "override_accounts": [
    {
      "type": "loan",
      "subtype": "student",
      "starting_balance": 28000,
      "currency": "USD",
      "meta": {
        "loan_name": "Federal Direct - Subsidized",
        "interest_rate_percentage": 5.05,
        "minimum_payment_amount": 320,
        "next_payment_due_date": "2026-01-15",
        "origination_date": "2020-08-15",
        "origination_principal_amount": 35000,
        "loan_status": "repayment"
      }
    },
    {
      "type": "loan",
      "subtype": "student",
      "starting_balance": 12000,
      "currency": "USD",
      "meta": {
        "loan_name": "Federal Direct - Unsubsidized",
        "interest_rate_percentage": 6.55,
        "minimum_payment_amount": 180,
        "next_payment_due_date": "2026-01-15",
        "origination_date": "2021-01-10",
        "origination_principal_amount": 15000,
        "loan_status": "repayment"
      }
    }
  ]
}
```

**Expected Results:**
- Creates 2 LiabilityAccount records
- Both show in Liabilities panel
- Debt payoff dashboard includes both

---

### Test User 9: Multi-Product User (Unified Flow)

**Username:** `custom_pfmp_unified`

**Scenario:** User with bank accounts, investments, and liabilities for unified linking test.

```json
{
  "version": 2,
  "override_accounts": [
    {
      "type": "depository",
      "subtype": "checking",
      "starting_balance": 5500,
      "currency": "USD"
    },
    {
      "type": "depository",
      "subtype": "savings",
      "starting_balance": 15000,
      "currency": "USD"
    },
    {
      "type": "investment",
      "subtype": "brokerage",
      "starting_balance": 50000,
      "currency": "USD",
      "holdings": [
        {
          "quantity": 100,
          "institution_price": 250,
          "cost_basis": 22000,
          "currency": "USD",
          "security": { "ticker_symbol": "VTI", "name": "Vanguard Total Stock Market ETF", "currency": "USD" }
        }
      ]
    },
    {
      "type": "credit",
      "subtype": "credit card",
      "starting_balance": 2500,
      "currency": "USD",
      "meta": {
        "limit": 10000,
        "apr_percentage": 19.99,
        "minimum_payment_amount": 75,
        "next_payment_due_date": "2026-01-20"
      }
    },
    {
      "type": "loan",
      "subtype": "mortgage",
      "starting_balance": 320000,
      "currency": "USD",
      "meta": {
        "interest_rate_percentage": 6.5,
        "next_monthly_payment": 2400,
        "next_payment_due_date": "2026-02-01",
        "property_address": {
          "street": "456 Main Avenue",
          "city": "Fairfax",
          "region": "VA",
          "postal_code": "22030",
          "country": "US"
        }
      }
    }
  ]
}
```

**Expected Results:**
- 2 CashAccounts created (checking, savings)
- 1 investment Account with VTI holding
- 1 credit card LiabilityAccount
- 1 mortgage LiabilityAccount
- 1 PropertyProfile auto-created from mortgage

---

## Liabilities Summary Table

| Username | Scenario | Products | Expected Behavior |
|----------|----------|----------|-------------------|
| `custom_pfmp_credit_high_util` | High utilization CC | liabilities | Alert for 90% util + overdue |
| `custom_pfmp_mortgage` | Mortgage with address | liabilities | Property auto-created |
| `custom_pfmp_student_loans` | 2 student loans | liabilities | Both in debt payoff |
| `custom_pfmp_unified` | Full multi-product | all | Unified sync works across all types |

