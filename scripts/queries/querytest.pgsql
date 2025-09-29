-- querytest.pgsql
-- Simple ad‑hoc queries for PFMP development.
-- Run (PowerShell):
--   psql "postgresql://pfmp_user:MediaPword.1@192.168.1.108:5433/pfmp_dev" -f .\scripts\queries\querytest.pgsql
-- Or inside an interactive psql session: \i scripts/queries/querytest.pgsql

-- 1) Recent advice entries (newest first)
SELECT "UserId","Email" FROM "Users" ORDER BY "UserId" LIMIT 5;

-- 2) (Uncomment to get a quick total advice count)
-- SELECT COUNT(*) AS total_advice FROM "Advice";

-- 3) (Uncomment to preview first users)
-- SELECT "UserId", "Email", "FirstName", "LastName" FROM "Users" ORDER BY "UserId" LIMIT 5;

-- 4) Advice count per user (top 10 users by advice volume)
-- SELECT "UserId", COUNT(*) AS advice_count
-- FROM "Advice"
-- GROUP BY "UserId"
-- ORDER BY advice_count DESC, "UserId"
-- LIMIT 10;

-- 5) Most recent advice full text for a specific user (change :user_id)
-- SELECT "AdviceId", "CreatedAt", LEFT("ConsensusText", 400) || CASE WHEN length("ConsensusText") > 400 THEN '...' ELSE '' END AS preview
-- FROM "Advice" WHERE "UserId" = 1
-- ORDER BY "CreatedAt" DESC
-- LIMIT 5;

-- 6) Basic stats snapshot (users, advice)
-- SELECT 'users' AS entity, COUNT(*) AS total FROM "Users"
-- UNION ALL
-- SELECT 'advice' AS entity, COUNT(*) FROM "Advice";

-- 7) Advice created today (UTC)
-- SELECT COUNT(*) AS advice_today
-- FROM "Advice"
-- WHERE "CreatedAt" >= date_trunc('day', now() AT TIME ZONE 'utc');

-- 8) Oldest vs newest advice timestamps
-- SELECT MIN("CreatedAt") AS first_advice, MAX("CreatedAt") AS latest_advice FROM "Advice";

-- 9) Delete ALL advice for a dev user (DANGEROUS – uncomment only if needed)
-- DELETE FROM "Advice" WHERE "UserId" = 1; -- then COMMIT;

-- 10) Vacuum hint (run manually if lots of deletes) – requires proper privileges
-- VACUUM (VERBOSE, ANALYZE) "Advice";

-- Notes:
--   Mixed‑case identifiers require double quotes (PostgreSQL treats unquoted names as lower-case).
--   Add additional exploratory queries below this line.
--   Use LEFT(column, n) for safe preview truncation in grid outputs.
--   Wrap destructive queries in a transaction if experimenting: BEGIN; ... ROLLBACK; (or COMMIT if satisfied).
