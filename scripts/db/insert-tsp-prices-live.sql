-- TSP Fund Prices from FMP API
-- Generated: 2025-10-29 11:00:43
-- Price Date: 2025-10-28 (last business day)

INSERT INTO \"TSPFundPrices\" (
    \"PriceDate\",
    \"GFundPrice\", \"FFundPrice\", \"CFundPrice\", \"SFundPrice\", \"IFundPrice\",
    \"LIncomeFundPrice\", \"L2030FundPrice\", \"L2035FundPrice\", \"L2040FundPrice\",
    \"L2045FundPrice\", \"L2050FundPrice\", \"L2055FundPrice\", \"L2060FundPrice\",
    \"L2065FundPrice\", \"L2070FundPrice\", \"L2075FundPrice\",
    \"CreatedAt\", \"DataSource\"
)
VALUES (
    '2025-10-28'::date,
    60.4188, 9.87, 164.49,
    123.45, 40.53,
    14.29, 43.99, 28.14,
    51.21, 35.5, 60.3,
    67.28, 62, 40.68,
    32.27, 99.44,
    NOW(), 'FMP_API'
);

-- Verify insertion
SELECT * FROM \"TSPFundPrices\" ORDER BY \"CreatedAt\" DESC LIMIT 1;
