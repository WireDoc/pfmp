# PFMP Documentation Strategy (2025-10-09)

## Purpose
This guide defines a durable documentation system that orients any contributor—from the initial `INSTRUCTIONS.md` hand-off through feature-specific guides—without drowning them in legacy notes. It introduces a predictable taxonomy, archive policy, and maintenance cadence so new files land in the right place and historical context stays discoverable.

## Canonical Navigation Flow
1. **`INSTRUCTIONS.md`** – Lightweight landing page pointing to the living guides.
2. **`README.md`** – Project overview, architecture summary, active roadmap pointer.
3. **`docs/guides/QUICK-START.md`** – Environment setup and daily workflow.
4. **`docs/guides/DEV-STANDARDS.md` + domain guides** – Coding rules, backend/frontend specifics.
5. **`docs/runbooks/`** – Operational procedures invoked as needed.
6. **Historical context** – Accessed via `docs/archive/` when deeper archaeology is required.

Each layer stays concise by delegating detail to the next, preventing README/INSTRUCTIONS bloat.

## Document Taxonomy
| Tier | Definition | Examples (Current) | Maintenance Cadence |
|------|------------|--------------------|---------------------|
| **Living** | Must always reflect current behavior; update as part of feature work. | `README.md`, `pfmp.txt` (to be re-scoped or replaced), `docs/guides/*`, `docs/API-DOCUMENTATION.md` | Update immediately when behavior changes; review monthly. |
| **Operational** | Process docs triggered by events; updated when process changes. | `docs/runbooks/ENABLE-DASHBOARD-REAL-DATA.md`, `docs/DATABASE-TOOLS-SETUP.md` | Review quarterly; update after each use. |
| **Reference Snapshots** | Point-in-time records (roadmaps, wave plans) for current initiative. | `docs/waves/*.md`, `docs/ROADMAP.md`, `docs/AUTHENTICATION-COMPLETE.md` status review | Update at the start/end of each wave or roadmap revision. |
| **Archive (Historical)** | Legacy phases, logs, deprecated guides retained for context only. | `docs/archive/notes/PHASE*_COMPLETION_NOTES.md`, `docs/archive/notes/pfmp-log-2025.md` | No routine updates; append-only if used as journal. |

## Directory Baseline (Oct 2025)
| Folder | Purpose | Current Issues | Planned Action |
|--------|---------|----------------|----------------|
| `docs/guides/` | Authoritative “how to work here” manuals | Up-to-date but lack master index | Add section in README + link from INSTRUCTIONS. |
| `docs/notes/` | Quick scratch/testing notes | Legacy phase completions removed; only active testing notes remain | Keep lean; archive scratch docs once wave summaries land elsewhere. |
| `docs/waves/` | Rebuild roadmap + status | Multiple versions over time; latest plan current | Keep as reference snapshots; add index to clarify superseded docs. |
| `docs/api/`, `docs/testing/`, `docs/runbooks/` | Domain-specific deep dives | Mostly relevant, some duplication | Audit individually; ensure README lists them. |
| Root docs (`README.md`, `pfmp.txt`, `ROADMAP.md`) | Entry-point narrative | README and pfmp.txt stale relative to latest waves | Schedule rewrite/merge. |

## Maintenance Workflow
1. **Feature/change lands** → update the relevant living doc in the same PR.
2. **Weekly/bi-weekly triage** → review `docs/DOCS-AUDIT-YYYY-MM-DD.md`, check for overdue actions.
3. **Monthly documentation hour** → close audit items, archive stale notes, regenerate summary.
4. **Archive process**:
   - Move obsolete files into `docs/archive/<category>/<name>.md`.
   - Leave a stub (optional) pointing to archive if discoverability matters.
   - Record the move in the audit log.

## Immediate Action List
- [x] **Archive legacy phase completion notes** from `docs/notes/` into `docs/archive/notes/`.
- [ ] **Refresh `README.md`** with the canonical navigation flow and current status (link to Strategy, Wave plan, Audit log).
- [ ] **Retire or rewrite `pfmp.txt`** → convert into succinct project pitch or fold into README.
- [ ] **Trim `INSTRUCTIONS.md`** to an actual index that mirrors this structure (remove duplicated legacy text).
- [ ] **Continue doc-by-doc audit** using `docs/DOCS-AUDIT-2025-10-08.md` as source of truth.

## Tooling Suggestions
- Add a lint-style checklist to PR template: “Updated docs? Linked audit entry?”
- Optional script to list docs changed in last 30 days vs untouched >90 days.
- Consider MkDocs or Docusaurus later if markdown tree grows; for now plain Markdown with clear index suffices.

## Appendix: Current Key Docs & Status
| File | Role | Status (2025-10-09) | Notes |
|------|------|----------------------|-------|
| `README.md` | Public project overview | **Stale** | Needs sync with wave rebuilding + local-auth direction. |
| `pfmp.txt` | Legacy vision doc | **Legacy** | Repeats README with outdated phases; plan to archive or rewrite. |
| `INSTRUCTIONS.md` | Entry index | **Corrupted/Mixed** | Contains multiple rewrites; must prune. |
| `docs/API-DOCUMENTATION.md` | API reference | **Stale** | Pending refresh (per audit). |
| `docs/AUTHENTICATION.md` | Auth guide | **Updated** | Reflects Phase 1 local auth focus (Oct 2025). |
| `docs/AUTHENTICATION-COMPLETE.md` | Status review | **Updated** | Captures outstanding Azure work. |
| `docs/DOCS-AUDIT-2025-10-08.md` | Audit log | **Active** | Continue appending decisions. |
| `docs/archive/notes/pfmp-log-2025.md` | Running log (Sept–Oct 2025) | **Archived** | Frozen snapshot of early build-out; start a new log only if necessary. |
| `docs/waves/REBUILD-WAVE-PLAN.md` | Current roadmap | **Authoritative** | Treat earlier wave docs as historical unless referenced here. |

---
Document owner: Current maintainer on rotation (default: project lead). Update this strategy each time the taxonomy or cadence changes.
