-- Update TSP Fund Prices with REAL prices from DailyTSP API (2025-10-28)
-- Replacing incorrect FMP proxy ETF prices

-- Delete old incorrect prices
DELETE FROM "TSPFundPrices" WHERE "PriceDate" = '2025-10-28';

-- Insert real TSP prices from DailyTSP API
INSERT INTO "TSPFundPrices" (
    "PriceDate",
    "GFundPrice",
    "FFundPrice", 
    "CFundPrice",
    "SFundPrice",
    "IFundPrice",
    "LIncomeFundPrice",
    "L2030FundPrice",
    "L2035FundPrice",
    "L2040FundPrice",
    "L2045FundPrice",
    "L2050FundPrice",
    "L2055FundPrice",
    "L2060FundPrice",
    "L2065FundPrice",
    "L2070FundPrice",
    "L2075FundPrice",
    "CreatedAt",
    "DataSource"
) VALUES (
    '2025-10-28',
    19.4451,    -- G Fund (was 60.415 from FMP - WRONG)
    20.959,     -- F Fund
    109.9811,   -- C Fund (was 164.49 from FMP - WRONG)
    102.1952,   -- S Fund (was 123.45 from FMP proxy VSMAX - WRONG)
    54.0762,    -- I Fund
    29.0602,    -- L Income
    57.779,     -- L 2030
    17.5878,    -- L 2035
    67.4507,    -- L 2040
    18.6672,    -- L 2045
    41.3608,    -- L 2050 (was 60.30 from FMP proxy VFIFX - WRONG)
    21.3292,    -- L 2055
    21.327,     -- L 2060
    21.3246,    -- L 2065
    12.6389,    -- L 2070
    11.0402,    -- L 2075
    NOW(),
    'DailyTSP_API'
);

-- Verify the insert
SELECT * FROM "TSPFundPrices" WHERE "PriceDate" = '2025-10-28';
