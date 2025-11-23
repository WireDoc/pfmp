# Generate synthetic price history for Account 48 holdings
# Creates realistic price movements with proper correlations

param(
    [string]$ConnectionString = "Host=192.168.1.108;Port=5433;Database=pfmp_dev;Username=pfmp_user;Password=pfmp_dev_password_2024",
    [int]$AccountId = 48
)

Write-Host "Generating price history for Account $AccountId..." -ForegroundColor Cyan

# Import Npgsql for PostgreSQL
Add-Type -Path "C:\Users\wired\.nuget\packages\npgsql\8.0.3\lib\net8.0\Npgsql.dll"

$conn = [Npgsql.NpgsqlConnection]::new($ConnectionString)
$conn.Open()

try {
    # Get holdings
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = 'SELECT "HoldingId", "Symbol", "CurrentPrice" FROM "Holdings" WHERE "AccountId" = @accountId ORDER BY "Symbol"'
    $cmd.Parameters.AddWithValue("accountId", $AccountId) | Out-Null
    $reader = $cmd.ExecuteReader()
    
    $holdings = @()
    while ($reader.Read()) {
        $holdings += @{
            HoldingId = $reader["HoldingId"]
            Symbol = $reader["Symbol"]
            CurrentPrice = [decimal]$reader["CurrentPrice"]
        }
    }
    $reader.Close()
    
    Write-Host "Found $($holdings.Count) holdings" -ForegroundColor Green
    
    # Generate price history from Jan 1, 2023 to Nov 22, 2025 (1056 days)
    $startDate = [DateTime]::new(2023, 1, 1)
    $endDate = [DateTime]::new(2025, 11, 22)
    $days = ($endDate - $startDate).Days
    
    Write-Host "Generating $days days of price data..." -ForegroundColor Cyan
    
    $insertCmd = $conn.CreateCommand()
    $insertCmd.CommandText = @'
INSERT INTO "PriceHistory" ("HoldingId", "Date", "Open", "High", "Low", "Close", "Volume")
VALUES (@holdingId, @date, @open, @high, @low, @close, @volume)
'@
    
    $totalInserts = 0
    
    foreach ($holding in $holdings) {
        Write-Host "  Processing $($holding.Symbol)..." -ForegroundColor Yellow
        
        $currentPrice = $holding.CurrentPrice
        
        # Calculate starting price (work backwards from current price with realistic growth)
        # Assume ~25% growth over 3 years for stocks/ETFs, more volatile for crypto
        $annualGrowthRate = switch -Wildcard ($holding.Symbol) {
            "*-USD" { 1.50 }  # Crypto: 50% annual (very volatile)
            "NVDA" { 1.35 }   # Tech stock: 35% annual
            default { 1.08 }  # ETFs/bonds: 8% annual
        }
        
        $yearsBack = 2.9
        $startPrice = $currentPrice / [Math]::Pow($annualGrowthRate, $yearsBack)
        
        # Volatility (daily std dev as % of price)
        $volatility = switch -Wildcard ($holding.Symbol) {
            "*-USD" { 0.04 }  # Crypto: 4% daily volatility
            "NVDA" { 0.025 }  # Tech: 2.5% daily
            "MUB" { 0.005 }   # Bonds: 0.5% daily
            default { 0.015 } # ETFs: 1.5% daily
        }
        
        $price = $startPrice
        $random = [Random]::new($holding.HoldingId * 1000) # Deterministic seed per holding
        
        for ($i = 0; $i -le $days; $i++) {
            $date = $startDate.AddDays($i)
            
            # Skip weekends
            if ($date.DayOfWeek -eq 'Saturday' -or $date.DayOfWeek -eq 'Sunday') {
                continue
            }
            
            # Generate daily return with drift toward target price
            $daysRemaining = $days - $i
            $targetDrift = if ($daysRemaining -gt 0) {
                ($currentPrice - $price) / $price / $daysRemaining
            } else { 0 }
            
            $randomReturn = ($random.NextDouble() - 0.5) * 2 * $volatility # -volatility to +volatility
            $dailyReturn = $targetDrift + $randomReturn
            
            $open = $price
            $close = $price * (1 + $dailyReturn)
            
            # High/Low with intraday volatility
            $intradayRange = $volatility * 0.5
            $high = [Math]::Max($open, $close) * (1 + $random.NextDouble() * $intradayRange)
            $low = [Math]::Min($open, $close) * (1 - $random.NextDouble() * $intradayRange)
            
            # Volume (random but realistic scale)
            $volume = [int64]([Math]::Round(1000000 + $random.Next(0, 5000000)))
            
            # Insert
            $insertCmd.Parameters.Clear()
            $insertCmd.Parameters.AddWithValue("holdingId", $holding.HoldingId) | Out-Null
            $insertCmd.Parameters.AddWithValue("date", $date.Date) | Out-Null
            $insertCmd.Parameters.AddWithValue("open", $open) | Out-Null
            $insertCmd.Parameters.AddWithValue("high", $high) | Out-Null
            $insertCmd.Parameters.AddWithValue("low", $low) | Out-Null
            $insertCmd.Parameters.AddWithValue("close", $close) | Out-Null
            $insertCmd.Parameters.AddWithValue("volume", $volume) | Out-Null
            
            $insertCmd.ExecuteNonQuery() | Out-Null
            $totalInserts++
            
            $price = $close
        }
        
        Write-Host "    Generated $(($days - [Math]::Floor($days * 2/7))) trading days" -ForegroundColor Green
    }
    
    Write-Host "`n✓ Successfully generated $totalInserts price records!" -ForegroundColor Green
    
} finally {
    $conn.Close()
}
