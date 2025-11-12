# Market Data Configuration - Future Task

## Issue
`MarketDataService` is logging warnings about missing Financial Modeling Prep (FMP) API key, even though one may exist in `appsettings.Development.local.json`.

```
warn: PFMP_API.Services.MarketDataService[0]
      Financial Modeling Prep API key not configured. Market data will use fallback values.
```

## Current State
- Service checks for `MarketData:FinancialModelingPrep:ApiKey` configuration
- Falls back to mock/fallback values when key is not found
- TSP data and dashboard calculations work correctly with fallback values
- No user-facing issues

## Root Cause
Configuration loading order or file not being loaded correctly. FMP API key may be in `appsettings.Development.local.json` but not being picked up by the configuration system.

## Resolution Plan
**Defer to Wave 9/10 (Live Account Linking & Market Data Integration)**

When implementing real-time market data features:
1. Verify `appsettings.Development.local.json` is loaded in `Program.cs`
2. Validate FMP API key configuration and loading
3. Test FMP API endpoints with proper error handling
4. Implement rate limiting for API calls
5. Add market data caching strategy
6. Create proper integration tests for market data service

## Why Deferred
- Not blocking any current functionality
- Fallback values working fine for development
- Proper testing context needed when implementing market data features
- Avoids scope creep in Wave 8.2

## Date Noted
2025-11-08

## Related Files
- `PFMP-API/Services/MarketDataService.cs` (line 69)
- `PFMP-API/appsettings.json` (has empty ApiKey)
- `PFMP-API/appsettings.Development.local.json` (gitignored, may contain actual key)
