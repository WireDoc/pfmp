# Seed cash accounts and transactions for user 20
# Run this with backend server running on port 5052

$baseUrl = "http://localhost:5052"
$userId = 20

Write-Host "Creating cash accounts for user $userId..." -ForegroundColor Cyan

# Account 1: Primary Checking (already created)
$account1Id = "71d71082-1e50-4c3a-9f21-2f05b1cfcf82"
Write-Host "Account 1 (Primary Checking): $account1Id" -ForegroundColor Green

# Account 2: High-Yield Savings
$body2 = @{
    userId = $userId
    institution = "Ally Bank"
    nickname = "High-Yield Savings"
    accountType = "savings"
    balance = 25340.75
    interestRateApr = 4.35
    purpose = "Emergency fund - 6 months expenses"
    isEmergencyFund = $true
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/api/CashAccounts" -Method Post -Body $body2 -ContentType 'application/json'
    $account2Id = $response2.cashAccountId
    Write-Host "Account 2 (High-Yield Savings): $account2Id" -ForegroundColor Green
} catch {
    Write-Host "Error creating account 2: $_" -ForegroundColor Red
    exit 1
}

# Account 3: Money Market
$body3 = @{
    userId = $userId
    institution = "Vanguard"
    nickname = "Money Market Fund"
    accountType = "money_market"
    balance = 12500.00
    interestRateApr = 5.20
    purpose = "Short-term savings for planned purchases"
    isEmergencyFund = $false
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri "$baseUrl/api/CashAccounts" -Method Post -Body $body3 -ContentType 'application/json'
    $account3Id = $response3.cashAccountId
    Write-Host "Account 3 (Money Market): $account3Id" -ForegroundColor Green
} catch {
    Write-Host "Error creating account 3: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nCash accounts created successfully!" -ForegroundColor Green
Write-Host "Account IDs:" -ForegroundColor Yellow
Write-Host "  1. Primary Checking: $account1Id"
Write-Host "  2. High-Yield Savings: $account2Id"
Write-Host "  3. Money Market: $account3Id"

# Now seed transactions via database
Write-Host "`nSeeding transactions via database..." -ForegroundColor Cyan

# Note: We need to insert into Accounts table first (old schema) to link transactions
# Then add transactions to demonstrate the new features

Write-Host "`nTo add transactions, run the SQL seeding script next." -ForegroundColor Yellow
Write-Host "Script complete!" -ForegroundColor Green

# Return account IDs for use in SQL script
return @{
    Account1 = $account1Id
    Account2 = $account2Id
    Account3 = $account3Id
}
