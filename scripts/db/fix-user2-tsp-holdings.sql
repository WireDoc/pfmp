-- Fix User 2's TSP Holdings - Should only have L2050 (75%) and S Fund (25%)
-- Based on TSP profile showing 75% lifecycle, 25% S Fund allocation

-- Step 1: Delete incorrect holdings
DELETE FROM "Holdings" WHERE "AccountId" = 4 AND "Symbol" IN ('G', 'F', 'C', 'I');

-- Step 2: Update L2050 and S Fund holdings with correct quantities
-- Assuming total TSP value of $185,000 from account balance
-- L2050: 75% = $138,750 / $60.30 per share = 2,301.24 units
-- S Fund: 25% = $46,250 / $123.45 per share = 374.75 units

UPDATE "Holdings"
SET 
    "Quantity" = 2301.24,
    "AverageCostBasis" = 55.00,
    "CurrentPrice" = 60.30,
    "UpdatedAt" = NOW(),
    "LastPriceUpdate" = NOW(),
    "Notes" = 'TSP L2050 - 75% allocation, target retirement 2050'
WHERE "AccountId" = 4 AND "Symbol" = 'L2050';

UPDATE "Holdings"
SET 
    "Quantity" = 374.75,
    "AverageCostBasis" = 115.00,
    "CurrentPrice" = 123.45,
    "UpdatedAt" = NOW(),
    "LastPriceUpdate" = NOW(),
    "Notes" = 'TSP S Fund - 25% allocation, small/mid cap stocks'
WHERE "AccountId" = 4 AND "Symbol" = 'S';

-- Step 3: Update Account balance to match holdings total
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

-- Step 4: Verify User 2's TSP holdings (should show only 2 funds)
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

-- Step 5: Show updated account balance
SELECT 
    "AccountName",
    "CurrentBalance" as "TSP Balance",
    (SELECT SUM("Quantity" * "CurrentPrice") FROM "Holdings" WHERE "AccountId" = 4) as "Holdings Total"
FROM "Accounts"
WHERE "AccountId" = 4;
