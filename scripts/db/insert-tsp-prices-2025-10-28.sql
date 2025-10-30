-- Insert current TSP fund prices from FMP API (October 29, 2025)
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
)
VALUES (
    '2025-10-28',  -- Price date (last business day)
    60.415,        -- G Fund
    9.87,          -- F Fund
    164.49,        -- C Fund
    123.45,        -- S Fund
    76.69,         -- I Fund
    24.11,         -- L Income
    56.88,         -- L 2030
    60.04,         -- L 2035
    61.93,         -- L 2040
    62.16,         -- L 2045
    60.30,         -- L 2050
    64.84,         -- L 2055
    65.95,         -- L 2060
    66.03,         -- L 2065
    64.13,         -- L 2070
    61.91,         -- L 2075
    NOW(),
    'FMP_API'
);
