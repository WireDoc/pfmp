-- List first 20 users with key profile columns
SELECT "UserId","Email","FirstName","LastName","CreatedAt" 
FROM "Users"
ORDER BY "UserId"
LIMIT 20;