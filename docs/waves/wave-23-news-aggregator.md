# Wave 23 — News Aggregator (Market Context Feed)

**Status:** ✅ Complete — shipped 2026-06-21 in commit `9c5a73b`
**Owner:** Solo project; user is sole customer
**Predecessors:** Wave 22 (`News` slot wired in DI, defaulting to `~google/gemini-flash-latest`)
**Reference implementation:** [WireDoc/OmniTrader](https://github.com/WireDoc/OmniTrader) — `bot/src/news.py`, `bot/src/rss_client.py`
**Successors potentially unblocked:** Market-Context-Aware AI advice (richer prompt context); maybe a daily digest email/notification (much later)

---

## Why this wave exists

PFMP's AI prompt currently has a `=== MARKET CONTEXT ===` section that's populated by `IAIMemoryService.BuildMarketContextSummaryAsync(30)` — which today pulls from the `MarketContexts` EF table. That table is sparsely populated and was originally designed for hand-curated macro snapshots. It's been functionally inert.

A real news feed serves two distinct consumers:

1. **The AI advice generator** — needs current macro / industry / event context so its recommendations reflect "what's happening right now," not a snapshot of state from when the user last updated their profile. A Fed rate decision yesterday should inform today's TSP / brokerage advice.
2. **The user** — wants a quick "what should I be paying attention to as someone with a federal job, brokerage holdings, mortgage in Arkansas, and a DCA strategy" digest, *without* having to read 15 news sites.

OmniTrader proved the architectural pattern (RSS poll → keyword filter → Gemini Flash synthesis → cached digest) works at near-zero LLM cost. This wave adapts that pattern with PFMP-appropriate breadth (not just crypto) and a DCA-appropriate cadence (not every 5 minutes).

---

## What we're lifting from OmniTrader

### Architecture pattern (verbatim port)

- **Background polling job** (Hangfire recurring) — runs on cron, no on-demand hot path.
- **RSS fetch + parse** — `HttpClient` + `XDocument` parsing of standard RSS 2.0 / Atom feeds.
- **URL deduplication** — `HashSet<string>` of seen URLs; persist to DB so it survives restart.
- **Keyword-driven routing** — articles match → tagged with relevant categories.
- **LLM synthesis ONLY when new articles arrive** — no synthesis = no LLM call = no cost. Critical.
- **Structured JSON output** — model returns `{sentiment, confidence, key_narratives, …}`. Strict response format.
- **Cached "current digest"** — readers (AI prompt builder, dashboard widget) read the cached digest instantly.

### Reference code (for our porting reference, not user action items)

- [`bot/src/rss_client.py`](https://github.com/WireDoc/OmniTrader/blob/main/bot/src/rss_client.py) — RSS fetch + parse (~90 LOC Python; ~80 LOC C# port)
- [`bot/src/news.py`](https://github.com/WireDoc/OmniTrader/blob/main/bot/src/news.py) — Synthesizer FSM (~200 LOC; restructure for PFMP scope)
- [`bot/config/llm.yaml`](https://github.com/WireDoc/OmniTrader/blob/main/bot/config/llm.yaml) — Gemini Flash model + temperature for sentiment (already mirrored in our `appsettings.AI.OpenRouter.NewsModel`)

---

## What's PFMP-specific (the harder part)

### Scope: not just crypto

OmniTrader filters by 11 trading pairs. PFMP needs to handle:

| Category | What we surface | Why |
|---|---|---|
| **Macro / Fed** | Rate decisions, CPI/PCE, jobs, GDP, yield curve | Drives TSP G-fund vs equity allocation logic; informs bond/cash advice |
| **Federal employee** | Government shutdown, OPM/TSP/FEHB/Pension changes, FERS rule updates, federal pay decisions | User is federal; affects pay, benefits, retirement projections directly |
| **Geopolitical** | Elections, major policy shifts, trade/tariff news, conflict events | Affects market-wide sentiment, sector exposures |
| **Industry / holdings** | Earnings, M&A, bankruptcies on user's specific tickers (VTI, AVUV, etc.) | Direct relevance to their portfolio |
| **Tax / regulatory** | Federal budget actions, tax law changes, SECURE Act updates, state tax changes (AR) | Drives Roth conversion timing, RMD planning |
| **Natural disasters & severe weather** | Severe weather in user's state (AR), property-impacting events | Insurance, real estate, emergency-fund implications |
| **Crypto** (lite) | BTC narratives only, no per-altcoin chasing | User holds USD-stable crypto reserves for an external bot; broad BTC context is enough |

### Personalization layer

Each user's relevant news depends on their profile. Initial implementation can hard-wire user 20's context (federal, Arkansas, federal pay, specific holdings), then later make it dynamic from the financial profile.

### DCA-appropriate cadence

- OmniTrader polls every 5 minutes because they're hunting intraday signals.
- PFMP DCA cares about multi-day developments. **2× day** (morning before market open, evening after market close) is the sweet spot — captures all material news without burning cycles.

### Integration with existing AI prompt

The news digest replaces (or augments) the current `MARKET CONTEXT` section in [AIIntelligenceService.BuildCacheableContextAsync](../../PFMP-API/Services/AI/AIIntelligenceService.cs#L1984). New structure:

```
=== MARKET CONTEXT (digest as of YYYY-MM-DD HH:mm ET) ===

[Macro/Fed]
  • Fed held rates steady at 5.25-5.50% — no hike in sight per dot plot
  • CPI cooled to 2.4% YoY — Fed has runway to cut Q2 next year
  ...

[Federal employee context]
  • TSP G fund yield 4.51% (down 0.2% MoM)
  • Open Season runs Nov 10 – Dec 9; FEHB premiums avg +3.2% YoY
  ...

[Holdings]
  • VTI: nothing material this period
  • AVUV: small-cap rotation continues; Russell 2000 +3.2% week
  ...

[Severe weather / disasters (Arkansas)]
  • None this period
  ...

Sentiment summary: Cautiously bullish equity, neutral bonds, watch oil prices.
```

---

## Source mix (this is where API key decisions live)

### Phase 1 — Free RSS only (recommended starting point)

| Source | URL pattern | What it gives us | Key needed? |
|---|---|---|---|
| Reuters Business RSS | `feeds.reuters.com/reuters/businessNews` | Macro, geopolitical | No |
| AP Business RSS | `apnews.com/hub/business?utm_source=apnewsrss&utm_medium=rss` | Macro, US | No |
| Federal Reserve press releases | `federalreserve.gov/feeds/press_all.xml` | Rate decisions, FOMC statements | No |
| Treasury news | `home.treasury.gov/news/press-releases/rss.xml` | Fiscal policy, debt | No |
| SEC press releases | `sec.gov/news/pressreleases.rss` | Regulatory, enforcement | No |
| TSP news | `tsp.gov/rss/` (if available — needs verification) | TSP fund changes, rule updates | No |
| OPM news | `opm.gov/news/rss/` (verify availability) | Federal employment, benefits | No |
| NPR Business | `feeds.npr.org/1006/rss.xml` | Broad business coverage | No |
| Bloomberg headlines (free RSS) | `bloomberg.com/feeds/...` | Markets | No |
| Yahoo Finance per-ticker RSS | `feeds.finance.yahoo.com/rss/2.0/headline?s=VTI` | Holding-specific | No |
| NWS severe weather | `alerts.weather.gov/cap/ar.php?x=0` (per-state CAP feed) | Arkansas weather alerts | No |

**Phase 1 cost**: $0/month for sources. Gemini Flash synthesis at 2 runs/day × ~1500 tokens/run ≈ **$0.02–0.05/month** total.

### Phase 2 — Optional API additions (if Phase 1 quality is insufficient)

| API | Free tier | Paid tier | What it adds | Recommend? |
|---|---|---|---|---|
| **Alpha Vantage News & Sentiment** | 500 req/day | $50/mo for 1200/min | Pre-tagged sentiment + relevance scoring per article; ticker-keyed | ⭐ Best free upgrade — propose adding |
| **Finnhub** | 60 req/min | $50/mo | Company news with sentiment | Reasonable alternative to Alpha Vantage |
| **NewsData.io** | 200 req/day | $150/mo+ | Broader source pool, country filtering | Skip — too narrow free tier |
| **NewsAPI.org** | 100 req/day delayed | $449/mo | Headline aggregation across many sources | Skip — paid tier too expensive |
| **Marketaux** | 100 req/day | $20-150/mo | Stock news + sentiment | Worth considering if Alpha Vantage falls short |

**Recommendation**: Start Phase 1 with RSS only. After 1-2 weeks of running, evaluate digest quality. If holdings-specific coverage feels thin (e.g., Yahoo Finance RSS too noisy), add **Alpha Vantage** free tier as Phase 2 (still $0).

### Sources I am explicitly NOT proposing

- **Twitter / X API**: paid, signal-to-noise terrible for our cadence, doesn't fit DCA
- **Reddit**: same issues
- **CNBC / WSJ / FT premium feeds**: paywall, expensive, RSS-blocked
- **Generative news (GPT-generated summaries from a paid provider)**: we're already generating our own via Gemini Flash; this would be duplicative

---

## Decisions resolved 2026-06-21

| # | Decision | Resolved choice |
|---|---|---|
| 1 | Polling cadence | **A — 1× per day at 5 AM ET** (aligned with snapshot job) |
| 2 | Source set for Phase 1 launch | **C — broadest set: Reuters + AP + Fed + Treasury + SEC + Yahoo-per-holding + NWS-AR + TSP + OPM + Bloomberg** |
| 3 | Alpha Vantage API on day 1 | **A — defer to Phase 2 after evaluating Phase 1 quality** |
| 4 | Day-1 integration scope | **C — backend + dashboard widget + per-category drill-down + linked-article list** |
| 5 | Personalization in v1 | **A — personalized from day 1 (holdings + state + employment + life stage)** |

Net effect: maximum breadth on sources + maximum UI depth, but minimum cadence (once-daily) and zero paid APIs. Coherent set — casts a wide net with the cheapest possible ingestion footprint, then gives the user real surface area to act on what comes back.

---

## Open decisions (resolved — kept for posterity)

### 1. Polling cadence

How often does the digest refresh?

| Option | Tick rate | Tradeoff |
|---|---|---|
| A | 1× per day at 5 AM ET | Aligned with the existing snapshot job; one daily digest |
| B | **2× per day (7 AM ET, 5 PM ET)** ⭐ recommended | Pre-market briefing + post-market wrap; covers business hours |
| C | 4× per day (every 6 hours) | More responsive; still cheap |
| D | Hourly | Overkill for DCA; ~10× the LLM cost |

**Default if no input:** B.

### 2. Source set for Phase 1 launch

Pick which RSS feeds to wire on day 1.

| Option | Set | Reasoning |
|---|---|---|
| A | Just Reuters + AP + Fed | Minimal, broad-strokes only |
| B | **Reuters + AP + Fed + Treasury + SEC + Yahoo per-holding + NWS-AR** ⭐ | Solid coverage; ~50–80 articles/run pre-filter |
| C | B + TSP/OPM (if their RSS works) + Bloomberg | Maximum breadth |

**Default if no input:** B, then auto-add TSP/OPM if their feeds resolve.

### 3. Alpha Vantage News API on day 1?

Sign up for a free Alpha Vantage key now, or wait and add later if Phase 1 feels thin?

| Option | When | Sign-up cost |
|---|---|---|
| A | **Add later (after 1–2 weeks of Phase 1)** ⭐ | Decide based on actual quality, not theory |
| B | Add now alongside RSS launch | Free, but adds complexity; key needs to live in `appsettings.Development.local.json` |

**Default if no input:** A.

### 4. Integration scope on day 1

What does "shipped" look like?

| Option | Includes | Estimated effort |
|---|---|---|
| A | Backend only: news ingestion + digest cached in DB + injected into AI `MARKET CONTEXT` block. No frontend. | ~1 day |
| B | **Backend + minimal dashboard widget** (digest summary + last-refreshed time) ⭐ | ~1.5 days |
| C | Backend + dashboard widget + per-category drill-down view + linked-article list | ~3 days |

**Default if no input:** B. Lean widget for visibility, drill-down can wait until you actually want to read source articles.

### 5. Personalization in v1

Does the digest tailor to the specific user, or is it generic?

| Option | Personalization |
|---|---|
| A | **Personalized from day 1: holdings + state + employment status + life stage drive routing** ⭐ | Slightly more work; much more useful |
| B | Generic feed v1; personalization in v2 | Faster ship; less utility |

**Default if no input:** A. The whole point is "news worth your time," and "your time" depends on who you are.

---

## Proposed architecture (assuming defaults above)

```
                       Hangfire cron (07:00 + 17:00 ET)
                                   │
                                   ▼
                       NewsIngestionJob.RunAsync()
                                   │
                ┌──────────────────┴──────────────────┐
                ▼                                     ▼
        RssNewsClient                        AlphaVantageClient (Phase 2)
        ────────────                         ──────────────────────────
        Fetch all feeds                      Fetch per-holding ticker news
        Parse XML                            (already sentiment-tagged)
        Return NewsArticle[]                 Return NewsArticle[]
                │                                     │
                └──────────────────┬──────────────────┘
                                   ▼
                       Deduplicate vs. NewsArticles DB table
                       (track seen URLs across runs)
                                   │
                                   ▼
                       Categorize: macro / federal / holdings / weather / regulatory
                       (regex matching + holdings-aware routing)
                                   │
                                   ▼
                       For each user with new articles in their relevant categories:
                                   │
                                   ▼
                       Build context-aware prompt:
                       "User profile: federal, Arkansas, holdings [VTI, AVUV...]
                        New articles this period: ...
                        Produce a structured digest..."
                                   │
                                   ▼
                       IAIFinancialAdvisor (role=News) → Gemini Flash
                                   │
                                   ▼
                       Parse JSON → NewsDigest entity (one per user per period)
                       Save to NewsDigests table
                                   │
                                   ▼
                       Invalidate cached digest in AIIntelligenceService

Consumers (read cached digest, never block on LLM):
  • AIIntelligenceService.BuildMarketContextSummaryAsync — replaces stale block
  • GET /api/news/digest?userId=20 — dashboard widget endpoint
```

### New EF tables

```csharp
[Table("NewsArticles")]
public class NewsArticle
{
    public int NewsArticleId { get; set; }
    [MaxLength(200)] public string Source { get; set; } = string.Empty;
    [MaxLength(500)] public string Title { get; set; } = string.Empty;
    [MaxLength(1000)] public string Url { get; set; } = string.Empty; // unique index
    public string? Summary { get; set; }
    public DateTime PublishedAt { get; set; }
    public DateTime FetchedAt { get; set; }
    [MaxLength(80)] public string? Category { get; set; }  // macro|federal|holdings|weather|regulatory|crypto
    public string? Tags { get; set; } // CSV: matched keywords / ticker symbols
}

[Table("NewsDigests")]
public class NewsDigest
{
    public int NewsDigestId { get; set; }
    public int UserId { get; set; }
    public DateTime GeneratedAt { get; set; }
    public string? RawJson { get; set; }  // full structured response from Gemini
    public string? MacroSummary { get; set; }
    public string? FederalSummary { get; set; }
    public string? HoldingsSummary { get; set; }
    public string? WeatherSummary { get; set; }
    public string? RegulatorySummary { get; set; }
    public string? OverallSentiment { get; set; } // "cautiously_bullish", "neutral", etc.
    public int ArticleCount { get; set; }
    [Column(TypeName = "decimal(10,4)")] public decimal LlmCostUsd { get; set; }
}
```

### File structure

```
PFMP-API/
├── Jobs/
│   └── NewsIngestionJob.cs                  (~200 LOC; Hangfire 2x/day cron)
├── Services/
│   └── News/
│       ├── INewsIngestionService.cs
│       ├── NewsIngestionService.cs          (~150 LOC; orchestrates fetch→dedup→categorize→synthesize)
│       ├── RssNewsClient.cs                 (~100 LOC; HTTP + XML parsing)
│       ├── NewsCategorizer.cs               (~80 LOC; regex routing + holdings-aware)
│       ├── NewsPromptBuilder.cs             (~80 LOC; per-user context-aware prompt)
│       └── NewsDigestService.cs             (~60 LOC; cached read API)
├── Controllers/
│   └── NewsController.cs                    (~60 LOC; GET /api/news/digest)
├── Models/News/
│   ├── NewsArticle.cs
│   └── NewsDigest.cs
└── Migrations/
    └── Wave23_NewsTables.cs

pfmp-frontend/
└── src/components/dashboard/
    └── NewsDigestWidget.tsx                 (~150 LOC; compact summary + refresh time)
```

### Cost projection

| Item | Frequency | Tokens | Cost |
|---|---|---|---|
| Gemini Flash synthesis | 2/day × 30 = 60/mo | ~2k in + 1k out | $0.06/mo (Phase 1) |
| Alpha Vantage API | Free tier | n/a | $0/mo (Phase 2) |
| RSS feeds | Continuous | n/a | $0/mo |

**Total estimated cost: <$0.10/month.** Well under user's cost ceiling.

---

## Acceptance criteria for wave closeout

- [x] Wave 23 plan reviewed and decisions resolved (this doc)
- [x] EF migrations applied — `Wave23_NewsTables` (initial schema) + `Wave23_NarrativeSummary` (narrative briefing column added day-of based on user feedback)
- [x] `NewsIngestionJob` registered on Hangfire — schedule shipped as **05:30 ET once daily** (not 07:00 + 17:00 as originally drafted) per the user's decision to run 1× per day. `MisfireHandlingMode.Ignorable` applied
- [x] At least 7 sources wired and tested — final shipping set is **MarketWatch, BBC-Business, Bloomberg, NPR-Business, FederalReserve, SEC, plus per-held-ticker Yahoo feeds and per-user-state NWS Atom feed**. Reuters, AP, Treasury, TSP, and OPM were all verified dead/blocked and removed; see "RSS source verification (2026-06-21)" below
- [x] Personalization layer reads user holdings + state + employment from `Users` + `Accounts` + `Holdings` tables (`NewsIngestionService.BuildUserProfileAsync`)
- [x] `AIIntelligenceService.BuildCacheableContextAsync` reads from latest `NewsDigest` for the user (replaces the legacy `MarketContexts` summary; falls back to legacy if no digest exists yet)
- [x] Dashboard widget `NewsDigestWidget.tsx` renders the digest with refresh button + last-refreshed time
- [x] Drill-down view `NewsDigestDetailView.tsx` at `/dashboard/news` with per-category narratives + source-article list + category filter tabs
- [x] LLM cost per run recorded in `NewsDigests.LlmCostUsd` (live runs measured at $0.009–$0.018 — well within budget)
- [n/a] Integration test scenarios — deferred. The system was shake-tested live (3 successful runs through the full pipeline with real Gemini Flash calls) before commit; formal pytest-style cases would duplicate that coverage for low marginal value at this scale
- [ ] VERSION bump deferred — running list of VERSION bumps tracked in [wave-22 closeout](./wave-22-ai-architecture-overhaul.md) needs a bigger consolidation pass (also covers Wave 14, 22, 23)

---

## Closeout summary (2026-06-21)

### What shipped (in commit `9c5a73b`)

**Backend** (`PFMP-API/Services/News`, `Models/News`, `Controllers`, `Jobs`):
- `NewsArticle` + `NewsDigest` EF entities. URL-unique dedup index on articles, per-user latest-digest index on digests.
- `RssNewsClient` — async fetch + RSS 2.0 / Atom parsing, per-feed try/catch so one dead source can't break the run.
- `NewsFeedRegistry` — global feed list + per-state NWS Atom feeds + per-ticker Yahoo feeds (only fetched for tickers actually held by some user).
- `NewsCategorizer` — regex-driven category routing (federal / weather / regulatory / macro / crypto / geopolitical) with holdings-aware ticker tagging.
- `NewsPromptBuilder` — per-user context-aware prompt asking Gemini Flash for a strict JSON schema with **headline, narrative_summary (morning briefing), overall_sentiment, confidence, and per-category short summaries**.
- `NewsIngestionService` — orchestrates the full run: feed-set assembly → fetch → dedup → categorize → persist articles → per-user filtering → synthesis → persist digests.
- `NewsDigestService` — hot-path cached reads for the AI prompt + dashboard endpoints. Renders the digest as plaintext leading with the narrative briefing.
- `NewsIngestionJob` — Hangfire wrapper, 05:30 ET daily.
- `NewsController` — `GET /api/news/digest`, `GET /api/news/articles`, `POST /api/news/trigger`.
- `AIIntelligenceService.BuildCacheableContextAsync` — MARKET CONTEXT block now reads the latest digest, falls back to legacy `MarketContexts` only when no digest exists.

**Frontend** (`pfmp-frontend/src`):
- `newsApi.ts` — typed client with 404-as-empty-state handling.
- `NewsDigestWidget` — compact dashboard tile (headline + sentiment chip + narrative briefing + top categories + refresh).
- `NewsDigestDetailView` — `/dashboard/news` drill-down with narrative section, per-category narratives, article list with category filter tabs.

**Infrastructure**:
- `"news"` added to the Hangfire worker queue list (initial omission caught + fixed during shakedown).
- `News` HttpClient registered for the RSS client.

### Day-of additions (driven by live user feedback)

- **Narrative summary field** — added as the user wanted a "morning radio briefing" style 2-3 paragraph synthesis, not just isolated category bullets. Wired through the model, migration, prompt, parser, DTO, AI prompt-text builder, widget, and detail view. Live cost delta: ~$0.0015 / run.
- **Frontend `/api/api/` double-prefix bug fix** — `apiClient` already prefixes `/api`; my initial `newsApi.ts` calls re-added it. Fixed by switching all three calls from `/api/news/…` → `/news/…`.

### RSS source verification (2026-06-21)

Five of the seven sources I originally drafted turned out to be dead or blocked in 2026:

| Source | Outcome | Decision |
|---|---|---|
| `feeds.reuters.com/reuters/businessNews` | DNS dead (Reuters discontinued public RSS pre-2024) | Replaced with **MarketWatch** (`feeds.content.dowjones.io/public/rss/mw_topstories`) |
| `apnews.com/...?utm_source=apnewsrss` | All AP RSS endpoints dead; AP pulled public feeds | Replaced with **BBC Business** (`feeds.bbci.co.uk/news/business/rss.xml`) |
| `home.treasury.gov/news/press-releases/rss.xml` | Flaky / no stable RSS path; their site is reachable but doesn't expose RSS | Dropped — Federal Reserve press releases still cover monetary policy |
| `www.tsp.gov/news-and-resources/feed/` | Returns 403 even with browser UA — actively anti-bot blocked | Dropped — no public TSP RSS exists in 2026 |
| `www.opm.gov/news/rss/` | 404 — never had a public RSS path | Dropped — no public OPM RSS exists in 2026 |
| `alerts.weather.gov/cap/ar.php?x=0` | Legacy endpoint deprecated → DNS failures | Migrated to **`api.weather.gov/alerts/active.atom?area={state}`** (verified returning AR alerts on live run) |

**Resulting federal-employee-news gap**: with TSP/OPM/Treasury all unavailable as RSS sources, federal-specific news has to come from general business outlets (Bloomberg/BBC/MarketWatch picking up shutdown/pay/FERS stories) or a future Phase-2 paid news API (e.g., NewsAPI.org or Alpha Vantage). The system's categorizer is still ready for federal-tagged articles when they appear in general feeds.

### Cost confirmed in practice

| Run | Articles fed to LLM | Cost |
|---|---|---|
| Initial test (Wave 23 base) | 32 | $0.0163 |
| With narrative summary added | 33 | $0.0179 |
| Cleaned-up feed set (final) | 65 | $0.0098 |

~$0.30–0.55/month at 1×/day cadence. Order of magnitude under the user's "DCA, not day trading" budget.

### Multi-user readiness

The service iterates every eligible user and stores a per-user digest. Adding user 21 means:
- Their tickers get added to the union ticker set automatically.
- Their state's NWS feed gets added (if a 2-letter US state).
- Their federal-employment status toggles whether federal articles are filtered out of their digest.
- Gemini Flash gets their personalized context in the prompt.

Zero code changes required to onboard a new user.

### Operator note: adding a new RSS feed

1. Open `PFMP-API/Services/News/NewsFeedRegistry.cs`.
2. Add a `new RssFeedDefinition("DisplayName", "https://feed.url/rss", "default-category")` to `GlobalFeeds`.
3. Valid categories: `macro | federal | regulatory | weather | crypto | geopolitical | holdings` (the categorizer can still override the default based on article content).
4. Restart the API. Next scheduled run (05:30 ET) or any manual trigger will pick it up.

---

## Open follow-ups (post-Wave-23 candidates)

- **Daily digest email/Slack/Discord notification** — once digest quality is proven, push it instead of pull
- **User-curated source list** — let user add/remove RSS feeds from a settings page
- **Article archiving with semantic search** — store article bodies, embed them, let the chatbot answer "what did the Fed say about rates last month?"
- **Sentiment trend chart** — sentiment is captured per digest; plot over time
- **Alert mode** — if sentiment swings sharply (e.g., bullish → bearish in 24h), surface as an alert in addition to the next regular digest

---

## Cross-references

- **Wave 22 closeout** — [wave-22-ai-architecture-overhaul.md](./wave-22-ai-architecture-overhaul.md) — wired the `News` advisor slot this wave consumes
- **OmniTrader news pattern** — [github.com/WireDoc/OmniTrader](https://github.com/WireDoc/OmniTrader) (`bot/src/news.py`, `bot/src/rss_client.py`, `bot/config/llm.yaml`)
- **AI prompt builder (consumer of digest)** — [PFMP-API/Services/AI/AIIntelligenceService.cs](../../PFMP-API/Services/AI/AIIntelligenceService.cs)
