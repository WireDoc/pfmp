-- Seed holdings for User 2 (Michael Smith) to match account balances
-- TSP Account (AccountId=4): $185,000
-- Traditional IRA (AccountId=5): $45,000
-- Emergency Fund (AccountId=6): $30,000 cash (no holdings)

-- TSP Holdings (6 funds totaling $185,000)
INSERT INTO "Holdings" ("AccountId", "Symbol", "Name", "AssetType", "Quantity", "AverageCostBasis", "CurrentPrice", "IsQualifiedDividend", "IsLongTermCapitalGains", "CreatedAt", "UpdatedAt", "LastPriceUpdate", "Notes")
VALUES
-- G Fund (Government Securities): 5% = $9,250
(4, 'G', 'G Fund - Government Securities Investment Fund', 1, 500.00, 18.00, 18.50, false, true, NOW(), NOW(), NOW(), 'TSP G Fund - Stable government securities'),

-- F Fund (Fixed Income): 10% = $18,500
(4, 'F', 'F Fund - Fixed Income Index Investment Fund', 2, 963.54, 18.50, 19.20, false, true, NOW(), NOW(), NOW(), 'TSP F Fund - Bond index fund'),

-- C Fund (Common Stock): 45% = $83,250
(4, 'C', 'C Fund - Common Stock Index Investment Fund', 0, 974.71, 75.00, 85.40, false, true, NOW(), NOW(), NOW(), 'TSP C Fund - Tracks S&P 500'),

-- S Fund (Small Cap): 20% = $37,000
(4, 'S', 'S Fund - Small Capitalization Stock Index Investment Fund', 0, 878.01, 38.00, 42.15, false, true, NOW(), NOW(), NOW(), 'TSP S Fund - Small/mid cap stocks'),

-- I Fund (International): 10% = $18,500
(4, 'I', 'I Fund - International Stock Index Investment Fund', 0, 475.58, 36.50, 38.90, false, true, NOW(), NOW(), NOW(), 'TSP I Fund - International stocks'),

-- L 2050 Fund (Lifecycle): 10% = $18,500
(4, 'L2050', 'L 2050 Fund - Lifecycle Fund', 3, 643.48, 27.00, 28.75, false, true, NOW(), NOW(), NOW(), 'TSP Lifecycle 2050 - Target retirement 2050');

-- Traditional IRA Holdings (3 ETFs totaling $45,000)
INSERT INTO "Holdings" ("AccountId", "Symbol", "Name", "AssetType", "Quantity", "AverageCostBasis", "CurrentPrice", "IsQualifiedDividend", "IsLongTermCapitalGains", "CreatedAt", "UpdatedAt", "LastPriceUpdate", "Notes")
VALUES
-- VTI (Total Stock Market): 50% = $22,500
(5, 'VTI', 'Vanguard Total Stock Market ETF', 0, 100.00, 215.00, 225.00, true, true, NOW(), NOW(), NOW(), 'Total US stock market exposure'),

-- BND (Total Bond Market): 30% = $13,500
(5, 'BND', 'Vanguard Total Bond Market ETF', 2, 187.50, 70.00, 72.00, false, true, NOW(), NOW(), NOW(), 'Total US bond market exposure'),

-- VXUS (International Stock): 20% = $9,000
(5, 'VXUS', 'Vanguard Total International Stock ETF', 0, 150.00, 55.00, 60.00, true, true, NOW(), NOW(), NOW(), 'Total international stock exposure');

-- Verify totals (CurrentValue is computed column: Quantity * CurrentPrice)
SELECT 
    a."AccountName",
    a."CurrentBalance" as "Stated Balance",
    COALESCE(SUM(h."Quantity" * h."CurrentPrice"), 0) as "Holdings Total",
    a."CurrentBalance" - COALESCE(SUM(h."Quantity" * h."CurrentPrice"), 0) as "Difference"
FROM "Accounts" a
LEFT JOIN "Holdings" h ON a."AccountId" = h."AccountId"
WHERE a."UserId" = 2
GROUP BY a."AccountId", a."AccountName", a."CurrentBalance"
ORDER BY a."AccountId";
