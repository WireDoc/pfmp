# Wave 13: Crypto Exchange Integration

_Created: 2026-04-23_
_Status: Phase 2 Complete (Kraken + Binance.US shipped)_

## Overview

Wave 13 adds first-class cryptocurrency exchange support to PFMP. Users will link **Kraken** and **Binance.US** read-only API keys; PFMP will sync holdings, transaction history, staking/earn rewards, and (where the exchange exposes it) realized P/L and tax-lot detail. Valuations and historical price snapshots come from the **CoinGecko** public API. Self-custody wallets and on-chain DeFi positions are explicitly **out of scope** for this wave.

This is the only data-aggregation gap remaining after Wave 12.5 (Plaid for banks, brokerages, and liabilities) and Wave 15 (properties).

**Prerequisite**: Wave 16 (OpenRouter AI Overhaul) — crypto context is added to `BuildFullFinancialContextAsync` in P4.

---

## Why Now?

1. **Last asset class missing from net worth.** Plaid covers banks/brokerages/liabilities and Wave 15 covers properties; crypto is the only major asset users have to enter manually today.
2. **Free, read-only APIs.** Both target exchanges expose holdings, transactions, and rewards via free read-only API keys — no per-call cost like Plaid Investments.
3. **Tax surface area.** Crypto users typically need cost basis and short/long-term gain visibility before April. Pulling this from the exchange (rather than asking the user) is a high-value differentiator.
4. **AI advisory completeness.** With crypto folded in, the dual-AI pipeline can reason over the user's full asset base instead of warning "crypto data is missing — analysis is incomplete."

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Exchanges (P1–P2)** | Kraken, then Binance.US | Both have stable v3/v3-style REST APIs, free read-only keys, US user coverage, and active sandbox/testnet support. Coinbase, Gemini, Crypto.com deferred. |
| **Wallets / DeFi** | Out of scope | Defer to a follow-up wave (provisional Wave 13.5). Adds chain-specific RPC, gas-price tracking, and DeFi protocol adapters that don't fit the current sprint. |
| **Sync scope** | Holdings + transactions + staking/earn rewards + realized P/L + tax-lot detail (when exchange returns it) | Anything less leaves the tax narrative incomplete. Tax-lot detail is fetched best-effort — Kraken provides it, Binance.US partially. |
| **Price source** | CoinGecko public API (no key) | Free, broad coin coverage, generous rate limit (10–30 req/min), historical OHLC, supports same daily-snapshot pattern as TSP/FMP. |
| **Data model** | New `CryptoHolding` + `CryptoTransaction` tables, sibling to `Holding` / `InvestmentTransaction` | Crypto cost-basis (lot-based, often fractional to 8+ decimals) and staking semantics don't map cleanly to the existing equity holdings tables. Keeping them separate avoids polluting `Holding` with crypto-only columns and lets us evolve crypto schema without risking equity logic. |
| **Credentials** | New `ExchangeConnection` table; API key + secret encrypted with the existing **Data Protection API** (same pattern as Plaid access tokens) | Already proven, no new infra. Azure Key Vault migration tracked as part of Phase 5 production hardening, not Wave 13. |
| **Permission model** | Read-only API keys only. PFMP refuses to save a key with trading/withdrawal scopes (validated at exchange link time). | Eliminates entire class of risk. Documented in onboarding UI. |
| **Sync frequency** | Daily Hangfire job per connection at 11:45 PM ET (after price refresh) + on-demand "Sync Now" button (rate-limited to 1/hour/connection) | Matches Plaid pattern. |
| **AI integration** | New "Crypto Holdings" section in `BuildFullFinancialContextAsync` (Wave 16); explicit "None" message when no exchange linked | Mirrors how cash, properties, and liabilities are injected today. |

---

## Data Model

### New: `ExchangeConnection`

| Field | Type | Notes |
|-------|------|-------|
| `ExchangeConnectionId` | int (PK) | |
| `UserId` | int (FK) | |
| `Provider` | string | `"Kraken"`, `"BinanceUs"` |
| `Nickname` | string? | User-friendly label, e.g. "Kraken main" |
| `EncryptedApiKey` | string | Data Protection API |
| `EncryptedApiSecret` | string | Data Protection API |
| `Scopes` | string | JSON list returned by exchange capability check (`["query_funds","query_ledger"]`) |
| `Status` | enum | `Active`, `Expired`, `RevokedByUser`, `Error` |
| `LastSyncAt` | DateTime? | |
| `LastSyncError` | string? | Truncated to 1000 chars |
| `DateCreated` / `DateUpdated` | DateTime | |

Unique index: `(UserId, Provider, Nickname)` — allows multiple keys per exchange (e.g., main + spouse).

### New: `CryptoHolding`

| Field | Type | Notes |
|-------|------|-------|
| `CryptoHoldingId` | int (PK) | |
| `ExchangeConnectionId` | int (FK) | |
| `Symbol` | string | `"BTC"`, `"ETH"`, `"USDC"` |
| `CoinGeckoId` | string? | `"bitcoin"`, `"ethereum"` — populated on first price lookup |
| `Quantity` | decimal(28, 18) | Crypto often needs >8 decimals |
| `AvgCostBasisUsd` | decimal(18, 4)? | If exchange or our own ledger can compute it |
| `MarketValueUsd` | decimal(18, 4) | Cached from last price refresh |
| `LastPriceAt` | DateTime | |
| `IsStaked` | bool | True if held in earn/stake/locked product |
| `StakingApyPercent` | decimal(8, 4)? | If exchange reports |
| `DateCreated` / `DateUpdated` | DateTime | |

Unique index: `(ExchangeConnectionId, Symbol, IsStaked)` — separates staked vs liquid balance of the same coin.

### New: `CryptoTransaction`

| Field | Type | Notes |
|-------|------|-------|
| `CryptoTransactionId` | int (PK) | |
| `ExchangeConnectionId` | int (FK) | |
| `ExchangeTxId` | string | Provider's id; uniqueness key |
| `TransactionType` | enum | `Buy`, `Sell`, `Deposit`, `Withdrawal`, `StakingReward`, `EarnInterest`, `Fee`, `Transfer`, `Other` |
| `Symbol` | string | |
| `Quantity` | decimal(28, 18) | Signed: positive for inflow |
| `PriceUsd` | decimal(18, 4)? | Per-unit USD at execution |
| `FeeUsd` | decimal(18, 4)? | |
| `ExecutedAt` | DateTime | UTC |
| `RawJson` | jsonb | Original payload for replay/debug |
| `DateCreated` | DateTime | |

Unique index: `(ExchangeConnectionId, ExchangeTxId)` — idempotent re-sync.

### `CryptoTaxLot` (optional, P3)

If exchange returns lot detail (Kraken does via `Ledgers` + `TradesHistory`), we persist explicit lots so realized P/L can be split into short-term vs long-term. Otherwise we fall back to FIFO from `CryptoTransaction` history.

---

## Phasing

### Phase 1 — Backend Foundation + Kraken (estimated largest chunk) ✅ Complete

**Shipped (this session):**
- ✅ EF migration `Wave13_AddCryptoExchangeTables` applied (ExchangeConnections, CryptoHoldings, CryptoTransactions)
- ✅ `IExchangeAdapter` + `KrakenExchangeAdapter` (HMAC-SHA512 signing, asset code normalization XXBT/XBT→BTC, ZUSD→USD, `.S`/`.M` staking detection, ledger → CryptoTransaction mapping)
- ✅ `ExchangeCredentialEncryptionService` (Data Protection API, `Purpose="ExchangeCredentials"`)
- ✅ `ExchangeConnectionService` — validate → reject trading-scope keys → encrypt → persist → initial sync
- ✅ `CryptoSyncService` — idempotent holdings upsert + tx insert, Buy/Sell sign correction, stale-holding cleanup
- ✅ `CoinGeckoPriceService` — 15-min spot cache + 24-hr coin list cache (free public API, no key)
- ✅ `CryptoController` — 6 endpoints, manual-sync rate limit (1/hr/connection, 429 + Retry-After)
- ✅ `CryptoSyncJob` — Hangfire recurring `45 23 * * *` Eastern, AutomaticRetry 2x
- ✅ Frontend: `cryptoApi` service, `CryptoSettingsView` (link/list/sync/delete), route `/dashboard/settings/crypto`, Settings nav entry
- ✅ Tests: 5 controller + 5 Kraken adapter (xUnit) + 3 frontend (Vitest); full backend sweep 183/183 green
- ✅ Postman v1.12.0 with Crypto folder (6 requests) + `cryptoConnectionId` variable

**Original scope (preserved for reference):**

**Backend**
- Migration: `ExchangeConnection`, `CryptoHolding`, `CryptoTransaction` (no `CryptoTaxLot` yet)
- `IExchangeAdapter` interface: `ValidateKeysAsync`, `GetHoldingsAsync`, `GetTransactionsAsync(since)`
- `KrakenExchangeAdapter` implementing the interface against Kraken REST `Balance`, `TradesHistory`, `Ledgers`, `OpenOrders`
- `ExchangeConnectionService` — encrypt/decrypt keys via Data Protection API, validate read-only scopes
- `CryptoSyncService` — orchestrates per-connection sync, upserts holdings, idempotent transaction insert
- `CoinGeckoPriceService` — `GetSpotPricesAsync(IEnumerable<string> symbols)`, daily-snapshot variant
- `CryptoController` endpoints:
  - `POST   /api/crypto/connections` (link)
  - `GET    /api/crypto/connections`
  - `DELETE /api/crypto/connections/{id}`
  - `POST   /api/crypto/connections/{id}/sync` (rate-limited)
  - `GET    /api/crypto/holdings`
  - `GET    /api/crypto/transactions?connectionId=&since=`
- Hangfire job: `CryptoSyncJob` (daily 11:45 PM ET) — runs `CryptoSyncService` for every active connection
- Tests: `KrakenExchangeAdapterTests` (mocked HTTP), `CryptoSyncServiceTests`, `CryptoControllerTests`

**Frontend**
- Settings page → "Crypto Exchanges" section under existing Connections
- Link dialog: provider dropdown (Kraken only in P1), nickname, API key, API secret, scope-validation feedback
- Holdings tab on Accounts Hub showing aggregated crypto positions
- "Sync Now" + last-sync timestamp + error banner on Expired/Error
- Tests: link dialog, holdings table, error states

**Postman**: Bump collection to v1.12.0; add "Crypto" folder.

**Acceptance**
- Linking a valid read-only Kraken key persists encrypted credentials, marks `Status=Active`, immediately runs an initial sync.
- Linking a key with trading scope is rejected with a clear error.
- Holdings table shows BTC/ETH/etc. with market value within ±0.1% of Kraken's portfolio value (allowing for price-source skew).
- Re-syncing the same time range does not duplicate `CryptoTransaction` rows.

### Phase 2 — Binance.US Adapter ✅ Complete

**Shipped (this session):**
- ✅ `BinanceUsExchangeAdapter` against `/sapi/v1/account/apiRestrictions` (key permission inspection), `/api/v3/account` (balances), `/sapi/v1/capital/deposit/hisrec`, `/sapi/v1/capital/withdraw/history`, `/api/v3/myTrades` (per-asset USD pair enumeration). HMAC-SHA256 query-string signing with `X-MBX-APIKEY` header.
- ✅ ValidateKeys rejects keys with spot trading, margin, futures, withdrawal, or internal-transfer scopes.
- ✅ Asset normalization folds USD/USDT/USDC/BUSD → "USD".
- ✅ `Provider="BinanceUS"` registered alongside Kraken via `IEnumerable<IExchangeAdapter>`.
- ✅ Frontend provider dropdown enables "Binance.US".
- ✅ 5 new adapter tests; backend full sweep 188/188 green.
- ✅ Postman v1.12.1 with Binance.US Create Connection example.

### Phase 2.5 — UI Surfacing + Stablecoin Pricing Polish ✅ Complete

- ✅ `CoinGeckoPriceService` short-circuits USD-pegged stablecoins (`USD`, `USDT`, `USDC`, `BUSD`, `DAI`, `TUSD`, `USDP`, `GUSD`, `PYUSD`) to a fixed $1.00 price; never resolves them through CoinGecko. Fixes user 20's `USD qty 650` row that was being marked-to-market at $0.01. `MarketValueUsd` recomputes on the next sync — no DB backfill required.
- ✅ Shared `CryptoAccountsCard` (`pfmp-frontend/src/components/crypto/CryptoAccountsCard.tsx`) renders on the All Accounts page as **Cryptocurrency Accounts**, with the same expand/collapse arrow used by every other account section.
- ✅ Dashboard now has its own **Cryptocurrency** card (`pfmp-frontend/src/views/dashboard/CryptoSummaryCard.tsx`) modeled on `TspPanel` — total balance, last-updated date, sync status indicator, and **View Details** button. Positioned in the right column directly above the TSP card.
- ✅ Crypto prices refresh on the same dashboard triggers as Investment Accounts (mount; not the daily TSP scheduler). Each linked exchange's `syncExchangeConnection` is fired once per dashboard load; the SummaryCard re-fetches when sync completes.
- ✅ MSW default handlers extended for `/crypto/holdings`, `/crypto/connections`, `/crypto/transactions`, and the sync POST so existing view tests no longer surface unhandled-request noise.
- ✅ Vitests: `CryptoAccountsCard` (3) covers CTA, holdings/no-Manage-button, and collapse; `CryptoSummaryCard` (3) covers CTA, synced/View-Details, and pending-sync. Backend sweep remains 188/188.



**Original scope (preserved for reference):**

- `BinanceUsExchangeAdapter` against `/api/v3/account`, `/api/v3/myTrades`, `/sapi/v1/asset/transfer`, `/sapi/v1/staking/...`
- Provider dropdown enables "Binance.US"
- Tests mirror P1
- Acceptance: same as P1, applied to Binance.US fixtures

### Phase 3 — Staking, Rewards, Cost Basis, Tax Lots

- Add `StakingReward` / `EarnInterest` transaction types to ingestion logic for both adapters
- Add `IsStaked` discrimination in `CryptoHolding` aggregation
- Add `CryptoTaxLot` table + FIFO fallback computation for exchanges that don't return lot detail
- Frontend: staking summary card (total staked value, weighted APY, YTD rewards), realized P/L panel with short/long-term split
- Tests: staking ingestion, FIFO lot computation, realized P/L math

### Phase 4 — AI Context + Alerts

- Extend `BuildFullFinancialContextAsync` (Wave 16) with a "Crypto Holdings" section: per-exchange totals, top positions by USD value, staked vs liquid breakdown, unrealized P/L, YTD staking rewards
- "None" message when no exchange linked (explicit, per Wave 16 convention)
- Alert generation:
  - Connection expired / API key revoked
  - Single asset > 25% of net worth (concentration warning)
  - Stablecoin de-peg detected (price deviation > 2% sustained)
- Postman v1.13.0 with full crypto folder + AI analyze examples
- Update `docs/history/roadmap.md` to mark Wave 13 complete

---

## Out of Scope

- Self-custody wallets, on-chain balances, DeFi protocols (deferred to provisional Wave 13.5)
- NFT valuation
- Trading or withdrawal actions — PFMP remains read-only
- Coinbase / Gemini / Crypto.com adapters (can be added incrementally after P2 if there's demand; the `IExchangeAdapter` abstraction is built to make this cheap)
- Tax form export (Form 8949 generation) — possible Wave 14.5 follow-on once spending analysis is in place
- Real-time price streaming (websocket); polling daily + on-demand is sufficient for a planning tool

---

## Risks & Open Questions

| Risk | Mitigation |
|------|-----------|
| **Binance.US regulatory uncertainty** — service has had US availability issues. | Adapter is feature-flagged; if API access becomes unreliable we ship P1 (Kraken) and revisit P2. |
| **CoinGecko rate limits on free tier** (~10–30 req/min). | Batch symbol lookups; cache prices for 15 min in-memory; only daily-snapshot writes go through full price-history endpoint. |
| **Cost basis ambiguity** when user has prior history outside PFMP. | Display a "Cost basis incomplete — synced from {date}" badge; never claim authoritative tax numbers. |
| **Decimal precision** — many existing PFMP money columns are `decimal(18, 2)` or `decimal(18, 4)`. Crypto needs `decimal(28, 18)` for quantity. | Quantity columns use the wider precision; USD value columns stay at `decimal(18, 4)`. EF Core mapping verified at migration time. |
| **API key leak via logs.** | Never log decrypted secrets; controller filters strip `apiKey`/`apiSecret` from request logging; integration tests assert log output does not contain secret material. |

Open questions to revisit before P3:
- Do we want a dedicated "Crypto" section in the dashboard sidebar, or fold crypto into the existing Accounts Hub? (Tentative: fold in.)
- Should staked balances count toward the user's `liquidityBufferMonths` calculation? (Tentative: no — staked is treated as illiquid.)

---

## Acceptance for Wave 13 Closeout

- [ ] All four phases shipped, with their per-phase acceptance criteria met
- [ ] Backend test count growth ≥ 25 tests across adapters, services, controllers
- [ ] Frontend test count growth ≥ 15 tests across link flow, holdings, settings
- [ ] Postman collection bumped (P1: v1.12.0 → P4: v1.13.0) with examples for all crypto endpoints
- [ ] `BuildFullFinancialContextAsync` includes Crypto Holdings section verified by snapshot test
- [ ] `docs/history/roadmap.md` and `docs/documentation-map.md` updated, `README.md` highlights refreshed
- [ ] `VERSION` bumped to `v0.23.0-alpha` on Wave 13 completion (Wave 13 work itself starts at `v0.22.0-alpha`)
