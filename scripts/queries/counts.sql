-- Simple counts snapshot
SELECT 'users' AS entity, COUNT(*) AS total FROM "Users"
UNION ALL
SELECT 'advice' AS entity, COUNT(*) AS total FROM "Advice";