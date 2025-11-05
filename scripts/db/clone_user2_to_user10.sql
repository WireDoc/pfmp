-- Clone User 2 data to User 10
-- This script copies all onboarding and financial data from User 2 to User 10
-- User 10 must already exist (email: dev+done+6a2d90ca5c494340a5f73c152a903cf4@local)

BEGIN;

-- 1. Copy User profile fields (excluding identity fields)
UPDATE "Users"
SET 
    "RiskTolerance" = u2."RiskTolerance",
    "LastRiskAssessment" = u2."LastRiskAssessment",
    "RetirementGoalAmount" = u2."RetirementGoalAmount",
    "TargetMonthlyPassiveIncome" = u2."TargetMonthlyPassiveIncome",
    "TargetRetirementDate" = u2."TargetRetirementDate",
    "EmergencyFundTarget" = u2."EmergencyFundTarget",
    "VADisabilityMonthlyAmount" = u2."VADisabilityMonthlyAmount",
    "VADisabilityPercentage" = u2."VADisabilityPercentage",
    "IsGovernmentEmployee" = u2."IsGovernmentEmployee",
    "GovernmentAgency" = u2."GovernmentAgency",
    "EnableRebalancingAlerts" = u2."EnableRebalancingAlerts",
    "RebalancingThreshold" = u2."RebalancingThreshold",
    "EnableTaxOptimization" = u2."EnableTaxOptimization",
    "EnablePushNotifications" = u2."EnablePushNotifications",
    "EnableEmailAlerts" = u2."EnableEmailAlerts",
    "AnnualIncome" = u2."AnnualIncome",
    "DateOfBirth" = u2."DateOfBirth",
    "EmploymentType" = u2."EmploymentType",
    "PayGrade" = u2."PayGrade",
    "ProfileCompletedAt" = u2."ProfileCompletedAt",
    "ProfileSetupComplete" = u2."ProfileSetupComplete",
    "RetirementSystem" = u2."RetirementSystem",
    "ServiceComputationDate" = u2."ServiceComputationDate",
    "SetupProgressPercentage" = u2."SetupProgressPercentage",
    "SetupStepsCompleted" = u2."SetupStepsCompleted",
    "DependentCount" = u2."DependentCount",
    "HouseholdServiceNotes" = u2."HouseholdServiceNotes",
    "MaritalStatus" = u2."MaritalStatus",
    "PreferredName" = u2."PreferredName",
    "LiquidityBufferMonths" = u2."LiquidityBufferMonths",
    "TransactionalAccountDesiredBalance" = u2."TransactionalAccountDesiredBalance",
    "UpdatedAt" = NOW()
FROM "Users" u2
WHERE "Users"."UserId" = 10
  AND u2."UserId" = 2;

-- 2. Delete existing User 10 data (to avoid conflicts)
DELETE FROM "Transactions" WHERE "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 10);
DELETE FROM "Holdings" WHERE "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 10);
DELETE FROM "Accounts" WHERE "UserId" = 10;
DELETE FROM "CashAccounts" WHERE "UserId" = 10;
DELETE FROM "Advice" WHERE "UserId" = 10;
DELETE FROM "Alerts" WHERE "UserId" = 10;
DELETE FROM "Tasks" WHERE "UserId" = 10;
DELETE FROM "TspProfiles" WHERE "UserId" = 10;
DELETE FROM "TspPositionSnapshots" WHERE "UserId" = 10;
DELETE FROM "Goals" WHERE "UserId" = 10;

-- 3. Clone Accounts (returns mapping for later use)
CREATE TEMP TABLE account_mapping AS
SELECT 
    a2."AccountId" as old_account_id,
    nextval('"Accounts_AccountId_seq"') as new_account_id
FROM "Accounts" a2
WHERE a2."UserId" = 2;

INSERT INTO "Accounts" (
    "AccountId", "UserId", "AccountName", "AccountType", "Category", 
    "Institution", "AccountNumber", "CurrentBalance", "InterestRate", 
    "InterestRateUpdatedAt", "HasAPIIntegration", "APIProvider", 
    "IsAPIConnected", "LastAPISync", "APIConnectionStatus", 
    "TSPMonthlyContribution", "TSPEmployerMatch", "IsEmergencyFund", 
    "OptimalInterestRate", "RateLastChecked", "Purpose", 
    "CreatedAt", "UpdatedAt", "LastBalanceUpdate", "IsActive", "Notes"
)
SELECT 
    am.new_account_id, 10, a."AccountName", a."AccountType", a."Category",
    a."Institution", a."AccountNumber", a."CurrentBalance", a."InterestRate",
    a."InterestRateUpdatedAt", a."HasAPIIntegration", a."APIProvider",
    a."IsAPIConnected", a."LastAPISync", a."APIConnectionStatus",
    a."TSPMonthlyContribution", a."TSPEmployerMatch", a."IsEmergencyFund",
    a."OptimalInterestRate", a."RateLastChecked", a."Purpose",
    NOW(), NOW(), a."LastBalanceUpdate", a."IsActive", a."Notes"
FROM "Accounts" a
JOIN account_mapping am ON a."AccountId" = am.old_account_id
WHERE a."UserId" = 2;

-- 4. Clone CashAccounts
INSERT INTO "CashAccounts" (
    "CashAccountId", "UserId", "Nickname", "Institution", "AccountType", 
    "Balance", "InterestRateApr", "IsEmergencyFund",
    "RateLastChecked", "Purpose", "CreatedAt", "UpdatedAt"
)
SELECT 
    gen_random_uuid(),
    10, c."Nickname", c."Institution", c."AccountType",
    c."Balance", c."InterestRateApr", c."IsEmergencyFund",
    c."RateLastChecked", c."Purpose", NOW(), NOW()
FROM "CashAccounts" c
WHERE c."UserId" = 2;

-- 5. Clone Holdings
INSERT INTO "Holdings" (
    "AccountId", "Symbol", "Name", "AssetType", "Quantity",
    "AverageCostBasis", "CurrentPrice", "LastPriceUpdate",
    "AnnualDividendYield", "StakingAPY", "AnnualDividendIncome",
    "LastDividendDate", "NextDividendDate", "Beta",
    "SectorAllocation", "GeographicAllocation", "IsQualifiedDividend",
    "PurchaseDate", "IsLongTermCapitalGains", "CreatedAt", "UpdatedAt", "Notes"
)
SELECT 
    am.new_account_id, h."Symbol", h."Name", h."AssetType", h."Quantity",
    h."AverageCostBasis", h."CurrentPrice", h."LastPriceUpdate",
    h."AnnualDividendYield", h."StakingAPY", h."AnnualDividendIncome",
    h."LastDividendDate", h."NextDividendDate", h."Beta",
    h."SectorAllocation", h."GeographicAllocation", h."IsQualifiedDividend",
    h."PurchaseDate", h."IsLongTermCapitalGains", NOW(), NOW(), h."Notes"
FROM "Holdings" h
JOIN account_mapping am ON h."AccountId" = am.old_account_id;

-- 6. Clone Transactions (using new account IDs)
INSERT INTO "Transactions" (
    "AccountId", "HoldingId", "TransactionType", "Symbol",
    "Quantity", "Price", "Amount", "Fee",
    "TransactionDate", "SettlementDate", "IsTaxable",
    "IsLongTermCapitalGains", "TaxableAmount", "CostBasis",
    "CapitalGainLoss", "Source", "ExternalTransactionId",
    "Description", "IsDividendReinvestment", "IsQualifiedDividend",
    "StakingReward", "StakingAPY", "CreatedAt", "Notes"
)
SELECT 
    am.new_account_id, t."HoldingId", t."TransactionType", t."Symbol",
    t."Quantity", t."Price", t."Amount", t."Fee",
    t."TransactionDate", t."SettlementDate", t."IsTaxable",
    t."IsLongTermCapitalGains", t."TaxableAmount", t."CostBasis",
    t."CapitalGainLoss", t."Source", t."ExternalTransactionId",
    t."Description", t."IsDividendReinvestment", t."IsQualifiedDividend",
    t."StakingReward", t."StakingAPY", NOW(), t."Notes"
FROM "Transactions" t
JOIN account_mapping am ON t."AccountId" = am.old_account_id;

-- 7. Clone TSP data (TspProfiles and TspPositionSnapshots)
INSERT INTO "TspProfiles" (
    "UserId", "ContributionRatePercent", "EmployerMatchPercent",
    "CurrentBalance", "TargetBalance", "GFundPercent", "FFundPercent",
    "CFundPercent", "SFundPercent", "IFundPercent", "LifecycleBalance",
    "LifecyclePercent", "LastUpdatedAt", "IsOptedOut", "OptOutReason",
    "OptOutAcknowledgedAt", "TotalBalance"
)
SELECT 
    10, t."ContributionRatePercent", t."EmployerMatchPercent",
    t."CurrentBalance", t."TargetBalance", t."GFundPercent", t."FFundPercent",
    t."CFundPercent", t."SFundPercent", t."IFundPercent", t."LifecycleBalance",
    t."LifecyclePercent", t."LastUpdatedAt", t."IsOptedOut", t."OptOutReason",
    t."OptOutAcknowledgedAt", t."TotalBalance"
FROM "TspProfiles" t
WHERE t."UserId" = 2;

INSERT INTO "TspPositionSnapshots" (
    "UserId", "FundCode", "Price", "Units", "MarketValue",
    "MixPercent", "AllocationPercent", "AsOfUtc", "CreatedAt"
)
SELECT 
    10, t."FundCode", t."Price", t."Units", t."MarketValue",
    t."MixPercent", t."AllocationPercent", t."AsOfUtc", NOW()
FROM "TspPositionSnapshots" t
WHERE t."UserId" = 2;

-- 8-10. Skip cloning Advice, Alerts, and Tasks
-- These should be regenerated fresh by the AI for User 10
-- This allows the AI to provide current recommendations based on the cloned data

-- Summary
SELECT 'Clone completed!' as status,
       (SELECT COUNT(*) FROM "Accounts" WHERE "UserId" = 10) as accounts_count,
       (SELECT COUNT(*) FROM "CashAccounts" WHERE "UserId" = 10) as cash_accounts_count,
       (SELECT COUNT(*) FROM "Holdings" WHERE "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 10)) as holdings_count,
       (SELECT COUNT(*) FROM "Transactions" WHERE "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 10)) as transactions_count,
       (SELECT COUNT(*) FROM "TspProfiles" WHERE "UserId" = 10) as tsp_profiles_count,
       (SELECT COUNT(*) FROM "TspPositionSnapshots" WHERE "UserId" = 10) as tsp_snapshots_count;

COMMIT;
