-- Update Holdings table with correct units from TspLifecyclePositions table
-- L2050: 6380.705981 units
-- S Fund: 650.006999 units

UPDATE "Holdings"
SET 
    "Quantity" = 6380.705981,
    "UpdatedAt" = NOW(),
    "LastPriceUpdate" = NOW()
WHERE "AccountId" = 4 AND "Symbol" = 'L2050';

UPDATE "Holdings"
SET 
    "Quantity" = 650.006999,
    "UpdatedAt" = NOW(),
    "LastPriceUpdate" = NOW()
WHERE "AccountId" = 4 AND "Symbol" = 'S';

-- Update Account balance to match holdings total
UPDATE "Accounts"
SET 
    "CurrentBalance" = (
        SELECT SUM("Quantity" * "CurrentPrice")
        FROM "Holdings"
        WHERE "AccountId" = 4
    ),
    "UpdatedAt" = NOW(),
    "LastBalanceUpdate" = NOW()
WHERE "AccountId" = 4;

-- Verify corrected holdings
SELECT 
    h."Symbol",
    h."Name",
    h."Quantity",
    h."CurrentPrice",
    ROUND(h."Quantity" * h."CurrentPrice", 2) as "Current Value",
    ROUND(((h."Quantity" * h."CurrentPrice") / 
           (SELECT SUM("Quantity" * "CurrentPrice") 
            FROM "Holdings" 
            WHERE "AccountId" = 4)) * 100, 2) as "Portfolio %"
FROM "Holdings" h
WHERE h."AccountId" = 4
ORDER BY (h."Quantity" * h."CurrentPrice") DESC;

-- Show updated account balance
SELECT 
    "AccountName",
    "CurrentBalance" as "TSP Balance"
FROM "Accounts"
WHERE "AccountId" = 4;
