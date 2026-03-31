# Wave 15 — Property Management & Automated Valuation

_Completed: March 31, 2026_

## Summary

Wave 15 delivered full property CRUD from the dashboard, automated property valuation via the Estated AVM API, address standardization via USPS Web Tools, and a monthly Hangfire job for bulk valuation refreshes. Manual entry is always available — no external API key is required for basic property management.

## What Shipped

### Backend
- **7 new PropertyProfile fields**: `AutoValuationEnabled`, `LastValuationAt`, `ValuationSource`, `ValuationConfidence`, `ValuationLow`, `ValuationHigh`, `AddressValidated`
- **IAddressValidationService + UspsAddressValidationService**: USPS Web Tools API integration for address standardization. Passes through gracefully when unconfigured.
- **IPropertyValuationProvider + EstatedValuationProvider**: Estated API AVM provider. Returns null when unconfigured.
- **IPropertyValuationService + PropertyValuationService**: Orchestrator combining address validation, AVM lookup, PropertyValueHistory recording, and task completion.
- **PropertyValuationRefreshJob**: Monthly Hangfire job (1st of month, 3 AM ET) for bulk valuation refresh across all users.
- **New endpoints**:
  - `POST /api/properties/validate-address` — Validates/standardizes a US address
  - `POST /api/properties/{propertyId}/refresh-valuation` — Manual refresh with 24hr rate limit
- **Delete restriction removed**: Both manual and Plaid-synced properties can now be deleted.
- **EF migration**: `AddPropertyValuationFields` applied.

### Frontend
- **AddPropertyDialog**: Full-featured create form with address validation, property type/occupancy selects, optional fields for mortgage/rental/HELOC.
- **EditPropertyDialog**: Pre-populated edit form. Plaid-linked properties show info alert; mortgage balance disabled for Plaid-synced entries.
- **UpdateValueDialog**: Quick value update from the property detail page.
- **PropertiesPanel**: Added "+" button to create properties directly from the dashboard. Accepts `userId` and `onRefresh` props.
- **PropertyDetailView**: Added action bar (Edit, Delete with confirmation, Update Value, Refresh Valuation). Automated Valuation section showing source/confidence/range. 24hr rate limit messaging on refresh.
- **Dashboard.tsx**: Passes `userId` and `onRefresh` to PropertiesPanel.

### Testing
- **Frontend**: 24 tests across 4 test files (AddPropertyDialog, EditPropertyDialog, UpdateValueDialog, PropertiesPanel)
- **Backend**: 10 integration tests in PropertiesControllerTests (CRUD, address validation, valuation, history, 404 handling)

### Postman
- Collection bumped to v1.10.0
- Added "Validate Address" and "Refresh Property Valuation" endpoints
- Updated "Delete Property" description

## Configuration

Two optional API keys in `appsettings.Development.json` under `PropertyValuation`:
- `UspsUserId` — USPS Web Tools user ID (free, register at usps.com)
- `EstatedApiToken` — Estated API key (~$0.10-0.50/lookup)

Both services degrade gracefully when keys are empty — manual property management works without them.

## Files Changed

### New Files
| File | Purpose |
|------|---------|
| `PFMP-API/Services/Properties/IAddressValidationService.cs` | Address validation interface + StandardizedAddress record |
| `PFMP-API/Services/Properties/UspsAddressValidationService.cs` | USPS Web Tools implementation |
| `PFMP-API/Services/Properties/IPropertyValuationProvider.cs` | AVM provider interface + PropertyValuation record |
| `PFMP-API/Services/Properties/EstatedValuationProvider.cs` | Estated API implementation |
| `PFMP-API/Services/Properties/PropertyValuationService.cs` | Orchestrator service |
| `PFMP-API/Jobs/PropertyValuationRefreshJob.cs` | Monthly Hangfire job |
| `pfmp-frontend/src/components/properties/AddPropertyDialog.tsx` | Create property dialog |
| `pfmp-frontend/src/components/properties/EditPropertyDialog.tsx` | Edit property dialog |
| `pfmp-frontend/src/components/properties/UpdateValueDialog.tsx` | Quick value update dialog |
| `PFMP-API.Tests/PropertiesControllerTests.cs` | Backend integration tests |
| `pfmp-frontend/src/tests/components/AddPropertyDialog.test.tsx` | AddPropertyDialog tests |
| `pfmp-frontend/src/tests/components/EditPropertyDialog.test.tsx` | EditPropertyDialog tests |
| `pfmp-frontend/src/tests/components/UpdateValueDialog.test.tsx` | UpdateValueDialog tests |

### Modified Files
| File | Changes |
|------|---------|
| `PFMP-API/Models/FinancialProfile/PropertyProfile.cs` | 7 new valuation fields |
| `PFMP-API/Controllers/PropertiesController.cs` | 2 new endpoints, valuation fields in DTOs, delete restriction removed |
| `PFMP-API/Program.cs` | 3 service registrations, monthly Hangfire job |
| `PFMP-API/appsettings.Development.json` | PropertyValuation config section |
| `pfmp-frontend/src/api/properties.ts` | 7 new DTO fields, 3 new interfaces, 2 new API functions |
| `pfmp-frontend/src/views/dashboard/PropertiesPanel.tsx` | Add button, userId/onRefresh props |
| `pfmp-frontend/src/views/dashboard/PropertyDetailView.tsx` | Action bar, valuation section, dialogs |
| `pfmp-frontend/src/views/Dashboard.tsx` | userId/onRefresh props to PropertiesPanel |
| `pfmp-frontend/src/tests/propertiesPanel.test.tsx` | 3 new tests for Add button |
| `PFMP-API/postman/PFMP-API.postman_collection.json` | v1.10.0, 2 new endpoints |

## Future Work (Phase 4)
- Property advice integration (refinance/HELOC recommendations)
- Zillow/Redfin alternate AVM providers
- Address autocomplete (Google Places or SmartyStreets)
- Property tax estimation
