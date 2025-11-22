# Rebuild Account 48 Holdings via INITIAL_BALANCE Transactions
# This script demonstrates the new Holdings/Transactions synchronization

$headers = @{ "Content-Type" = "application/json" }
$apiUrl = "http://localhost:5052/api/transactions"

Write-Host "Creating INITIAL_BALANCE transactions for Account 48..." -ForegroundColor Cyan
Write-Host ""

# Helper function to create transaction
function Create-InitialBalance {
    param($symbol, $name, $quantity, $price, $date)
    
    $body = @{
        accountId = 48
        transactionType = "INITIAL_BALANCE"
        symbol = $symbol
        quantity = $quantity
        price = $price
        amount = -1 * ($quantity * $price)
        transactionDate = $date
        settlementDate = $date
        isTaxable = $true
        notes = "Initial portfolio onboarding - $name"
    } | ConvertTo-Json
    
    try {
        $result = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $body
        Write-Host "✓ $symbol : $quantity shares @ `$$price = `$$($quantity * $price)" -ForegroundColor Green
        return $result
    } catch {
        Write-Host "✗ $symbol : Failed - $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Create transactions based on original holdings
Create-InitialBalance -symbol "VOO" -name "Vanguard S&P 500 ETF" -quantity 80 -price 390.00 -date "2024-01-15T10:00:00Z"
Create-InitialBalance -symbol "VEA" -name "Vanguard FTSE Developed Markets ETF" -quantity 120 -price 44.00 -date "2024-02-10T10:00:00Z"
Create-InitialBalance -symbol "MUB" -name "iShares National Muni Bond ETF" -quantity 100 -price 106.00 -date "2024-03-05T10:00:00Z"
Create-InitialBalance -symbol "VIG" -name "Vanguard Dividend Appreciation ETF" -quantity 90 -price 152.00 -date "2024-03-20T10:00:00Z"
Create-InitialBalance -symbol "BTC-USD" -name "Bitcoin" -quantity 0.5 -price 42000.00 -date "2024-04-01T10:00:00Z"
Create-InitialBalance -symbol "ETH-USD" -name "Ethereum" -quantity 5.0 -price 2100.00 -date "2024-04-15T10:00:00Z"
Create-InitialBalance -symbol "NVDA" -name "NVIDIA Corporation" -quantity 40 -price 430.00 -date "2024-05-01T10:00:00Z"

Write-Host ""
Write-Host "Verifying Holdings were auto-created..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

# Query holdings to verify
$holdings = Invoke-RestMethod -Uri "http://localhost:5052/api/holdings?accountId=48" -Method GET
Write-Host ""
Write-Host "Holdings Count: $($holdings.Count)" -ForegroundColor Yellow
$holdings | Select-Object symbol, quantity, averageCostBasis | Format-Table -AutoSize

Write-Host ""
Write-Host "✓ Holdings/Transactions synchronization complete!" -ForegroundColor Green
