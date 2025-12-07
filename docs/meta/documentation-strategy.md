# PFMP Documentation Strategy

_Last updated: 2025-12-07_

## Purpose

This guide defines a durable documentation system that keeps all contributors—including AI assistants—oriented without drowning in legacy notes. It establishes a predictable taxonomy, archive policy, and maintenance cadence so new files land in the right place and historical context stays discoverable.

---

## Quick Reference: Key Documents

| Document | Purpose | Update Frequency |
|----------|---------|------------------|
| `docs/documentation-map.md` | **Master index** of all docs | Every wave completion |
| `docs/history/roadmap.md` | Product milestones & wave status | Every wave completion |
| `docs/history/changelog.md` | Release history (concise) | Every version bump |
| `README.md` | Project overview for new contributors | Every major milestone |
| `docs/waves/wave-N-plan.md` | Current wave implementation plan | During active wave |
| `docs/waves/wave-N-complete.md` | Wave completion summary | At wave completion |

---

## Document Lifecycle

### 1. Planning Documents
**Pattern**: `wave-N-plan.md` or `wave-N-option-X-plan.md`
- Created at wave start
- Archived when wave completes
- **Action at completion**: Move to `docs/waves/archive/`

### 2. Completion Documents
**Pattern**: `wave-N-complete.md` or `wave-N-option-X-complete.md`
- Created at wave completion
- Stays in `docs/waves/` as reference
- **Consolidation**: If multiple options, create `wave-N-complete-summary.md`

### 3. Living Documents
Must always reflect current behavior:
- `README.md`
- `docs/documentation-map.md`
- `docs/history/roadmap.md`
- `docs/guides/*`

### 4. Archived Documents
Historical reference only—no routine updates:
- `docs/archive/notes/` – Old phase notes
- `docs/archive/dev/` – Old implementation details
- `docs/archive/runbooks/` – Outdated operational docs
- `docs/waves/archive/` – Superseded wave plans

---

## Directory Structure

```
docs/
├── documentation-map.md      # MASTER INDEX - update this!
├── api/                      # API reference and contracts
├── archive/                  # Historical documents
│   ├── dev/                  # Archived dev docs (e.g., wave7_4_*.md)
│   ├── notes/                # Archived phase completion notes
│   └── runbooks/             # Outdated operational runbooks
├── auth/                     # Authentication guides
├── data/                     # Database and import formats
├── dev/                      # Developer reference guides
├── guides/                   # How-to guides and standards
├── history/                  # Roadmap and changelog
├── meta/                     # This strategy + audit logs
├── notes/                    # Active testing notes
├── scripts/                  # Script documentation
├── testing/                  # Test guides and results
└── waves/                    # Wave plans and completion docs
    └── archive/              # Superseded wave planning docs
```

---

## Wave Completion Checklist

When completing a wave, follow this checklist to maintain documentation:

### Immediately
- [ ] Create `wave-N-complete.md` (or option-specific completion doc)
- [ ] Update `docs/history/roadmap.md` with completion status
- [ ] Update `docs/history/changelog.md` with version bump
- [ ] Update `README.md` version and current highlights

### Archive & Cleanup
- [ ] Move planning docs to `docs/waves/archive/`
- [ ] Move any superseded dev docs to `docs/archive/dev/`
- [ ] Update `docs/documentation-map.md` to reflect changes

### Next Wave Prep
- [ ] Create `wave-N+1-plan.md`
- [ ] Update roadmap status to show next wave "In Progress"

---

## Avoiding Documentation Drift

### Problem: AI Assistants Lose Track
AI assistants process many documents but can lose context across sessions. To help:

1. **Use the documentation map** - `docs/documentation-map.md` is the canonical index
2. **Keep roadmap current** - `docs/history/roadmap.md` shows what's complete vs planned
3. **Archive aggressively** - Old planning docs create confusion; move them
4. **Consistent naming** - Use `wave-N-` prefix for all wave-related docs

### Problem: Outdated Runbooks
Runbooks from earlier waves become stale. Solution:
- Move to `docs/archive/runbooks/` when wave completes
- Only keep operationally-relevant runbooks in `docs/data/runbooks/`

### Problem: Duplicate Content
The README, changelog, and wave docs can duplicate info. Solution:
- **README**: High-level overview + quick start
- **Changelog**: Version-by-version changes (concise)
- **Wave docs**: Implementation details (detailed)

---

## Maintenance Schedule

| Task | Frequency | Owner |
|------|-----------|-------|
| Update documentation-map.md | Every wave completion | Developer |
| Update roadmap.md | Every wave completion | Developer |
| Archive superseded docs | Every wave completion | Developer |
| Review changelog accuracy | Every version bump | Developer |
| Full documentation audit | Quarterly | Project Lead |

---

## Files to Ignore (Not Tracked)

These files are in `.gitignore` and should not be committed:

- `temp-debug.txt` - Developer debugging output
- `PFMP_API Console Output.txt` - Pasted console output
- `localhost.log` - Local server logs
- `temp-*.json` - Temporary analysis files

---

## Current Status (December 2025)

### Recently Updated ✅
- `docs/history/roadmap.md` - Reflects Wave 9.3 complete, Wave 10 next
- `docs/history/changelog.md` - Concise format, current through v0.9.5
- `docs/documentation-map.md` - Current wave references
- `README.md` - Version v0.9.5-alpha, Wave 10 roadmap

### Recently Archived 📁
- `docs/dev/wave7_4_*.md` → `docs/archive/dev/`
- `docs/runbooks/ENABLE-DASHBOARD-REAL-DATA.md` → `docs/archive/runbooks/`
- `docs/waves/wave-9.2-*.md` → `docs/waves/archive/`
- `docs/waves/wave-9.3-*-plan.md` → `docs/waves/archive/`

### Upcoming Tasks
- [ ] Create `docs/data/runbooks/price-refresh.md` for Wave 10 job operations
- [ ] Create `docs/data/runbooks/hangfire-admin.md` for job scheduler

---

## Key Principles

1. **One source of truth** - Documentation map is the master index
2. **Archive, don't delete** - Historical context has value
3. **Update at completion** - Not before, not long after
4. **Prefer consolidation** - One summary doc beats five partial docs
5. **Name consistently** - `wave-N-*` pattern for all wave docs

---

_Document owner: Current maintainer. Update this strategy when the taxonomy or cadence changes._
