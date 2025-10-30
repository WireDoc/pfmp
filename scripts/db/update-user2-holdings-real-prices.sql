-- Update User 2's TSP Holdings with REAL prices from DailyTSP API
-- User 2 (UserId=2) has TSP Account (AccountId=4) with L2050 and S Fund

-- Update L 2050 Fund holding with REAL price
UPDATE "Holdings"
SET "CurrentPrice" = 41.3608,
    "UpdatedAt" = NOW(),
    "LastPriceUpdate" = NOW()
WHERE "AccountId" = 4
  AND "Symbol" = 'L2050';

-- Update S Fund holding with REAL price  
UPDATE "Holdings"
SET "CurrentPrice" = 102.1952,
    "UpdatedAt" = NOW(),
    "LastPriceUpdate" = NOW()
WHERE "AccountId" = 4
  AND "Symbol" = 'S';

-- Calculate new portfolio values
-- L2050: 6380.705981 units × $41.3608 = $263,917.91
-- S Fund: 650.006999 units × $102.1952 = $66,423.40
-- Total: $330,341.31

-- Display User 2's updated TSP holdings
SELECT 
    h."HoldingId",
    h."Symbol",
    h."Quantity",
    h."CurrentPrice",
    h."Quantity" * h."CurrentPrice" AS "CurrentValue",
    ROUND((h."Quantity" * h."CurrentPrice" / 
        (SELECT SUM("Quantity" * "CurrentPrice") 
         FROM "Holdings" 
         WHERE "AccountId" = 4)) * 100, 2) AS "PercentOfPortfolio"
FROM "Holdings" h
WHERE h."AccountId" = 4
ORDER BY "CurrentValue" DESC;

-- Show total portfolio value
SELECT 
    a."AccountId",
    a."AccountName",
    SUM(h."Quantity" * h."CurrentPrice") AS "TotalValue"
FROM "Accounts" a
JOIN "Holdings" h ON a."AccountId" = h."AccountId"
WHERE a."AccountId" = 4
GROUP BY a."AccountId", a."AccountName";
