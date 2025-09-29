-- List recent advice items newest first
SELECT "AdviceId","UserId","Status","Theme","ConfidenceScore","CreatedAt"
FROM "Advice"
ORDER BY "CreatedAt" DESC
LIMIT 50;