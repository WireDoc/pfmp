# Onboarding Walkthrough Template — "Alex Morgan" (Phase F audit fixture)

**Purpose:** a complete, fictitious-but-realistic data set to enter while walking
all 16 onboarding sections with the fresh real account (user 21). Rich enough to
exercise every field; internally consistent (the numbers cross-check between
sections); intentionally NOT a copy of user 20 beyond the expected commonalities
(TSP + federal benefits).

**How to use it:**

1. Fill each section exactly as written, in wizard order. Every section
   autosaves — watch the autosave chip flip to saved before moving on.
2. After finishing a section, hit the browser refresh once and confirm the
   values come back. A field that doesn't survive refresh is exactly the kind
   of orphan Phase F exists to catch — report it with the section + field name.
3. All sections stay opted-IN except **Equity & Private Holdings** — opt out
   there (it's a placeholder section), which exercises the opt-out path without
   sacrificing data.
4. When done, tell Claude — the DB rows will be diffed against this document as
   the persistence audit.

---

## The persona

**Alex Morgan**, 44 — GS-13 Step 5 IT Specialist at the Department of Veterans
Affairs, San Antonio, Texas. Army Reserve veteran with a 20% VA disability
rating. Married to Jordan (part-time dental hygienist); two kids (8 and 11).
Owns a home, contributes 15% to TSP, targets retirement at 62 (2044).

---

## 1 · Household Profile

| Field | Enter |
| ----- | ----- |
| Preferred name | `Alex` |
| Marital status | `Married` |
| Dependents | `2` |
| Notes we'd share with your planner | `Spouse Jordan works part-time. Kids are 8 and 11. My mother may move in with us within a few years — factor possible eldercare costs into long-range planning.` |

## 2 · Risk & Goals

| Field | Enter |
| ----- | ----- |
| Risk tolerance | `4 · Growth` |
| Target retirement date | `2044-12-31` |
| Passive income goal (monthly) | `7500` |
| Liquidity buffer (months) | `6` |
| Emergency fund target ($) | `45000` |
| Desired checking account balance ($) | `8000` |

## 3 · TSP Snapshot

| Field | Enter |
| ----- | ----- |
| Contribution rate (%) | `15` |

Then use **Add fund** four times and fill the table (allocation percentages
total 100):

| Fund | Contribution (%) | Units |
| ---- | ---------------- | ----- |
| C Fund | `60` | `850.25` |
| S Fund | `20` | `310.5` |
| I Fund | `10` | `205.75` |
| G Fund | `10` | `402.113` |

*(No lifecycle funds — Alex self-directs. Employer match is computed by the backend.)*

## 4 · Cash Accounts

Three accounts (use **Add account** as needed):

| Field | Account 1 | Account 2 | Account 3 |
| ----- | --------- | --------- | --------- |
| Nickname | `Everyday Checking` | `Emergency Cushion` | `12-Month CD` |
| Institution | `USAA` | `Ally Bank` | `Navy Federal` |
| Account type | `Checking` | `High-Yield Savings` | `Certificate of Deposit (CD)` |
| Balance ($) | `6800` | `32000` | `15000` |
| Interest rate (APR %) | `0.01` | `3.85` | `4.35` |
| Rate last checked | `2026-07-01` | `2026-07-01` | `2026-05-15` |
| Emergency fund | off | **on** | off |
| Purpose/Notes | `Bill-pay hub` | `6-month emergency cushion — do not touch` | `Matures 2027-05; earmarked for roof` |

## 5 · Investments

Four accounts:

| Field | Account 1 | Account 2 | Account 3 | Account 4 |
| ----- | --------- | --------- | --------- | --------- |
| Account name | `Vanguard Taxable` | `Fidelity Roth IRA` | `Jordan's 403(b)` | `Coinbase` |
| Institution | `Vanguard` | `Fidelity` | `TIAA` | `Coinbase` |
| Account category | `Taxable brokerage` | `Roth IRA` | `401(k) / 403(b)` | `Crypto / digital assets` |
| Asset class focus | `Total-market index (VTI)` | `Target date 2045` | `Target date 2050` | `BTC/ETH only` |
| Current balance ($) | `86400` | `47250` | `28900` | `4300` |
| Cost basis ($) | `61000` | `32500` | `24100` | `5200` |
| Contribution rate (%) | `5` | `6` | `4` | `0` |
| Last contribution | `2026-06-30` | `2026-06-15` | `2026-06-30` | `2025-11-20` |
| Tax-advantaged | off | **on** | **on** | off |

*(Note the crypto account is intentionally underwater — basis above value.)*

## 6 · Real Estate

One property:

| Field | Enter |
| ----- | ----- |
| Property name | `Maple Grove House` |
| Property type | `Primary residence` |
| Occupancy | `Owner occupied` |
| Estimated value ($) | `415000` |
| Mortgage balance ($) | `268000` |
| Monthly mortgage payment ($) | `2310` |
| Monthly rental income ($) | leave blank |
| Monthly expenses ($) | `650` |
| HELOC attached | off |

## 7 · Liabilities & Credit

Three debts:

| Field | Debt 1 | Debt 2 | Debt 3 |
| ----- | ------ | ------ | ------ |
| Liability type | `Auto loan` | `Credit card / revolving` | `Student loan` |
| Lender / account name | `Navy Federal — 2022 Pilot` | `Chase Sapphire` | `Nelnet (Jordan)` |
| Current balance ($) | `18400` | `2850` | `12700` |
| Minimum payment ($) | `525` | `95` | `180` |
| Interest rate (APR %) | `6.1` | `24.99` | `4.5` |
| Payoff target | `2029-03-01` | `2026-12-31` | `2032-08-01` |
| Top payoff priority | off | **on** | off |

## 8 · Monthly Expenses

Eight rows (these cross-check: housing = mortgage $2,310 + utilities $650;
debt service = the three minimum payments $525 + $95 + $180 = $800):

| Category | Monthly amount ($) | Estimate? | Notes |
| -------- | ------------------ | --------- | ----- |
| Housing & utilities | `2960` | off | `Mortgage + utilities` |
| Transportation | `410` | **on** | `Gas, maintenance, tolls` |
| Groceries & dining | `1250` | **on** | |
| Childcare / education | `600` | off | `After-school program + activities` |
| Healthcare & insurance | `180` | **on** | `Out-of-pocket only; premiums are payroll-deducted` |
| Lifestyle & subscriptions | `475` | **on** | `Streaming, gym, date nights` |
| Debt service | `800` | off | `Auto + card + student minimums` |
| Savings contributions | `1200` | off | `529 + brokerage auto-invest` |

## 9 · Tax Posture

| Field | Enter |
| ----- | ----- |
| Filing status | `Married filing jointly` |
| State of residence | `Texas` |
| Federal withholding (%) | `16` |
| I work with a CPA or tax professional | off |
| Tax notes | `Got a ~$2,800 refund last year — want to tune W-4 closer to break-even.` |

## 10 · Insurance Coverage

Four policies:

| Field | Policy 1 | Policy 2 | Policy 3 | Policy 4 |
| ----- | -------- | -------- | -------- | -------- |
| Policy type | `Term life` | `Disability` | `Homeowners` | `Auto` |
| Carrier | `USAA` | `GEBA` | `USAA` | `USAA` |
| Policy name or number | `TL-2044871` | `LTD-88321` | `HO-556201` | `AU-901175` |
| Coverage amount ($) | `500000` | `60000` | `415000` | `300000` |
| Premium amount ($) | `43.50` | `28` | `2150` | `984` |
| Premium frequency | `Monthly` | `Monthly` | `Annual` | `Semi-annual` |
| Renewal date | `2039-06-01` | `2027-01-01` | `2027-03-15` | `2026-11-30` |
| Recommended coverage ($) | `600000` | leave blank | leave blank | leave blank |
| Coverage meets my needs | **off** | on | on | on |
| Notes | `20-yr term ends at 57 — revisit amount; consider bumping to $600k` | `Supplemental LTD, ~$2.5k/mo benefit` | `Coverage matches home value` | `100/300/100 liability` |

## 11 · Benefits & Programs

Three entries:

| Field | Entry 1 | Entry 2 | Entry 3 |
| ----- | ------- | ------- | ------- |
| Benefit type | `Employer retirement match` | `Tuition / education benefits` | `Wellness / perks` |
| Provider | `VA (TSP agency match)` | `VA` | `VA` |
| Employer contribution (%) | `5` | leave blank | leave blank |
| Monthly cost / premium ($) | `0` | `0` | `0` |
| Notes | `1% automatic + up to 4% match — fully captured at my 15% rate` | `Up to $4k/yr tuition assistance; considering a cloud cert program` | `$25/mo gym reimbursement` |

## 12 · Federal Benefits

Skip the LES upload (manual entry tests more fields).

**FERS Pension**

| Field | Enter |
| ----- | ----- |
| High-3 Average Salary | `118500` |
| Projected Annual Annuity | `39100` |
| Projected Monthly Pension | `3258` |
| Creditable Years | `14` |
| Creditable Months | `3` |
| FERS Supplement Eligible | **on** |
| Est. Monthly Supplement | `1100` |

*(Consistency: 1.1% × $118,500 × ~30 yrs at age 62 ≈ $39,100.)*

**FEGLI (Life Insurance)**

| Field | Enter |
| ----- | ----- |
| Basic FEGLI | **on** |
| Basic Coverage Amount | `127000` |
| Total Monthly Premium | `52.40` |
| Option A | **on** |
| Option B | **on**, multiple `3×` |
| Option C | **on**, multiple `2×` |

**FEHB (Health)**

| Field | Enter |
| ----- | ----- |
| Plan Name | `BCBS FEP Blue Basic (112)` |
| Coverage Level | `Self and Family` |
| Monthly Premium | `607` |
| Employer Pays | `1412` |

**FEDVIP / FLTCIP / FSA / HSA**

| Field | Enter |
| ----- | ----- |
| FEDVIP Dental | **on**, Monthly Premium `58.20` |
| FEDVIP Vision | **on**, Monthly Premium `23.40` |
| FLTCIP (Long-Term Care) | off |
| Flexible Spending Account (FSA) | **on**, Annual Election `2400` |
| Health Savings Account (HSA) | **off** *(Blue Basic isn't an HDHP — intentionally consistent)* |

## 13 · Long-Term Obligations

Four milestones (note: college "funds allocated" matches the 529 balance in
section 5):

| Field | Obligation 1 | Obligation 2 | Obligation 3 | Obligation 4 |
| ----- | ------------ | ------------ | ------------ | ------------ |
| Obligation name | `Kids' college — first tuition fall 2032` | `Replace the 2015 Highlander` | `Roof replacement` | `25th anniversary trip — Italy` |
| Category | `Education` | `Vehicle` | `Housing / relocation` | `Major travel / sabbatical` |
| Target date | `2032-08-15` | `2028-06-01` | `2027-09-01` | `2031-05-01` |
| Estimated cost ($) | `80000` | `38000` | `18000` | `12000` |
| Funds allocated ($) | `18600` | `6500` | `4000` | `1500` |
| Funding status | `Saving in progress` | `Saving in progress` | `Planning` | `Planning` |
| Critical milestone | **on** | off | **on** | off |
| Notes | `Two kids, staggered — second starts 2035` | `Aiming to pay half cash` | `CD maturing 2027-05 is earmarked for this` | leave blank |

## 14 · Income Streams

Three streams:

| Field | Stream 1 | Stream 2 | Stream 3 |
| ----- | -------- | -------- | -------- |
| Income source | `VA — GS-13 IT Specialist` | `VA disability (20%)` | `Jordan — dental hygienist (part-time)` |
| Income type | `Salary / wages` | `VA or disability benefits (nontaxable)` | `Salary / wages` |
| Monthly gross ($) | `10333` | `346.95` | `2600` |
| Annual gross ($) | `124000` | `4163` | `31200` |
| Monthly net ($) | `6890` | `346.95` | `2210` |
| Annual net ($) | `82680` | `4163` | `26520` |
| Start date | `2012-04-16` | `2008-11-01` | `2019-08-15` |
| End date | leave blank | leave blank | leave blank |
| Guaranteed income | **on** | **on** | off |

*(Nontaxable disability: net equals gross on purpose.)*

## 15 · Equity & Private Holdings

**Opt out here** — this exercises the opt-out path on a placeholder section:

| Field | Enter |
| ----- | ----- |
| I don't need this yet | **on** |
| Add context (optional) | `No RSUs or private equity today. Might dabble in angel investing someday.` |

## 16 · Review & Finalize

- Every section should show **completed** except Equity (**opted out**).
- If any section shows *needs info*, that's a finding — note which one before
  clicking anything.
- Click **Finalize** — you should land on the dashboard.

---

## After the walkthrough

Report back with anything that: refused to save, didn't survive a refresh,
displayed differently than entered (formatting/rounding), or blocked completion.
Then the DB gets diffed against this document section-by-section
(`/financial-profile/21/*` + `/federalbenefits/user/21`) as the Phase F
persistence audit.

Quick sanity numbers the dashboard should roughly show afterward:

- **Cash:** $53,800 · **Investments (non-TSP):** $166,850 · **Property equity:** $147,000
- **Liabilities (non-mortgage):** $33,950
- **Monthly expenses:** $7,875 · **Monthly net income (all streams):** ~$9,447

/*****NOTES TO CLAUDE FROM THE HUMAN ONE*****
Risks and Goals:
Risk tolerance goes 1-5 on onboarding, but 1-10 on the dashboard. 
Dashboard says "Welcome back Carl User" instead of "Welcome back Alex"
Cash accounts are entirely missing, showing 0 accounts and $0 balance. The accounts are somewhere though, I believe.
Spending is entirely off. 9,446.95 inflows and only 332.67 outflows. Only insurance premiums are showing.
Cash flow forecast is at 0
There's a net worth sparkline filled out with 30 days worth but that shouldn't exist because this is day one.

PROFILE TAB
TAX: Filing status is empty.
INCOME: VA disability's Type is empty. Should be "va disability"
EXPENSES: All categories are blank.
INSURANCE: All types and frequencies are blank.
OBLIGATIONS: Type is blank on Roof Replacement and 25th anniversary trip. The other two are correct. Funds Allocated field is missing.
BENEFITS: Employer contribution field and notes fields are missing.
FEDERAL BENEFITS: page is bouncing as if loading and hiding something. Stopped when mouseover of the "Calculating" button under retirement projector.