# Dual-AI Financial Advisor Expansion Plan (Waves 1–7)

Date: 2025-09-28
Status: Draft – Wave 1 (Documentation & Scaffold) Pending Implementation
Author: System Assistant (codified from interactive design discussion)

---
## 1. Vision
Transform PFMP from static analytics + isolated AI endpoints into a continuous, explainable dual‑AI advisory system that:
- Generates structured, auditable financial recommendations
- Maintains session and long‑term user context without model retraining
- Surfaces validator critique and policy/risk violations transparently
- Converts accepted advice directly into actionable tasks
- Evolves toward simulations, projection scenarios, and cost governance

---
## 2. Core Concepts
| Concept | Description | Persistence | Phase Introduced |
|---------|-------------|-------------|------------------|
| Advice | Canonical recommendation object (consensus output) | Advice table | Wave 1 |
| Advisory Session | Multi-turn conversational container | AdvisorySession table | Wave 3 |
| Advice Message | Individual conversational turn | AdviceMessage table | Wave 3 |
| Policy / Risk Rule | Deterministic constraints (e.g. emergency fund coverage) | Rule config (code/JSON) | Wave 2 |
| Violations | Structured rule breach artifacts | JSON on Advice / Validator output | Wave 2 |
| Dual-AI Pipeline | Primary + Validator + Consensus synthesis | Service layer | Wave 2 |
| Simulation Scenario | What-if modeling request | Scenario tables (future) | Wave 6 |
| Audit Frame | Per-stage trace of pipeline execution | Audit table (optional) | Wave 7 |

---
## 3. Memory Model (No Custom Training Required)
Memory realized through orchestration, not fine-tuning:
1. Static Profile: demographics, risk tolerance, benefits, targets
2. Financial Snapshot: current valuation + allocation + liquidity stats
3. Advice Ledger: accepted/rejected historical recommendations
4. Session Context: recent turns + rolling summary
5. Policy Flags: evaluated pre‑generation
6. Semantic Retrieval (Optional later): pgvector embeddings of past advice/questions

> Goal: Provide *just enough* curated context to the model each call for continuity, minimizing token footprint and avoiding hallucination.

---
## 4. Wave Roadmap Overview
| Wave | Title | Primary Objective | Key Deliverables |
|------|-------|-------------------|------------------|
| 1 | Advice Domain Scaffold | Persist basic advice objects | Advice table, `POST /api/advice/generate`, `GET /api/advice/user/{id}` |
| 2 | Rule & Consensus Layer | Introduce validator critique + policy evaluation | Rule engine stub, consensus JSON format, violation rendering |
| 3 | Conversational Advisory Sessions | Multi-turn chat + rolling summaries | Session + Message tables, session API, chat UI |
| 4 | Lifecycle Integration | Advice → Task conversion & drift-triggered regeneration | Accept/reject endpoints, drift detector, linkage stats |
| 5 | Dual-Model & Cost Governance | True second model + token metering | Dual provider abstraction, usage metrics, feature flags UI |
| 6 | Simulation & Projection | Scenario modeling (contribution, market shock) | Simulation service + projection endpoint + graph UI |
| 7 | Explainability & Audit | Full trace + change diffing + export | Audit frames, portfolio delta analyzer, export module |

---
## 5. Wave 1 – Detailed Scope (Backend Only)
Goal: Establish durable Advice entity + generation endpoint using current AI service (simulated single‑pass). Frontend integration deferred until docs merged + API stable.

### 5.1 Data Model (Initial)
Advice
- AdviceId (int, PK)
- UserId (int, FK Users)
- Theme (string, nullable for now – e.g. "General", future taxonomy)
- Status (string enum): "Proposed" | "Accepted" | "Rejected" | "ConvertedToTask"
- ConsensusText (TEXT) – simplified final narrative
- ConfidenceScore (int) – placeholder (default 60)
- PrimaryJson (JSON) – raw AI structured block (nullable Wave 1)
- ValidatorJson (JSON) – reserved for Wave 2 (nullable)
- ViolationsJson (JSON) – reserved for Wave 2
- LinkedTaskId (int?, FK Tasks) – null Wave 1
- CreatedAt (UTC), UpdatedAt (UTC)

### 5.2 Endpoints (Wave 1)
`POST /api/advice/generate/{userId}`
- Builds minimal context (user + portfolio valuation if available)
- Calls existing `_aiService.AnalyzePortfolioAsync(userId)`
- Wraps response into Advice (ConsensusText = trimmed analysis)
- Returns persisted Advice DTO

`GET /api/advice/user/{userId}`
- Returns list (latest first) of Advice DTOs

(Future placeholder responses: accept/reject routes return 501 Not Implemented now.)

### 5.3 Service Layer
IAdviceService
- `Task<Advice> GenerateBasicAdviceAsync(int userId)`
- `Task<IEnumerable<Advice>> GetAdviceForUserAsync(int userId)`

Implementation Steps:
1. Validate user existence
2. Fetch optional portfolio summary via existing portfolio service (if available)
3. Call AI service → result text
4. Truncate / sanitize (length guard, remove placeholders)
5. Persist Advice with Status = "Proposed"
6. Return Advice

### 5.4 DTO (Wave 1)
```json
{
  "adviceId": 123,
  "userId": 2,
  "status": "Proposed",
  "theme": "General",
  "consensusText": "Your portfolio is overweight equities relative to age...",
  "confidenceScore": 60,
  "createdAt": "2025-09-28T12:34:00Z"
}
```

### 5.5 Non-Goals (Wave 1)
- No validator model
- No rule evaluation
- No sessions / messages
- No task conversion logic
- No semantic retrieval

### 5.6 Acceptance Criteria
- Migration applies cleanly
- Both endpoints function (manual test with userId=1..4)
- Advice rows persist and list ordering is most-recent-first
- Lint/build passes
- No impact to existing AI or task endpoints

---
## 6. Future Waves – Key Additions Snapshot
Wave 2: Add rule evaluation pipeline (Emergency fund coverage, Allocation drift) + validator critique structure.
Wave 3: Sessions (state machine), message log, rolling summarization.
Wave 4: Accept/Reject endpoints + Task creation mapping.
Wave 5: Dual provider abstraction + usage metering + feature flags.
Wave 6: Simulation engine (projection curves, scenario compare).
Wave 7: Audit frames + portfolio delta diff + export (PDF/MD).

---
## 7. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Scope Creep in Wave 1 | Delays dual-AI features | Freeze scope; only Advice + two endpoints |
| Large Prompt Tokens | Cost & latency | Introduce summarization early; structured context packs |
| Model Output Variability | Inconsistent storage | Enforce JSON schema from Wave 2 onward |
| Future Rule Changes | Migration churn | Use JSON columns for violations/validator payloads |
| Second Model Latency | UX degradation | Parallelize primary + validator once both contexts stable |

---
## 8. Open Questions
- Theme taxonomy: derive from user question vs classification pass? (Defer)
- Confidence scoring algorithm: static placeholder vs heuristic from drift/volatility? (Wave 2+)
- Advice expiration / freshness SLA (e.g., auto-expire after 30 days)? (Wave 3)

---
## 9. Implementation Order (Actionable)
1. Migration: Add Advice table
2. Entity + DbContext registration
3. IAdviceService + implementation
4. AdviceController with endpoints
5. Manual test (userId: 1–4)
6. Commit & push (tag: wave1-advice-scaffold)
7. Then begin frontend page stub in a subsequent PR

---
## 10. Change Log
- 2025-09-28: Initial document created (pre-implementation)

---
## 11. Approval
Wave 1 documentation prepared for execution. Proceeding pending confirmation (received).
