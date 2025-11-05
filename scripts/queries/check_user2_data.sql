-- Check what data User 2 has across all tables
SELECT 'Accounts' as table_name, COUNT(*) as count FROM "Accounts" WHERE "UserId" = 2
UNION ALL
SELECT 'CashAccounts', COUNT(*) FROM "CashAccounts" WHERE "UserId" = 2
UNION ALL
SELECT 'Transactions', COUNT(*) FROM "Transactions" WHERE "UserId" = 2
UNION ALL
SELECT 'Holdings', COUNT(*) FROM "Holdings" WHERE "UserId" = 2
UNION ALL
SELECT 'Advice', COUNT(*) FROM "Advice" WHERE "UserId" = 2
UNION ALL
SELECT 'Alerts', COUNT(*) FROM "Alerts" WHERE "UserId" = 2
UNION ALL
SELECT 'Tasks', COUNT(*) FROM "Tasks" WHERE "UserId" = 2
UNION ALL
SELECT 'TSPSnapshots', COUNT(*) FROM "TSPSnapshots" WHERE "UserId" = 2
ORDER BY table_name;
