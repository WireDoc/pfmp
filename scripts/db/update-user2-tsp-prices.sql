-- Step 1: Insert current TSP fund prices from FMP API (October 28, 2025)
INSERT INTO "TSPFundPrices" (
    "PriceDate",
    "GFundPrice", "FFundPrice", "CFundPrice", "SFundPrice", "IFundPrice",
    "LIncomeFundPrice", "L2030FundPrice", "L2035FundPrice", "L2040FundPrice",
    "L2045FundPrice", "L2050FundPrice", "L2055FundPrice", "L2060FundPrice",
    "L2065FundPrice", "L2070FundPrice", "L2075FundPrice",
    "CreatedAt", "DataSource"
)
VALUES (
    '2025-10-28'::date,
    60.415, 9.87, 164.49, 123.45, 40.53,
    24.11, 56.88, 60.04, 61.93, 62.16, 60.30,
    64.84, 65.95, 66.03, 64.13, 61.91,
    NOW(), 'FMP_API'
);

-- Step 2: Update Holdings table with current TSP fund prices
UPDATE "Holdings" 
SET 
    "CurrentPrice" = 60.415,
    "LastPriceUpdate" = NOW(),
    "UpdatedAt" = NOW()
WHERE "Symbol" = 'G' AND "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 2);

UPDATE "Holdings" 
SET 
    "CurrentPrice" = 9.87,
    "LastPriceUpdate" = NOW(),
    "UpdatedAt" = NOW()
WHERE "Symbol" = 'F' AND "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 2);

UPDATE "Holdings" 
SET 
    "CurrentPrice" = 164.49,
    "LastPriceUpdate" = NOW(),
    "UpdatedAt" = NOW()
WHERE "Symbol" = 'C' AND "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 2);

UPDATE "Holdings" 
SET 
    "CurrentPrice" = 123.45,
    "LastPriceUpdate" = NOW(),
    "UpdatedAt" = NOW()
WHERE "Symbol" = 'S' AND "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 2);

UPDATE "Holdings" 
SET 
    "CurrentPrice" = 40.53,
    "LastPriceUpdate" = NOW(),
    "UpdatedAt" = NOW()
WHERE "Symbol" = 'I' AND "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 2);

UPDATE "Holdings" 
SET 
    "CurrentPrice" = 60.30,
    "LastPriceUpdate" = NOW(),
    "UpdatedAt" = NOW()
WHERE "Symbol" = 'L2050' AND "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 2);

-- Step 3: Display User 2's TSP holdings with updated values and percentages
SELECT 
    h."Symbol",
    h."Name",
    h."Quantity",
    h."CurrentPrice",
    (h."Quantity" * h."CurrentPrice") as "Current Value",
    ROUND(((h."Quantity" * h."CurrentPrice") / 
           (SELECT SUM("Quantity" * "CurrentPrice") 
            FROM "Holdings" 
            WHERE "AccountId" = h."AccountId")) * 100, 2) as "Portfolio %"
FROM "Holdings" h
JOIN "Accounts" a ON h."AccountId" = a."AccountId"
WHERE a."UserId" = 2 
  AND a."AccountType" = 4  -- TSP account type (corrected)
ORDER BY (h."Quantity" * h."CurrentPrice") DESC;

-- Step 4: Show total TSP portfolio value
SELECT 
    a."AccountName",
    SUM(h."Quantity" * h."CurrentPrice") as "Total Portfolio Value",
    a."CurrentBalance" as "Stated Balance",
    a."CurrentBalance" - SUM(h."Quantity" * h."CurrentPrice") as "Difference"
FROM "Holdings" h
JOIN "Accounts" a ON h."AccountId" = a."AccountId"
WHERE a."UserId" = 2 AND a."AccountType" = 4
GROUP BY a."AccountId", a."AccountName", a."CurrentBalance";
