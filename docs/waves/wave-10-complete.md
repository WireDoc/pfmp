# Wave 10: Background Jobs & Automation

> **Status**: ✅ Complete  
> **Completed**: December 2025  
> **Priority**: High  
> **Prerequisites**: Wave 9.3 Complete ✅

---

## Summary

Wave 10 introduces scheduled background jobs using Hangfire, enabling automated data refresh, historical snapshots for the Net Worth Timeline, and a foundation for future AI analysis jobs.

---

## Architecture Decisions

### Job Scheduler: Hangfire

**Why Hangfire:**
- Mature .NET library with PostgreSQL storage
- Built-in dashboard for monitoring
- Supports recurring, delayed, fire-and-forget, and continuation jobs
- Perfect for future AI analysis jobs
- Runs within the ASP.NET Core process

**Hosting Strategy:**
- **Development**: Jobs run when PFMP-API is running on laptop
- **Production**: Azure App Service with "Always On" ensures 24/7 execution
- **Database**: Job state stored in PostgreSQL (Synology NAS now, Azure later)

### Account Filtering Strategy

Jobs will respect account state and user flags:

```csharp
// Core filtering logic for all batch jobs
var eligibleAccounts = await _context.FinancialProfileAccounts
    .Include(a => a.User)
    .Where(a => a.IsBackgroundRefreshEnabled)        // Account opt-in
    .Where(a => a.State == AccountState.Active)      // Not onboarding/suspended
    .Where(a => !a.User.IsTestUser)                  // Skip test users
    .ToListAsync();
```

**New Fields Required:**
| Table | Field | Type | Default | Purpose |
|-------|-------|------|---------|---------|
| `FinancialProfileAccounts` | `IsBackgroundRefreshEnabled` | bool | true | Opt-out per account |
| `Users` | `IsTestUser` | bool | false | Skip in batch jobs |
| `FinancialProfileAccounts` | `State` | enum | Active | Account lifecycle state |

**Account States:**
```csharp
public enum AccountState
{
    Onboarding,      // Still in onboarding flow
    Active,          // Normal operation - eligible for jobs
    Suspended,       // Temporarily disabled
    Archived         // Soft-deleted
}
```

---

## Jobs to Implement

### 1. Daily Price Refresh Job ✅
**Schedule**: Daily at 11 PM ET (after market close)

```csharp
RecurringJob.AddOrUpdate<PriceRefreshJob>(
    "daily-price-refresh",
    job => job.RefreshAllHoldingPricesAsync(),
    "0 23 * * *", // 11 PM daily
    TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time")
);
```

**Logic:**
1. Get all eligible accounts with investment holdings
2. Batch holdings by symbol (avoid duplicate API calls)
3. Fetch prices from FMP API
4. Update `CurrentPrice` and `LastPriceUpdate` on holdings
5. Recalculate account balances
6. Log success/failure per account

### 2. Net Worth Snapshot Job ✅
**Schedule**: Daily at 11:30 PM ET (after price refresh)

```csharp
RecurringJob.AddOrUpdate<NetWorthSnapshotJob>(
    "daily-networth-snapshot",
    job => job.CaptureAllUserSnapshotsAsync(),
    "30 23 * * *", // 11:30 PM daily
    TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time")
);
```

**Logic:**
1. Get all eligible users (not test users)
2. For each user, calculate current net worth by category:
   - Investments (sum of account balances)
   - Cash (checking, savings, money market)
   - Real Estate (property equity = value - mortgage)
   - Retirement (TSP, 401k, IRA)
   - Liabilities (negative: loans, credit cards)
3. Insert into `NetWorthSnapshots` table
4. Enforce one snapshot per user per day (idempotent)

**New Table:**
```sql
CREATE TABLE "NetWorthSnapshots" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" INTEGER NOT NULL REFERENCES "Users"("Id"),
    "SnapshotDate" DATE NOT NULL,
    "TotalNetWorth" DECIMAL(18,2) NOT NULL,
    "InvestmentsTotal" DECIMAL(18,2) NOT NULL,
    "CashTotal" DECIMAL(18,2) NOT NULL,
    "RealEstateEquity" DECIMAL(18,2) NOT NULL,
    "RetirementTotal" DECIMAL(18,2) NOT NULL,
    "LiabilitiesTotal" DECIMAL(18,2) NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE("UserId", "SnapshotDate")
);
```

### 3. Staleness Alert Job ⏸️ (Disabled Initially)
**Schedule**: Weekly on Mondays at 9 AM

```csharp
// DISABLED FOR DEVELOPMENT - uncomment for production
// RecurringJob.AddOrUpdate<StalenessAlertJob>(
//     "weekly-staleness-check",
//     job => job.CheckAllAccountsAsync(),
//     "0 9 * * 1" // Monday 9 AM
// );
```

**Logic (when enabled):**
1. Find accounts not updated in 7+ days
2. Create alert/notification for user
3. Send email reminder (future)

### 4. Manual Refresh Endpoint ✅
**Not a scheduled job** - User-triggered via API

```csharp
POST /api/accounts/{id}/refresh
POST /api/accounts/refresh-all
```

**Features:**
- Refresh button on dashboard and account detail pages
- Shows loading spinner during refresh
- Updates "Last Refreshed" timestamp
- Toast notification on success/failure

---

## Net Worth Timeline Integration

### Dashboard Widget (Sparkline)
- Small area chart in Overview panel
- Shows last 30 days trend
- Links to full timeline page

### Dedicated Page (`/dashboard/net-worth`)
- Full-page stacked area chart
- Time range selector: 1M, 3M, 6M, 1Y, YTD, ALL
- Category breakdown: Investments, Cash, Real Estate, Retirement, Liabilities
- Hover tooltips with exact values

### Graceful Empty State

```tsx
// NetWorthTimeline.tsx
if (snapshots.length < 3) {
  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <TimelineIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Building Your Net Worth History
      </Typography>
      <Typography color="text.secondary">
        We're collecting data to show your net worth over time. 
        Check back in a few days once we have enough data points.
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        {snapshots.length} of 3 minimum data points collected
      </Typography>
    </Paper>
  );
}
```

### Dashboard Unlock Check
Uses existing `isDashboardUnlocked` state - Net Worth Timeline only shows after onboarding complete.

---

## Scheduler Admin Page

### Location
- Route: `/admin/scheduler`
- Sidebar: "System" section → "Scheduler"
- Access: All users during development (admin-only later)

### UI Design (MUI-styled, inspired by Sonarr)

**Scheduled Jobs Table:**
| Column | Description |
|--------|-------------|
| Name | Job display name |
| Interval | Human-readable (e.g., "Daily at 11 PM") |
| Last Execution | Relative time (e.g., "2 hours ago") |
| Last Duration | e.g., "00:00:45" |
| Next Execution | e.g., "in 4 hours" |
| Actions | "Run Now" button, Enable/Disable toggle |

**Queue Section:**
| Column | Description |
|--------|-------------|
| Status | Icon: ✓ success, ⏳ running, ❌ failed |
| Name | Job name |
| Queued | When queued |
| Started | When started |
| Ended | When completed |
| Duration | Execution time |

**Features:**
- Real-time updates (polling every 30s or WebSocket)
- Filter by job type or status
- Expandable rows for job details/logs
- "Clear History" button for old executions

### Component Structure
```
src/views/admin/
├── SchedulerPage.tsx           # Main page
├── components/
│   ├── ScheduledJobsTable.tsx  # Recurring jobs table
│   ├── JobQueueTable.tsx       # Recent executions
│   ├── JobStatusChip.tsx       # Status indicator
│   └── RunNowButton.tsx        # Trigger manual run
```

---

## API Endpoints

### Hangfire Dashboard
```
GET /hangfire              # Built-in Hangfire dashboard (admin only)
```

### Custom Scheduler API
```
GET  /api/admin/scheduler/jobs           # List all recurring jobs
GET  /api/admin/scheduler/jobs/{id}      # Get job details
POST /api/admin/scheduler/jobs/{id}/run  # Trigger immediate execution
PUT  /api/admin/scheduler/jobs/{id}      # Enable/disable job

GET  /api/admin/scheduler/queue          # Recent job executions
GET  /api/admin/scheduler/queue/{id}     # Execution details with logs
```

### Net Worth Timeline API
```
GET /api/dashboard/net-worth/timeline?period=1Y
    Response: { snapshots: [...], summary: { change, percentChange } }
```

---

## Database Migrations

### Migration: AddBackgroundJobSupport

```csharp
// Add account state and refresh flags
migrationBuilder.AddColumn<int>("State", "FinancialProfileAccounts", defaultValue: 1);
migrationBuilder.AddColumn<bool>("IsBackgroundRefreshEnabled", "FinancialProfileAccounts", defaultValue: true);
migrationBuilder.AddColumn<bool>("IsTestUser", "Users", defaultValue: false);

// Create net worth snapshots table
migrationBuilder.CreateTable("NetWorthSnapshots", ...);

// Create Hangfire schema (auto-created by Hangfire)
```

---

## Implementation Phases

### Phase 1: Foundation (3-4 hours) ✅
- [x] Install Hangfire packages
- [x] Configure Hangfire with PostgreSQL
- [x] Add database migration for new fields
- [x] Create `NetWorthSnapshots` table
- [x] Basic Hangfire dashboard access (`/hangfire`)

### Phase 2: Core Jobs (4-5 hours) ✅
- [x] Implement `PriceRefreshJob`
- [x] Implement `NetWorthSnapshotJob`
- [x] Implement `TspPriceRefreshJob`
- [x] Create manual refresh endpoint (`/api/accounts/{id}/refresh`)
- [x] Add refresh button to dashboard

### Phase 3: Net Worth Timeline (3-4 hours) ✅
- [x] Create timeline API endpoint (`/api/dashboard/net-worth/timeline`)
- [x] Build `NetWorthTimelineView` component (D3.js stacked area chart)
- [x] Add dashboard sparkline widget
- [x] Implement graceful empty state
- [x] Add routing (`/dashboard/net-worth`)

### Phase 4: Scheduler Admin Page (4-5 hours) ✅
- [x] Create scheduler API endpoints (`/api/admin/scheduler/*`)
- [x] Build `SchedulerAdminView` with MUI (746 lines)
- [x] Add to routing (`/admin/scheduler`)
- [x] Job status display with queue stats
- [x] Manual "Run Now" functionality
- [x] Schedule editing capability

### Phase 5: Polish & Testing (2-3 hours) ✅
- [x] Test with multiple users
- [x] Error handling and logging
- [x] Postman collection updated (v1.2.0)

**Completed: December 2025**

---

## Additional Deliverables (December 2025)

### TSP Detail Page ✅
- `TspDetailView` with full fund breakdown and prices
- `TspPositionsEditor` component for editing positions
- Navigation from dashboard TSP panel
- Prices from stored `TSPFundPrices` table (no external API calls on page load)

---

## Future Enhancements (Wave 10+)

### AI Analysis Jobs (Wave 12+)
```csharp
RecurringJob.AddOrUpdate<AiPortfolioAnalysisJob>(
    "weekly-ai-analysis",
    job => job.AnalyzeAllPortfoliosAsync(),
    Cron.Weekly(DayOfWeek.Sunday, 6) // Sunday 6 AM
);
```

### Email Notifications
- Staleness alerts
- Weekly portfolio summary
- AI recommendation digest

### Webhook Integrations
- Slack/Discord notifications
- Custom webhooks for job completion

---

## Dependencies

### NuGet Packages
```xml
<PackageReference Include="Hangfire.AspNetCore" Version="1.8.*" />
<PackageReference Include="Hangfire.PostgreSql" Version="1.20.*" />
```

### Environment Variables
```
HANGFIRE_DASHBOARD_USERNAME=admin
HANGFIRE_DASHBOARD_PASSWORD=<secure>
```

---

## Success Criteria

1. ✅ Hangfire dashboard accessible at `/hangfire`
2. ✅ Daily price refresh runs automatically (when API is running)
3. ✅ Net worth snapshots captured daily
4. ✅ Timeline shows historical data after 3+ days
5. ✅ Graceful empty state for new users
6. ✅ Scheduler admin page displays all jobs
7. ✅ Manual refresh works from dashboard
8. ✅ Test users and onboarding accounts are excluded from jobs

---

## Notes

- **Development Mode**: Jobs only run when API is running on laptop
- **Staleness alerts disabled** until production deployment
- **Account filtering** prevents test/dev data pollution
- **Idempotent snapshots** - safe to run multiple times per day

---

## Postman Collection Update

After completing Wave 10, update the Postman collection with all new endpoints:

### New Endpoints to Document
```
# Scheduler Admin API
GET  /api/admin/scheduler/jobs
GET  /api/admin/scheduler/jobs/{id}
POST /api/admin/scheduler/jobs/{id}/run
PUT  /api/admin/scheduler/jobs/{id}
GET  /api/admin/scheduler/queue
GET  /api/admin/scheduler/queue/{id}

# Manual Refresh
POST /api/accounts/{id}/refresh
POST /api/accounts/refresh-all

# Net Worth Timeline
GET /api/dashboard/net-worth/timeline?period=1Y
```

### Collection Update Checklist
- [ ] Add "Scheduler" folder to Postman collection
- [ ] Add "Net Worth Timeline" request
- [ ] Add "Manual Refresh" requests
- [ ] Update environment variables if needed
- [ ] Test all new endpoints in Postman
- [ ] Export updated collection to `PFMP-API/postman/`

---

## Related: AI Improvements

AI context improvements (expanding portfolio/TSP/risk analysis) are tracked in **Wave 13: AI Enhancement & Vetting**. See `docs/history/roadmap.md` for details.

**Already Implemented:**
- `GET /api/ai/preview/{userId}/{analysisType}` - Dry-run preview endpoint for debugging AI prompts

---

## Related: TSP Detail Page

A TSP detail page with fund editing capability is planned. Can be bundled with Wave 10 if time permits, otherwise deferred to Wave 11.

**See `docs/history/roadmap.md` → "TSP Detail Page & Editing" for full requirements.**

**Quick Summary:**
- Full-page TSP view at `/dashboard/tsp`
- Holdings table with all funds (G, F, C, S, I, L-funds)
- Edit units and contribution allocations post-onboarding
- Price refresh using DailyTspService
- Historical fund price charts
