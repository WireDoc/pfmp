-- Simple Full Clone: User 2 -> User 10
-- Only clones tables that actually have data for User 2

BEGIN;

-- 1. Update User 10 profile to match User 2
UPDATE "Users" SET 
    "FirstName" = u2."FirstName",
    "LastName" = u2."LastName",
    "RiskTolerance" = u2."RiskTolerance",
    "RetirementGoalAmount" = u2."RetirementGoalAmount",
    "TargetRetirementDate" = u2."TargetRetirementDate",
    "EmergencyFundTarget" = u2."EmergencyFundTarget",
    "AnnualIncome" = u2."AnnualIncome",
    "ProfileSetupComplete" = u2."ProfileSetupComplete",
    "SetupProgressPercentage" = u2."SetupProgressPercentage",
    "TransactionalAccountDesiredBalance" = u2."TransactionalAccountDesiredBalance",
    "LiquidityBufferMonths" = u2."LiquidityBufferMonths",
    "UpdatedAt" = NOW()
FROM "Users" u2
WHERE "Users"."UserId" = 10 AND u2."UserId" = 2;

-- 2. Clear existing User 10 data
DELETE FROM "Transactions" WHERE "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 10);
DELETE FROM "Holdings" WHERE "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 10);
DELETE FROM "Accounts" WHERE "UserId" = 10;
DELETE FROM "CashAccounts" WHERE "UserId" = 10;
DELETE FROM "TspProfiles" WHERE "UserId" = 10;
DELETE FROM "TspPositionSnapshots" WHERE "UserId" = 10;
DELETE FROM "FinancialProfileExpenses" WHERE "UserId" = 10;
DELETE FROM "FinancialProfileSectionStatuses" WHERE "UserId" = 10;
DELETE FROM "OnboardingProgress" WHERE "UserId" = 10;

-- 3. Create temp table for account ID mapping
CREATE TEMP TABLE acct_map (old_id INT, new_id INT);

-- 4. Clone Accounts with ID mapping
WITH ins AS (
    INSERT INTO "Accounts" ("UserId", "AccountName", "AccountType", "Category", "Institution", "CurrentBalance", "IsActive", "CreatedAt", "UpdatedAt")
    SELECT 10, "AccountName", "AccountType", "Category", "Institution", "CurrentBalance", "IsActive", NOW(), NOW()
    FROM "Accounts" WHERE "UserId" = 2
    RETURNING "AccountId", "AccountName"
)
INSERT INTO acct_map
SELECT a."AccountId", ins."AccountId"
FROM "Accounts" a
JOIN ins ON a."AccountName" = ins."AccountName"
WHERE a."UserId" = 2;

-- 5. Clone Holdings using account mapping
INSERT INTO "Holdings" ("AccountId", "Symbol", "Name", "AssetType", "Quantity", "AverageCostBasis", "CurrentPrice", "CreatedAt", "UpdatedAt")
SELECT m.new_id, h."Symbol", h."Name", h."AssetType", h."Quantity", h."AverageCostBasis", h."CurrentPrice", NOW(), NOW()
FROM "Holdings" h
JOIN acct_map m ON h."AccountId" = m.old_id;

-- 6. Clone Transactions using account mapping  
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "Description", "CreatedAt")
SELECT m.new_id, t."TransactionType", t."Amount", t."TransactionDate", t."Description", NOW()
FROM "Transactions" t
JOIN acct_map m ON t."AccountId" = m.old_id;

-- 7. Clone CashAccounts (with new UUIDs)
INSERT INTO "CashAccounts" ("CashAccountId", "UserId", "Nickname", "Institution", "AccountType", "Balance", "InterestRateApr", "IsEmergencyFund", "Purpose", "CreatedAt", "UpdatedAt")
SELECT gen_random_uuid(), 10, "Nickname", "Institution", "AccountType", "Balance", "InterestRateApr", "IsEmergencyFund", "Purpose", NOW(), NOW()
FROM "CashAccounts" WHERE "UserId" = 2;

-- 8. Clone TSP Profile
INSERT INTO "TspProfiles" ("UserId", "ContributionRatePercent", "EmployerMatchPercent", "GFundPercent", "FFundPercent", "CFundPercent", "SFundPercent", "IFundPercent", "LifecyclePercent", "TotalBalance", "LastUpdatedAt")
SELECT 10, "ContributionRatePercent", "EmployerMatchPercent", "GFundPercent", "FFundPercent", "CFundPercent", "SFundPercent", "IFundPercent", "LifecyclePercent", "TotalBalance", "LastUpdatedAt"
FROM "TspProfiles" WHERE "UserId" = 2;

-- 9. Clone TSP Position Snapshots
INSERT INTO "TspPositionSnapshots" ("UserId", "FundCode", "Units", "MarketValue", "AllocationPercent", "AsOfUtc", "CreatedAt")
SELECT 10, "FundCode", "Units", "MarketValue", "AllocationPercent", "AsOfUtc", NOW()
FROM "TspPositionSnapshots" WHERE "UserId" = 2;

-- 10. Clone Financial Profile Expenses
INSERT INTO "FinancialProfileExpenses" ("UserId", "ExpenseCategory", "MonthlyAmount", "IsFixed", "CreatedAt", "UpdatedAt")
SELECT 10, "ExpenseCategory", "MonthlyAmount", "IsFixed", NOW(), NOW()
FROM "FinancialProfileExpenses" WHERE "UserId" = 2;

-- 11. Clone Section Statuses
INSERT INTO "FinancialProfileSectionStatuses" ("UserId", "SectionName", "IsComplete", "CompletedAt", "LastUpdated")
SELECT 10, "SectionName", "IsComplete", "CompletedAt", NOW()
FROM "FinancialProfileSectionStatuses" WHERE "UserId" = 2;

-- 12. Clone Onboarding Progress
INSERT INTO "OnboardingProgress" ("UserId", "StepName", "IsCompleted", "CompletedAt", "Data", "CreatedAt", "UpdatedAt")
SELECT 10, "StepName", "IsCompleted", "CompletedAt", "Data", NOW(), NOW()
FROM "OnboardingProgress" WHERE "UserId" = 2;

-- Summary
SELECT 
    'Full clone completed!' as status,
    (SELECT COUNT(*) FROM "Accounts" WHERE "UserId" = 10) as accounts,
    (SELECT COUNT(*) FROM "CashAccounts" WHERE "UserId" = 10) as cash_accounts,
    (SELECT COUNT(*) FROM "Holdings" WHERE "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 10)) as holdings,
    (SELECT COUNT(*) FROM "TspProfiles" WHERE "UserId" = 10) as tsp_profile,
    (SELECT COUNT(*) FROM "TspPositionSnapshots" WHERE "UserId" = 10) as tsp_snapshots,
    (SELECT COUNT(*) FROM "FinancialProfileExpenses" WHERE "UserId" = 10) as expenses,
    (SELECT COUNT(*) FROM "OnboardingProgress" WHERE "UserId" = 10) as onboarding_steps;

COMMIT;
