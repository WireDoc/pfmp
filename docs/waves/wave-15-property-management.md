# Wave 15: Property Management & Automated Valuation

_Created: 2026-03-30_
_Status: 📋 Planned_
_Target: Q2 2026_
_Predecessor: Wave 12.5 (property auto-creation from Plaid mortgages)_
_Reference: `docs/waves/WAVE-5-REAL-ESTATE-ENRICHMENT.md` (original enrichment plan)_

---

## Background

Wave 12.5 introduced property auto-creation from Plaid mortgage syncs, a read-only property detail view, and value history tracking. However, the dashboard currently offers **no ability to manually add, edit, or delete properties**. Edit capability only exists in the onboarding wizard. Additionally, there is no automatic property valuation service — property values are static once entered and only update when a Plaid mortgage sync triggers a balance change.

USAA, Rocket Mortgage, and other financial platforms provide periodic automatic home value estimates. PFMP needs similar functionality to be a credible personal finance dashboard.

This wave consolidates the remaining property work from the original Wave 5 enrichment plan into a concrete delivery scope.

---

## Objectives

1. **Dashboard property CRUD** — Add, edit, and delete properties directly from the dashboard (not just onboarding).
2. **Automatic property valuation** — Periodic background job that fetches estimated property values from a third-party API, similar to USAA/Zillow.
3. **Property value update UX** — Allow manual value updates from the detail page with history tracking.
4. **Address validation** — Autocomplete and verify addresses for accurate valuation lookups.

---

## Current State (Wave 12.5 Baseline)

| Capability | Status |
|-----------|--------|
| Property auto-creation from Plaid mortgage | ✅ Working (user_good sandbox) |
| PropertyProfile model with Plaid fields | ✅ Complete |
| PropertyValueHistory model & table | ✅ Complete |
| PropertiesController full CRUD API | ✅ Complete |
| Properties API client (frontend) | ✅ Complete |
| PropertiesPanel on dashboard | ✅ Read-only display |
| PropertyDetailView at /dashboard/properties/:id | ✅ Read-only |
| PropertyTaskService (stale property tasks) | ✅ Complete |
| Manual property add from dashboard | ❌ Missing |
| Manual property edit from dashboard | ❌ Missing |
| Manual property delete from dashboard | ❌ Missing |
| Manual value update from detail view | ❌ Missing |
| Automatic property valuation (Zillow/etc.) | ❌ Missing |
| Address autocomplete/validation | ❌ Missing |

---

## Phase 1: Dashboard Property Management UI

**Goal**: Full CRUD for properties from the dashboard, matching the UX patterns used by accounts and cash accounts.

### 1.1 Add Property Dialog
- "Add Property" button on PropertiesPanel header
- MUI Dialog with fields: Property Name, Type (primary/rental/investment/vacation), Address (street, city, state, zip), Estimated Value, Mortgage Balance (optional), Monthly Mortgage Payment, Monthly Rental Income (if rental), Monthly Expenses, Has HELOC toggle
- Calls `POST /api/properties` (already exists)
- Records initial value in PropertyValueHistory

### 1.2 Edit Property
- Edit button on PropertyDetailView (pencil icon in header)
- Opens edit dialog pre-populated with current values
- Calls `PUT /api/properties/{propertyId}` (already exists)
- Auto-records value change in PropertyValueHistory if EstimatedValue changed
- Plaid-synced properties: allow manual value override but show warning that next sync may update mortgage balance

### 1.3 Delete Property
- Delete button on PropertyDetailView (with confirmation dialog)
- Blocks deletion of Plaid-synced properties (API already enforces this)
- Manual properties can be deleted

### 1.4 Manual Value Update
- "Update Value" button on PropertyDetailView
- Simple dialog: new estimated value + optional notes
- Calls PropertyTaskService.RecordPropertyValueUpdateAsync (already exists)
- Updates value history and marks any stale-property tasks complete

### Frontend Components
| Component | Location | New/Modified |
|-----------|----------|-------------|
| AddPropertyDialog | `src/components/properties/AddPropertyDialog.tsx` | New |
| EditPropertyDialog | `src/components/properties/EditPropertyDialog.tsx` | New |
| UpdateValueDialog | `src/components/properties/UpdateValueDialog.tsx` | New |
| PropertiesPanel | `src/views/dashboard/PropertiesPanel.tsx` | Modified (add button) |
| PropertyDetailView | `src/views/dashboard/PropertyDetailView.tsx` | Modified (edit/delete/update buttons) |

### Backend
- No new endpoints needed — `POST`, `PUT`, `DELETE /api/properties` already exist
- Verify PropertyTaskService integration works end-to-end

---

## Phase 2: Automatic Property Valuation Service

**Goal**: Periodic background job that fetches property value estimates, similar to USAA home value tracking.

### 2.1 Valuation Provider Integration

**Recommended providers** (in priority order):

| Provider | Type | Cost | Coverage | Notes |
|----------|------|------|----------|-------|
| **Estated** | REST API | ~$0.10-0.50/lookup | US residential | Developer-friendly, AVM (Automated Valuation Model) |
| **HouseCanary** | REST API | Custom pricing | US residential | High-accuracy AVM, comp data |
| **ATTOM** | REST API | ~$0.05-0.25/lookup | US residential | Property data + AVM |
| **Zillow** | Zestimate API | Restricted | US residential | Limited API access, consider Zillow Bridge API |

**Provider abstraction**:
```csharp
public interface IPropertyValuationProvider
{
    Task<PropertyValuation?> GetValuationAsync(string street, string city, string state, string zip);
    string ProviderName { get; }
}

public record PropertyValuation(
    decimal EstimatedValue,
    decimal? LowEstimate,
    decimal? HighEstimate,
    string Source,
    DateTime FetchedAt,
    decimal? ConfidenceScore
);
```

### 2.2 Valuation Service
```csharp
public interface IPropertyValuationService
{
    Task<PropertyValuation?> RefreshValuationAsync(Guid propertyId);
    Task RefreshAllPropertyValuationsAsync(int userId);
}
```
- Calls provider API with property address
- Records result in PropertyValueHistory (source = provider name)
- Updates PropertyProfile.EstimatedValue
- Respects rate limits (stagger requests)
- Handles failures gracefully (log, skip, retry next cycle)

### 2.3 Background Job (Hangfire)

| Job | Schedule | Description |
|-----|----------|-------------|
| PropertyValuationRefreshJob | Monthly (1st of month, 3 AM ET) | Refresh all properties with valid addresses |

- Only processes properties with complete addresses (street + city + state + zip)
- Skips properties with `autoValuationEnabled = false` (future toggle)
- Staggers API calls (1-2 second delay between requests)
- Logs all results to PropertyValueHistory
- Generates tasks for properties that fail valuation lookup

### 2.4 Manual Refresh
- "Refresh Value" button on PropertyDetailView
- Calls `POST /api/properties/{propertyId}/refresh-valuation` (new endpoint)
- Shows loading spinner, then updated value with provider attribution
- Rate-limited to 1 refresh per property per day

### Backend Deliverables
| Component | Location | New/Modified |
|-----------|----------|-------------|
| IPropertyValuationProvider | `Services/Properties/IPropertyValuationProvider.cs` | New |
| EstatedValuationProvider | `Services/Properties/EstatedValuationProvider.cs` | New |
| PropertyValuationService | `Services/Properties/PropertyValuationService.cs` | New |
| PropertyValuationRefreshJob | `Jobs/PropertyValuationRefreshJob.cs` | New |
| PropertiesController | `Controllers/PropertiesController.cs` | Modified (refresh endpoint) |
| PropertyProfile model | `Models/FinancialProfile/PropertyProfile.cs` | Modified (autoValuationEnabled, lastValuationAt) |
| Migration | `Migrations/` | New |

---

## Phase 3: Address Validation & Autocomplete

**Goal**: Validate property addresses to ensure accurate valuation lookups.

### 3.1 Address Autocomplete (Frontend)
- Google Places Autocomplete or Mapbox Search on address fields
- Parse structured address components (street, city, state, zip)
- Show formatted suggestion dropdown
- Allow manual override

### 3.2 Address Validation (Backend)
- Validate addresses via USPS Web Tools or SmartyStreets before saving
- Store standardized address components
- Flag invalid/unverifiable addresses
- Skip valuation for unverified addresses

### Provider Options
| Provider | Type | Cost | Notes |
|----------|------|------|-------|
| Google Places | Autocomplete | $2.83/1000 requests | Best UX, requires API key |
| Mapbox Search | Autocomplete | Free tier available | Good alternative |
| SmartyStreets | Validation | $0.01/lookup | US address verification |
| USPS Web Tools | Validation | Free | Government API, slower |

---

## Phase 4: Property Advice Integration (Future)

_This phase is documented for completeness but may be deferred._

- Refinance prompts when market rates drop significantly below mortgage rate
- HELOC suggestions when equity exceeds thresholds
- Rental optimization alerts when vacancy or expenses change
- Property tax assessment comparison alerts

---

## Model Changes

### PropertyProfile (existing, add fields)
```csharp
public bool AutoValuationEnabled { get; set; } = true;
public DateTime? LastValuationAt { get; set; }
public string? ValuationSource { get; set; }  // "estated", "housecanary", etc.
public decimal? ValuationConfidence { get; set; }
public decimal? ValuationLow { get; set; }
public decimal? ValuationHigh { get; set; }
```

### New Endpoints
```
POST /api/properties/{propertyId}/refresh-valuation  — Trigger manual valuation refresh
```

### Scheduler Admin UI
- Add PropertyValuationRefreshJob to Hangfire dashboard
- Manual "Run Now" from scheduler admin

---

## Acceptance Criteria

### Phase 1 (Dashboard CRUD)
- [ ] User can add a property from the dashboard Properties Panel
- [ ] User can edit a property from the Property Detail View
- [ ] User can delete a manually-created property
- [ ] User can update property value with history tracking
- [ ] Plaid-synced properties show edit restrictions
- [ ] All operations reflected immediately in dashboard totals

### Phase 2 (Automatic Valuation)
- [ ] At least one valuation provider integrated and working
- [ ] Monthly background job refreshes property values
- [ ] Manual refresh button works on detail view
- [ ] Value history shows source attribution (manual vs. provider)
- [ ] Failed valuations logged and don't crash the job
- [ ] Rate limiting prevents API abuse

### Phase 3 (Address Validation)
- [ ] Address autocomplete on add/edit property forms
- [ ] Addresses validated before saving
- [ ] Invalid addresses flagged in UI

---

## Dependencies

- **Valuation API key**: Need to sign up for Estated, HouseCanary, or equivalent
- **Google Places API key** (optional): For address autocomplete
- **PropertyProfile migration**: Add new valuation fields

---

## Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| Valuation API costs | Monthly job limits lookups; cache results; skip unchanged addresses |
| Inaccurate valuations | Show confidence score; allow manual override; track history for trend |
| API rate limits | Stagger requests; use exponential backoff; batch by user |
| Address quality | Validate before saving; skip valuation for incomplete addresses |

---

## Estimated Effort

| Phase | Scope | Estimate |
|-------|-------|----------|
| Phase 1 | Dashboard CRUD UI | Medium (3-4 sessions) |
| Phase 2 | Valuation service + job | Medium-Large (4-5 sessions) |
| Phase 3 | Address validation | Small (1-2 sessions) |
| Phase 4 | Advice integration | Deferred |

---

_This wave supersedes the property-related portions of `docs/waves/WAVE-5-REAL-ESTATE-ENRICHMENT.md`. That document should be archived after this wave begins._
