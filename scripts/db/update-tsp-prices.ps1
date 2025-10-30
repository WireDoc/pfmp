param(
    [string]$BaseUrl = "http://localhost:5052"
)

Write-Host "Fetching current TSP prices from FMP..." -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "$BaseUrl/api/market/tsp"

Write-Host "Building price record for database..." -ForegroundColor Cyan
$priceDate = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")  # Yesterday (last business day)

$priceRecord = @{
    PriceDate = $priceDate
    GFundPrice = $response.G_FUND.price
    FFundPrice = $response.F_FUND.price
    CFundPrice = $response.C_FUND.price
    SFundPrice = $response.S_FUND.price
    IFundPrice = $response.I_FUND.price
    LIncomeFundPrice = $response.L_INCOME.price
    L2030FundPrice = $response.L_2030.price
    L2035FundPrice = $response.L_2035.price
    L2040FundPrice = $response.L_2040.price
    L2045FundPrice = $response.L_2045.price
    L2050FundPrice = $response.L_2050.price
    L2055FundPrice = $response.L_2055.price
    L2060FundPrice = $response.L_2060.price
    L2065FundPrice = $response.L_2065.price
    L2070FundPrice = $response.L_2070.price
    L2075FundPrice = $response.L_2075.price
    DataSource = "FMP_API"
}

Write-Host "`nPrices to insert:" -ForegroundColor Yellow
Write-Host "  Date: $priceDate"
Write-Host "  G Fund: $($priceRecord.GFundPrice)"
Write-Host "  F Fund: $($priceRecord.FFundPrice)"
Write-Host "  C Fund: $($priceRecord.CFundPrice)"
Write-Host "  S Fund: $($priceRecord.SFundPrice)"
Write-Host "  I Fund: $($priceRecord.IFundPrice)"
Write-Host "  L2050: $($priceRecord.L2050FundPrice)"

# Insert via direct database connection using Npgsql
Write-Host "`nInserting into database..." -ForegroundColor Cyan

Add-Type -Path "C:\Users\chuck\.nuget\packages\npgsql\9.0.1\lib\net8.0\Npgsql.dll"

$connString = "Host=192.168.1.108;Port=5433;Database=pfmp_dev;Username=pfmp_user;Password=MediaPword.1"
$conn = New-Object Npgsql.NpgsqlConnection($connString)
$conn.Open()

$sql = @"
INSERT INTO "TSPFundPrices" (
    "PriceDate", "GFundPrice", "FFundPrice", "CFundPrice", "SFundPrice", "IFundPrice",
    "LIncomeFundPrice", "L2030FundPrice", "L2035FundPrice", "L2040FundPrice", "L2045FundPrice",
    "L2050FundPrice", "L2055FundPrice", "L2060FundPrice", "L2065FundPrice", "L2070FundPrice",
    "L2075FundPrice", "CreatedAt", "DataSource"
)
VALUES (
    @p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12, @p13, @p14, @p15, @p16, NOW(), @p17
)
"@

$cmd = $conn.CreateCommand()
$cmd.CommandText = $sql
$cmd.Parameters.AddWithValue("p0", $priceDate) | Out-Null
$cmd.Parameters.AddWithValue("p1", $priceRecord.GFundPrice) | Out-Null
$cmd.Parameters.AddWithValue("p2", $priceRecord.FFundPrice) | Out-Null
$cmd.Parameters.AddWithValue("p3", $priceRecord.CFundPrice) | Out-Null
$cmd.Parameters.AddWithValue("p4", $priceRecord.SFundPrice) | Out-Null
$cmd.Parameters.AddWithValue("p5", $priceRecord.IFundPrice) | Out-Null
$cmd.Parameters.AddWithValue("p6", $priceRecord.LIncomeFundPrice) | Out-Null
$cmd.Parameters.AddWithValue("p7", $priceRecord.L2030FundPrice) | Out-Null
$cmd.Parameters.AddWithValue("p8", $priceRecord.L2035FundPrice) | Out-Null
$cmd.Parameters.AddWithValue("p9", $priceRecord.L2040FundPrice) | Out-Null
$cmd.Parameters.AddWithValue("p10", $priceRecord.L2045FundPrice) | Out-Null
$cmd.Parameters.AddWithValue("p11", $priceRecord.L2050FundPrice) | Out-Null
$cmd.Parameters.AddWithValue("p12", $priceRecord.L2055FundPrice) | Out-Null
$cmd.Parameters.AddWithValue("p13", $priceRecord.L2060FundPrice) | Out-Null
$cmd.Parameters.AddWithValue("p14", $priceRecord.L2065FundPrice) | Out-Null
$cmd.Parameters.AddWithValue("p15", $priceRecord.L2070FundPrice) | Out-Null
$cmd.Parameters.AddWithValue("p16", $priceRecord.L2075FundPrice) | Out-Null
$cmd.Parameters.AddWithValue("p17", $priceRecord.DataSource) | Out-Null

$rowsAffected = $cmd.ExecuteNonQuery()
$conn.Close()

Write-Host "`nSuccessfully inserted TSP prices! ($rowsAffected row)" -ForegroundColor Green
