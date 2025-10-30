-- Update User 2's TSP Account balance to match real holdings value
UPDATE "Accounts"
SET "CurrentBalance" = (
    SELECT SUM("Quantity" * "CurrentPrice")
    FROM "Holdings"
    WHERE "AccountId" = 4
),
"UpdatedAt" = NOW(),
"LastBalanceUpdate" = NOW()
WHERE "AccountId" = 4;

-- Verify the update
SELECT 
    a."AccountId",
    a."AccountName",
    a."CurrentBalance" AS "AccountBalance",
    SUM(h."Quantity" * h."CurrentPrice") AS "HoldingsTotal",
    a."CurrentBalance" - SUM(h."Quantity" * h."CurrentPrice") AS "Difference"
FROM "Accounts" a
LEFT JOIN "Holdings" h ON a."AccountId" = h."AccountId"
WHERE a."AccountId" = 4
GROUP BY a."AccountId", a."AccountName", a."CurrentBalance";
