-- =============================================================================
-- cleanup-test-properties.sql
-- Purpose: Purge integration-test Property fixtures from pfmp_dev that were
--          leaking from PropertiesControllerTests into the shared dev database
--          and triggering the monthly RentCast valuation job to exhaust quota.
-- Created: 2026-05-01
-- Usage:   psql "postgresql://pfmp_user:MediaPword.1@192.168.1.108:5433/pfmp_dev" -f cleanup-test-properties.sql
-- Safety:  Wrapped in a transaction. Review SELECT counts before COMMIT.
-- =============================================================================

BEGIN;

-- 1. Identify candidate test properties (hardcoded names from PropertiesControllerTests
--    PLUS any property owned by a flagged test account with a *@local email).
WITH test_props AS (
    SELECT p."PropertyId", p."UserId", p."PropertyName"
    FROM "Properties" p
    LEFT JOIN "Users" u ON u."UserId" = p."UserId"
    WHERE p."PropertyName" IN (
              'Test Home',
              'Detail Test',
              'Mortgage Details Test',
              'Valuation Fields Test',
              'Quail Hollow'
          )
       OR u."IsTestAccount" = true
       OR u."Email" LIKE '%@local'
)
SELECT
    'Properties to delete' AS metric,
    COUNT(*) AS count
FROM test_props
UNION ALL
SELECT
    'PropertyValueHistory rows to delete',
    COUNT(*)
FROM "PropertyValueHistory" h
WHERE h."PropertyId" IN (SELECT "PropertyId" FROM test_props);

-- 2. Delete dependent value-history rows first (FK cascade may already handle this,
--    but explicit is safer).
DELETE FROM "PropertyValueHistory"
WHERE "PropertyId" IN (
    SELECT p."PropertyId"
    FROM "Properties" p
    LEFT JOIN "Users" u ON u."UserId" = p."UserId"
    WHERE p."PropertyName" IN (
              'Test Home',
              'Detail Test',
              'Mortgage Details Test',
              'Valuation Fields Test',
              'Quail Hollow'
          )
       OR u."IsTestAccount" = true
       OR u."Email" LIKE '%@local'
);

-- 3. Delete the test properties themselves.
DELETE FROM "Properties"
WHERE "PropertyId" IN (
    SELECT p."PropertyId"
    FROM "Properties" p
    LEFT JOIN "Users" u ON u."UserId" = p."UserId"
    WHERE p."PropertyName" IN (
              'Test Home',
              'Detail Test',
              'Mortgage Details Test',
              'Valuation Fields Test',
              'Quail Hollow'
          )
       OR u."IsTestAccount" = true
       OR u."Email" LIKE '%@local'
);

-- 4. Verify nothing left with AutoValuationEnabled=true above the safety cap.
SELECT
    'Remaining auto-valuation candidates' AS metric,
    COUNT(*) AS count
FROM "Properties"
WHERE "AutoValuationEnabled" = true;

-- Review the SELECT outputs above. If counts look right:
COMMIT;
-- Otherwise:
-- ROLLBACK;
