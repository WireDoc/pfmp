# Seed transactions for User 20's cash accounts
# Creates Accounts entries and realistic transaction history

$ErrorActionPreference = "Stop"

Write-Host "Seeding transactions for User 20..." -ForegroundColor Cyan

# Database connection (from instructions.md)
$env:PGPASSWORD = "MediaPword.1"
$dbHost = "192.168.1.108"
$dbPort = "5433"
$dbName = "pfmp_dev"
$dbUser = "pfmp_user"

function Invoke-PgQuery {
    param($Query)
    # Build connection string
    $connStr = "postgresql://${dbUser}:${env:PGPASSWORD}@${dbHost}:${dbPort}/${dbName}"
    
    # Create temp file with query to avoid quoting issues
    $tempFile = [System.IO.Path]::GetTempFileName()
    $Query | Out-File -FilePath $tempFile -Encoding utf8 -NoNewline
    
    try {
        $result = & psql $connStr -t -A -f $tempFile 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Query failed: $result"
        }
        return $result
    } finally {
        Remove-Item $tempFile -ErrorAction SilentlyContinue
    }
}

# Step 1: Create Accounts entries for our CashAccounts (if they don't exist)
Write-Host "`nStep 1: Creating Accounts entries for CashAccounts..." -ForegroundColor Yellow

$accounts = @(
    @{
        Name = "Primary Checking (Chase)"
        Type = 6  # Checking
        Institution = "Chase Bank"
        Balance = 5420.50
        InterestRate = 0.0001
        IsEmergencyFund = $false
        Purpose = "Daily expenses and bill payments"
    },
    @{
        Name = "High-Yield Savings (Ally)"
        Type = 7  # Savings
        Institution = "Ally Bank"
        Balance = 25340.75
        InterestRate = 0.0435
        IsEmergencyFund = $true
        Purpose = "Emergency fund - 6 months expenses"
    },
    @{
        Name = "Money Market (Vanguard)"
        Type = 8  # Money Market
        Institution = "Vanguard"
        Balance = 12500.00
        InterestRate = 0.0520
        IsEmergencyFund = $false
        Purpose = "Short-term savings and opportunities"
    }
)

$accountIds = @()

foreach ($acct in $accounts) {
    # Check if account already exists
    $existing = Invoke-PgQuery "SELECT ""AccountId"" FROM ""Accounts"" WHERE ""UserId"" = 20 AND ""AccountName"" = '$($acct.Name)' AND ""IsActive"" = true;"
    
    if ($existing) {
        Write-Host "  Account '$($acct.Name)' already exists (ID: $existing)" -ForegroundColor Gray
        $accountIds += [int]$existing
    } else {
        # Insert new account
        $insertQuery = @"
INSERT INTO "Accounts" (
    "UserId", "AccountName", "AccountType", "Category", "Institution", 
    "CurrentBalance", "InterestRate", "IsEmergencyFund", "Purpose",
    "IsActive", "CreatedAt", "UpdatedAt", "LastBalanceUpdate"
) VALUES (
    20, '$($acct.Name)', $($acct.Type), 4, '$($acct.Institution)',
    $($acct.Balance), $($acct.InterestRate), $($acct.IsEmergencyFund), '$($acct.Purpose)',
    true, NOW(), NOW(), NOW()
) RETURNING "AccountId";
"@
        $newId = Invoke-PgQuery $insertQuery
        Write-Host "  Created account '$($acct.Name)' with ID: $newId" -ForegroundColor Green
        $accountIds += [int]$newId
    }
}

Write-Host "`nAccount IDs: $($accountIds -join ', ')" -ForegroundColor Cyan

# Step 2: Seed transactions for Primary Checking (most activity)
Write-Host "`nStep 2: Seeding transactions for Primary Checking..." -ForegroundColor Yellow

$checkingId = $accountIds[0]
$transactionCount = 0

# Helper function to insert transaction
function Add-Transaction {
    param($AccountId, $Type, $Amount, $Description, $Date, $Category = $null, $CheckNumber = $null, $Fee = 0)
    
    $categoryStr = if ($Category) { "'$Category'" } else { "NULL" }
    $checkStr = if ($CheckNumber) { "'$CheckNumber'" } else { "NULL" }
    
    $query = @"
INSERT INTO "Transactions" (
    "AccountId", "TransactionType", "Amount", "TransactionDate", 
    "Description", "Category", "CheckNumber", "Fee", "CreatedAt"
) VALUES (
    $AccountId, $Type, $Amount, '$Date', '$Description', $categoryStr, $checkStr, $Fee, NOW()
);
"@
    Invoke-PgQuery $query | Out-Null
    $script:transactionCount++
}

# Generate 60 days of checking transactions
$startDate = (Get-Date).AddDays(-60)

# Salary deposits (bi-weekly)
for ($i = 0; $i -lt 5; $i++) {
    $date = $startDate.AddDays($i * 14).ToString("yyyy-MM-dd")
    Add-Transaction $checkingId 0 3250.00 "Direct Deposit - Salary" $date "Income"
}

# Rent/Mortgage (monthly)
Add-Transaction $checkingId 1 -1850.00 "Rent Payment" ($startDate.AddDays(5).ToString("yyyy-MM-dd")) "Housing" "1001"
Add-Transaction $checkingId 1 -1850.00 "Rent Payment" ($startDate.AddDays(35).ToString("yyyy-MM-dd")) "Housing" "1002"

# Utilities (recurring)
Add-Transaction $checkingId 1 -125.50 "Electric Bill" ($startDate.AddDays(8).ToString("yyyy-MM-dd")) "Utilities"
Add-Transaction $checkingId 1 -89.99 "Internet Service" ($startDate.AddDays(12).ToString("yyyy-MM-dd")) "Utilities"
Add-Transaction $checkingId 1 -132.75 "Electric Bill" ($startDate.AddDays(38).ToString("yyyy-MM-dd")) "Utilities"

# Groceries (weekly)
for ($i = 0; $i -lt 8; $i++) {
    $amount = -1 * (Get-Random -Minimum 75 -Maximum 185)
    $date = $startDate.AddDays(($i * 7) + (Get-Random -Minimum 0 -Maximum 2)).ToString("yyyy-MM-dd")
    $stores = @("Safeway", "Trader Joe's", "Whole Foods", "Giant")
    $store = $stores[(Get-Random -Maximum $stores.Count)]
    Add-Transaction $checkingId 1 $amount "$store - Groceries" $date "Groceries"
}

# Gas (every 10 days)
for ($i = 0; $i -lt 6; $i++) {
    $amount = -1 * (Get-Random -Minimum 45 -Maximum 75)
    $date = $startDate.AddDays($i * 10 + 3).ToString("yyyy-MM-dd")
    Add-Transaction $checkingId 1 $amount "Gas Station" $date "Transportation"
}

# Restaurants/Dining
$diningDays = @(2, 7, 14, 18, 25, 32, 38, 45, 51, 57)
foreach ($day in $diningDays) {
    $amount = -1 * (Get-Random -Minimum 25 -Maximum 95)
    $date = $startDate.AddDays($day).ToString("yyyy-MM-dd")
    $places = @("Chipotle", "Local Restaurant", "Pizza Place", "Thai Food", "Coffee Shop")
    $place = $places[(Get-Random -Maximum $places.Count)]
    Add-Transaction $checkingId 1 $amount $place $date "Dining"
}

# Entertainment
Add-Transaction $checkingId 1 -89.99 "Gym Membership" ($startDate.AddDays(10).ToString("yyyy-MM-dd")) "Health"
Add-Transaction $checkingId 1 -45.00 "Movie Tickets" ($startDate.AddDays(22).ToString("yyyy-MM-dd")) "Entertainment"
Add-Transaction $checkingId 1 -89.99 "Gym Membership" ($startDate.AddDays(40).ToString("yyyy-MM-dd")) "Health"

# Transfers to savings
Add-Transaction $checkingId 2 -500.00 "Transfer to Savings" ($startDate.AddDays(16).ToString("yyyy-MM-dd")) "Transfer"
Add-Transaction $checkingId 2 -500.00 "Transfer to Savings" ($startDate.AddDays(44).ToString("yyyy-MM-dd")) "Transfer"

# Miscellaneous
Add-Transaction $checkingId 1 -32.50 "Pharmacy" ($startDate.AddDays(11).ToString("yyyy-MM-dd")) "Healthcare"
Add-Transaction $checkingId 1 -125.00 "Car Insurance" ($startDate.AddDays(15).ToString("yyyy-MM-dd")) "Insurance"
Add-Transaction $checkingId 1 -78.45 "Amazon Purchase" ($startDate.AddDays(28).ToString("yyyy-MM-dd")) "Shopping"
Add-Transaction $checkingId 1 -42.00 "Haircut" ($startDate.AddDays(35).ToString("yyyy-MM-dd")) "Personal Care"
Add-Transaction $checkingId 1 -15.99 "Netflix" ($startDate.AddDays(20).ToString("yyyy-MM-dd")) "Entertainment"
Add-Transaction $checkingId 1 -12.99 "Spotify" ($startDate.AddDays(20).ToString("yyyy-MM-dd")) "Entertainment"

# ATM withdrawals
Add-Transaction $checkingId 1 -100.00 "ATM Withdrawal" ($startDate.AddDays(5).ToString("yyyy-MM-dd")) "Cash" $null 2.50
Add-Transaction $checkingId 1 -60.00 "ATM Withdrawal" ($startDate.AddDays(30).ToString("yyyy-MM-dd")) "Cash" $null 2.50

Write-Host "  Added $transactionCount transactions to Primary Checking" -ForegroundColor Green

# Step 3: Seed transactions for High-Yield Savings
Write-Host "`nStep 3: Seeding transactions for High-Yield Savings..." -ForegroundColor Yellow

$savingsId = $accountIds[1]
$transactionCount = 0

# Deposits from checking
Add-Transaction $savingsId 0 500.00 "Transfer from Checking" ($startDate.AddDays(16).ToString("yyyy-MM-dd")) "Transfer"
Add-Transaction $savingsId 0 500.00 "Transfer from Checking" ($startDate.AddDays(44).ToString("yyyy-MM-dd")) "Transfer"

# Interest payments (monthly)
Add-Transaction $savingsId 0 91.87 "Interest Payment" ($startDate.AddDays(30).ToString("yyyy-MM-dd")) "Interest"
Add-Transaction $savingsId 0 92.56 "Interest Payment" ($startDate.AddDays(60).ToString("yyyy-MM-dd")) "Interest"

# One-time large deposit
Add-Transaction $savingsId 0 5000.00 "Tax Refund Deposit" ($startDate.AddDays(20).ToString("yyyy-MM-dd")) "Income"

# Emergency withdrawal
Add-Transaction $savingsId 1 -1200.00 "Emergency Car Repair" ($startDate.AddDays(42).ToString("yyyy-MM-dd")) "Emergency"

Write-Host "  Added $transactionCount transactions to High-Yield Savings" -ForegroundColor Green

# Step 4: Seed transactions for Money Market
Write-Host "`nStep 4: Seeding transactions for Money Market..." -ForegroundColor Yellow

$moneyMarketId = $accountIds[2]
$transactionCount = 0

# Initial deposit
Add-Transaction $moneyMarketId 0 10000.00 "Initial Deposit" ($startDate.AddDays(-30).ToString("yyyy-MM-dd")) "Transfer"

# Additional deposits
Add-Transaction $moneyMarketId 0 2000.00 "Bonus Deposit" ($startDate.AddDays(10).ToString("yyyy-MM-dd")) "Income"

# Interest payments (monthly, higher rate)
Add-Transaction $moneyMarketId 0 43.33 "Interest Payment" ($startDate.AddDays(30).ToString("yyyy-MM-dd")) "Interest"
Add-Transaction $moneyMarketId 0 53.95 "Interest Payment" ($startDate.AddDays(60).ToString("yyyy-MM-dd")) "Interest"

# Withdrawal for investment opportunity
Add-Transaction $moneyMarketId 1 -500.00 "Investment Transfer" ($startDate.AddDays(25).ToString("yyyy-MM-dd")) "Investment"

Write-Host "  Added $transactionCount transactions to Money Market" -ForegroundColor Green

# Step 5: Verify final balances
Write-Host "`nStep 5: Verifying balances..." -ForegroundColor Yellow

foreach ($id in $accountIds) {
    $balance = Invoke-PgQuery "SELECT SUM(""Amount"") FROM ""Transactions"" WHERE ""AccountId"" = $id;"
    $name = Invoke-PgQuery "SELECT ""AccountName"" FROM ""Accounts"" WHERE ""AccountId"" = $id;"
    Write-Host "  $name : Balance from transactions = `$$balance" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Transaction seeding complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Account IDs for testing:" -ForegroundColor Cyan
Write-Host "  Primary Checking: $($accountIds[0])" -ForegroundColor White
Write-Host "  High-Yield Savings: $($accountIds[1])" -ForegroundColor White
Write-Host "  Money Market: $($accountIds[2])" -ForegroundColor White
