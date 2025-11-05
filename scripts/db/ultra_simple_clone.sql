-- Ultra-Simple Clone: Copy all columns exactly as-is from User 2 to User 10
-- Uses SELECT * to avoid column mismatch issues

BEGIN;

-- 1. Update User 10 profile by copying ALL non-identity fields from User 2
UPDATE "Users" u10 SET (
    "FirstName", "LastName", "Email", "PhoneNumber", "RiskTolerance", "LastRiskAssessment",
    "RetirementGoalAmount", "TargetMonthlyPassiveIncome", "TargetRetirementDate", "EmergencyFundTarget",
    "VADisabilityMonthlyAmount", "VADisabilityPercentage", "IsGovernmentEmployee", "GovernmentAgency",
    "EnableRebalancingAlerts", "RebalancingThreshold", "EnableTaxOptimization", "EnablePushNotifications",
    "EnableEmailAlerts", "AnnualIncome", "DateOfBirth", "EmploymentType", "PayGrade",
    "ProfileCompletedAt", "ProfileSetupComplete", "RetirementSystem", "ServiceComputationDate",
    "SetupProgressPercentage", "SetupStepsCompleted", "DependentCount", "HouseholdServiceNotes",
    "MaritalStatus", "PreferredName", "LiquidityBufferMonths", "TransactionalAccountDesiredBalance", "UpdatedAt"
) = (
    SELECT "FirstName", "LastName", "Email" || '.user10', "PhoneNumber", "RiskTolerance", "LastRiskAssessment",
    "RetirementGoalAmount", "TargetMonthlyPassiveIncome", "TargetRetirementDate", "EmergencyFundTarget",
    "VADisabilityMonthlyAmount", "VADisabilityPercentage", "IsGovernmentEmployee", "GovernmentAgency",
    "EnableRebalancingAlerts", "RebalancingThreshold", "EnableTaxOptimization", "EnablePushNotifications",
    "EnableEmailAlerts", "AnnualIncome", "DateOfBirth", "EmploymentType", "PayGrade",
    "ProfileCompletedAt", "ProfileSetupComplete", "RetirementSystem", "ServiceComputationDate",
    "SetupProgressPercentage", "SetupStepsCompleted", "DependentCount", "HouseholdServiceNotes",
    "MaritalStatus", "PreferredName", "LiquidityBufferMonths", "TransactionalAccountDesiredBalance", NOW()
    FROM "Users" WHERE "UserId" = 2
)
WHERE u10."UserId" = 10;

-- 2. Delete existing User 10 data to avoid duplicates
DELETE FROM "Transactions" WHERE "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 10);
DELETE FROM "Holdings" WHERE "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 10);
DELETE FROM "Accounts" WHERE "UserId" = 10;
DELETE FROM "CashAccounts" WHERE "UserId" = 10;
DELETE FROM "TspProfiles" WHERE "UserId" = 10;
DELETE FROM "TspPositionSnapshots" WHERE "UserId" = 10;
DELETE FROM "FinancialProfileExpenses" WHERE "UserId" = 10;
DELETE FROM "FinancialProfileSectionStatuses" WHERE "UserId" = 10;
DELETE FROM "OnboardingProgress" WHERE "UserId" = 10;

-- 3. Create temp table for account mapping
CREATE TEMP TABLE am (old_id INT, new_id INT);

-- 4. Clone Accounts - copy everything except UserId and AccountId
WITH new_accounts AS (
    INSERT INTO "Accounts" (
        SELECT nextval('"Accounts_AccountId_seq"'), 10, 
               "AccountName", "AccountType", "Category", "Institution", "AccountNumber",
               "CurrentBalance", "InterestRate", "InterestRateUpdatedAt", "HasAPIIntegration",
               "APIProvider", "IsAPIConnected", "LastAPISync", "APIConnectionStatus",
               "TSPMonthlyContribution", "TSPEmployerMatch", "IsEmergencyFund",
               "OptimalInterestRate", "RateLastChecked", "Purpose", NOW(), NOW(),
               "LastBalanceUpdate", "IsActive", "Notes", "AccountSubtype", "TaxTreatment",
               "BeneficiaryDesignation", "MaturityDate", "PenaltyFreeWithdrawalAge",
               "RequiredMinimumDistributionAge", "ContributionLimit", "YearToDateContributions",
               "AllowsLoans", "AllowsHardshipWithdrawals", "VestingSchedule", "EmployerMatchFormula"
        FROM "Accounts" WHERE "UserId" = 2
    ) RETURNING "AccountId", "AccountName"
)
INSERT INTO am
SELECT a."AccountId", na."AccountId"
FROM "Accounts" a
JOIN new_accounts na ON a."AccountName" = na."AccountName"
WHERE a."UserId" = 2;

-- 5. Clone Holdings - copy everything except HoldingId and AccountId
INSERT INTO "Holdings" (
    SELECT nextval('"Holdings_HoldingId_seq"'), m.new_id,
           "Symbol", "Name", "AssetType", "Quantity", "AverageCostBasis", "CurrentPrice",
           "AnnualDividendYield", "StakingAPY", "AnnualDividendIncome", "LastDividendDate",
           "NextDividendDate", "Beta", "SectorAllocation", "GeographicAllocation",
           "IsQualifiedDividend", "PurchaseDate", "IsLongTermCapitalGains", NOW(), NOW(),
           "LastPriceUpdate", "Notes"
    FROM "Holdings" h
    JOIN am m ON h."AccountId" = m.old_id
);

-- 6. Clone CashAccounts - generate new UUIDs
INSERT INTO "CashAccounts" (
    SELECT gen_random_uuid(), 10, 
           "Nickname", "Institution", "AccountType", "Balance", "InterestRateApr",
           "IsEmergencyFund", "RateLastChecked", NOW(), NOW(), "Purpose"
    FROM "CashAccounts" WHERE "UserId" = 2
);

-- 7. Clone TSP Profile - User is primary key
INSERT INTO "TspProfiles" (
    SELECT 10, "ContributionRatePercent", "EmployerMatchPercent", "CurrentBalance",
           "TargetBalance", "GFundPercent", "FFundPercent", "CFundPercent", "SFundPercent",
           "IFundPercent", "LifecycleBalance", "LifecyclePercent", "LastUpdatedAt",
           "IsOptedOut", "OptOutReason", "OptOutAcknowledgedAt", "TotalBalance"
    FROM "TspProfiles" WHERE "UserId" = 2
);

-- 8. Clone TSP Position Snapshots
INSERT INTO "TspPositionSnapshots" (
    SELECT nextval('"TspPositionSnapshots_Id_seq"'), 10,
           "FundCode", "Price", "Units", "MarketValue", "MixPercent", "AllocationPercent",
           "AsOfUtc", NOW()
    FROM "TspPositionSnapshots" WHERE "UserId" = 2
);

-- 9. Clone Financial Profile Expenses
INSERT INTO "FinancialProfileExpenses" (
    SELECT nextval('"FinancialProfileExpenses_ExpenseId_seq"'), 10,
           "ExpenseCategory", "MonthlyAmount", "AnnualAmount", "IsFixed", "Notes", NOW(), NOW()
    FROM "FinancialProfileExpenses" WHERE "UserId" = 2
);

-- 10. Clone Section Statuses
INSERT INTO "FinancialProfileSectionStatuses" (
    SELECT nextval('"FinancialProfileSectionStatuses_StatusId_seq"'), 10,
           "SectionName", "IsComplete", "CompletedAt", NOW()
    FROM "FinancialProfileSectionStatuses" WHERE "UserId" = 2
);

-- 11. Clone Onboarding Progress
INSERT INTO "OnboardingProgress" (
    SELECT nextval('"OnboardingProgress_ProgressId_seq"'), 10,
           "StepName", "IsCompleted", "CompletedAt", "Data", NOW(), NOW()
    FROM "OnboardingProgress" WHERE "UserId" = 2
);

-- Summary
SELECT 
    'Ultra-simple clone completed!' as status,
    (SELECT COUNT(*) FROM "Accounts" WHERE "UserId" = 10) as accounts,
    (SELECT COUNT(*) FROM "CashAccounts" WHERE "UserId" = 10) as cash_accounts,
    (SELECT COUNT(*) FROM "Holdings" WHERE "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 10)) as holdings,
    (SELECT COUNT(*) FROM "TspProfiles" WHERE "UserId" = 10) as tsp_profile,
    (SELECT COUNT(*) FROM "TspPositionSnapshots" WHERE "UserId" = 10) as tsp_snapshots,
    (SELECT COUNT(*) FROM "FinancialProfileExpenses" WHERE "UserId" = 10) as expenses,
    (SELECT COUNT(*) FROM "FinancialProfileSectionStatuses" WHERE "UserId" = 10) as section_statuses,
    (SELECT COUNT(*) FROM "OnboardingProgress" WHERE "UserId" = 10) as onboarding_steps;

COMMIT;
