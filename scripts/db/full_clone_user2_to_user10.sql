-- Full Clone User 2 to User 10
-- This script copies ALL user data from User 2 to User 10
-- Uses simple INSERT INTO ... SELECT FROM pattern

BEGIN;

-- 1. Update User 10's profile to match User 2 (excluding identity fields)
UPDATE "Users" u10
SET 
    "FirstName" = u2."FirstName",
    "LastName" = u2."LastName",
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
WHERE u10."UserId" = 10 AND u2."UserId" = 2;

-- 2. Delete existing User 10 data to avoid conflicts
-- Order matters due to foreign keys
DELETE FROM "Transactions" WHERE "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 10);
DELETE FROM "Holdings" WHERE "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 10);
DELETE FROM "APICredentials" WHERE "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 10);
DELETE FROM "Accounts" WHERE "UserId" = 10;
DELETE FROM "InvestmentAccounts" WHERE "UserId" = 10;
DELETE FROM "CashAccounts" WHERE "UserId" = 10;
DELETE FROM "Properties" WHERE "UserId" = 10;
DELETE FROM "RealEstateProperties" WHERE "UserId" = 10;
DELETE FROM "TspProfiles" WHERE "UserId" = 10;
DELETE FROM "TspPositionSnapshots" WHERE "UserId" = 10;
DELETE FROM "TspLifecyclePositions" WHERE "UserId" = 10;
DELETE FROM "IncomeSources" WHERE "UserId" = 10;
DELETE FROM "IncomeStreams" WHERE "UserId" = 10;
DELETE FROM "InsurancePolicies" WHERE "UserId" = 10;
DELETE FROM "FinancialProfileBenefitCoverages" WHERE "UserId" = 10;
DELETE FROM "FinancialProfileEquityInterest" WHERE "UserId" = 10;
DELETE FROM "FinancialProfileExpenses" WHERE "UserId" = 10;
DELETE FROM "FinancialProfileInsurancePolicies" WHERE "UserId" = 10;
DELETE FROM "FinancialProfileLiabilities" WHERE "UserId" = 10;
DELETE FROM "FinancialProfileLongTermObligations" WHERE "UserId" = 10;
DELETE FROM "FinancialProfileSectionStatuses" WHERE "UserId" = 10;
DELETE FROM "FinancialProfileSnapshots" WHERE "UserId" = 10;
DELETE FROM "FinancialProfileTaxProfiles" WHERE "UserId" = 10;
DELETE FROM "OnboardingProgress" WHERE "UserId" = 10;
DELETE FROM "Goals" WHERE "UserId" = 10;

-- 3. Create temporary mapping table for Account IDs (needed for foreign keys)
CREATE TEMP TABLE account_id_mapping (
    old_account_id INT,
    new_account_id INT
);

-- Clone Accounts and capture ID mapping
WITH inserted_accounts AS (
    INSERT INTO "Accounts" (
        "UserId", "AccountName", "AccountType", "Category", "Institution",
        "AccountNumber", "CurrentBalance", "InterestRate", "InterestRateUpdatedAt",
        "HasAPIIntegration", "APIProvider", "IsAPIConnected", "LastAPISync",
        "APIConnectionStatus", "TSPMonthlyContribution", "TSPEmployerMatch",
        "IsEmergencyFund", "OptimalInterestRate", "RateLastChecked", "Purpose",
        "CreatedAt", "UpdatedAt", "LastBalanceUpdate", "IsActive", "Notes"
    )
    SELECT 
        10, "AccountName", "AccountType", "Category", "Institution",
        "AccountNumber", "CurrentBalance", "InterestRate", "InterestRateUpdatedAt",
        "HasAPIIntegration", "APIProvider", "IsAPIConnected", "LastAPISync",
        "APIConnectionStatus", "TSPMonthlyContribution", "TSPEmployerMatch",
        "IsEmergencyFund", "OptimalInterestRate", "RateLastChecked", "Purpose",
        NOW(), NOW(), "LastBalanceUpdate", "IsActive", "Notes"
    FROM "Accounts"
    WHERE "UserId" = 2
    RETURNING "AccountId", "AccountName"
)
INSERT INTO account_id_mapping (old_account_id, new_account_id)
SELECT a2."AccountId", ia."AccountId"
FROM "Accounts" a2
JOIN inserted_accounts ia ON a2."AccountName" = ia."AccountName"
WHERE a2."UserId" = 2;

-- 4. Clone all other tables (simple copy, no foreign key dependencies)

-- TSP Data
INSERT INTO "TspProfiles" ("UserId", "ContributionRatePercent", "EmployerMatchPercent", "CurrentBalance", "TargetBalance", "GFundPercent", "FFundPercent", "CFundPercent", "SFundPercent", "IFundPercent", "LifecycleBalance", "LifecyclePercent", "LastUpdatedAt", "IsOptedOut", "OptOutReason", "OptOutAcknowledgedAt", "TotalBalance")
SELECT 10, "ContributionRatePercent", "EmployerMatchPercent", "CurrentBalance", "TargetBalance", "GFundPercent", "FFundPercent", "CFundPercent", "SFundPercent", "IFundPercent", "LifecycleBalance", "LifecyclePercent", "LastUpdatedAt", "IsOptedOut", "OptOutReason", "OptOutAcknowledgedAt", "TotalBalance"
FROM "TspProfiles" WHERE "UserId" = 2;

INSERT INTO "TspPositionSnapshots" ("UserId", "FundCode", "Price", "Units", "MarketValue", "MixPercent", "AllocationPercent", "AsOfUtc", "CreatedAt")
SELECT 10, "FundCode", "Price", "Units", "MarketValue", "MixPercent", "AllocationPercent", "AsOfUtc", NOW()
FROM "TspPositionSnapshots" WHERE "UserId" = 2;

INSERT INTO "TspLifecyclePositions" ("UserId", "FundCode", "Price", "Units", "MarketValue", "AllocationPercent", "AsOfDate", "CreatedAt")
SELECT 10, "FundCode", "Price", "Units", "MarketValue", "AllocationPercent", "AsOfDate", NOW()
FROM "TspLifecyclePositions" WHERE "UserId" = 2;

-- Cash Accounts
INSERT INTO "CashAccounts" ("CashAccountId", "UserId", "Nickname", "Institution", "AccountType", "Balance", "InterestRateApr", "IsEmergencyFund", "RateLastChecked", "Purpose", "CreatedAt", "UpdatedAt")
SELECT gen_random_uuid(), 10, "Nickname", "Institution", "AccountType", "Balance", "InterestRateApr", "IsEmergencyFund", "RateLastChecked", "Purpose", NOW(), NOW()
FROM "CashAccounts" WHERE "UserId" = 2;

-- Investment Accounts
INSERT INTO "InvestmentAccounts" ("UserId", "AccountName", "Institution", "AccountType", "CurrentBalance", "CostBasis", "UnrealizedGainLoss", "RealizedGainLossYTD", "DividendIncomeYTD", "LastUpdated", "CreatedAt", "UpdatedAt")
SELECT 10, "AccountName", "Institution", "AccountType", "CurrentBalance", "CostBasis", "UnrealizedGainLoss", "RealizedGainLossYTD", "DividendIncomeYTD", "LastUpdated", NOW(), NOW()
FROM "InvestmentAccounts" WHERE "UserId" = 2;

-- Real Estate
INSERT INTO "Properties" ("UserId", "PropertyName", "PropertyType", "PurchasePrice", "CurrentValue", "PurchaseDate", "Address", "Notes", "CreatedAt", "UpdatedAt")
SELECT 10, "PropertyName", "PropertyType", "PurchasePrice", "CurrentValue", "PurchaseDate", "Address", "Notes", NOW(), NOW()
FROM "Properties" WHERE "UserId" = 2;

INSERT INTO "RealEstateProperties" ("UserId", "PropertyName", "PropertyType", "PurchasePrice", "CurrentMarketValue", "OutstandingMortgage", "MonthlyMortgagePayment", "MonthlyRentalIncome", "AnnualPropertyTax", "AnnualInsurance", "AnnualHOA", "PurchaseDate", "Address", "City", "State", "ZipCode", "Notes", "CreatedAt", "UpdatedAt")
SELECT 10, "PropertyName", "PropertyType", "PurchasePrice", "CurrentMarketValue", "OutstandingMortgage", "MonthlyMortgagePayment", "MonthlyRentalIncome", "AnnualPropertyTax", "AnnualInsurance", "AnnualHOA", "PurchaseDate", "Address", "City", "State", "ZipCode", "Notes", NOW(), NOW()
FROM "RealEstateProperties" WHERE "UserId" = 2;

-- Income
INSERT INTO "IncomeSources" ("UserId", "SourceName", "SourceType", "AnnualAmount", "MonthlyAmount", "IsRecurring", "StartDate", "EndDate", "IsTaxable", "Notes", "CreatedAt", "UpdatedAt")
SELECT 10, "SourceName", "SourceType", "AnnualAmount", "MonthlyAmount", "IsRecurring", "StartDate", "EndDate", "IsTaxable", "Notes", NOW(), NOW()
FROM "IncomeSources" WHERE "UserId" = 2;

INSERT INTO "IncomeStreams" ("UserId", "StreamName", "StreamType", "MonthlyAmount", "AnnualAmount", "IsRecurring", "IsTaxable", "StartDate", "EndDate", "Notes", "CreatedAt", "UpdatedAt")
SELECT 10, "StreamName", "StreamType", "MonthlyAmount", "AnnualAmount", "IsRecurring", "IsTaxable", "StartDate", "EndDate", "Notes", NOW(), NOW()
FROM "IncomeStreams" WHERE "UserId" = 2;

-- Insurance
INSERT INTO "InsurancePolicies" ("UserId", "PolicyName", "PolicyType", "Provider", "AnnualPremium", "CoverageAmount", "Deductible", "EffectiveDate", "ExpirationDate", "Notes", "CreatedAt", "UpdatedAt")
SELECT 10, "PolicyName", "PolicyType", "Provider", "AnnualPremium", "CoverageAmount", "Deductible", "EffectiveDate", "ExpirationDate", "Notes", NOW(), NOW()
FROM "InsurancePolicies" WHERE "UserId" = 2;

-- Financial Profile Sections
INSERT INTO "FinancialProfileBenefitCoverages" ("UserId", "BenefitType", "CoverageLevel", "MonthlyPremium", "AnnualOutOfPocketMax", "Provider", "PolicyNumber", "EffectiveDate", "Notes", "CreatedAt", "UpdatedAt")
SELECT 10, "BenefitType", "CoverageLevel", "MonthlyPremium", "AnnualOutOfPocketMax", "Provider", "PolicyNumber", "EffectiveDate", "Notes", NOW(), NOW()
FROM "FinancialProfileBenefitCoverages" WHERE "UserId" = 2;

INSERT INTO "FinancialProfileEquityInterest" ("UserId", "CompanyName", "EquityType", "Shares", "VestingSchedule", "CurrentValue", "GrantDate", "Notes", "CreatedAt", "UpdatedAt")
SELECT 10, "CompanyName", "EquityType", "Shares", "VestingSchedule", "CurrentValue", "GrantDate", "Notes", NOW(), NOW()
FROM "FinancialProfileEquityInterest" WHERE "UserId" = 2;

INSERT INTO "FinancialProfileExpenses" ("UserId", "ExpenseCategory", "MonthlyAmount", "AnnualAmount", "IsFixed", "Notes", "CreatedAt", "UpdatedAt")
SELECT 10, "ExpenseCategory", "MonthlyAmount", "AnnualAmount", "IsFixed", "Notes", NOW(), NOW()
FROM "FinancialProfileExpenses" WHERE "UserId" = 2;

INSERT INTO "FinancialProfileInsurancePolicies" ("UserId", "PolicyType", "Provider", "CoverageAmount", "AnnualPremium", "Deductible", "EffectiveDate", "ExpirationDate", "Notes", "CreatedAt", "UpdatedAt")
SELECT 10, "PolicyType", "Provider", "CoverageAmount", "AnnualPremium", "Deductible", "EffectiveDate", "ExpirationDate", "Notes", NOW(), NOW()
FROM "FinancialProfileInsurancePolicies" WHERE "UserId" = 2;

INSERT INTO "FinancialProfileLiabilities" ("UserId", "LiabilityName", "LiabilityType", "OutstandingBalance", "MonthlyPayment", "InterestRate", "OriginationDate", "MaturityDate", "Creditor", "Notes", "CreatedAt", "UpdatedAt")
SELECT 10, "LiabilityName", "LiabilityType", "OutstandingBalance", "MonthlyPayment", "InterestRate", "OriginationDate", "MaturityDate", "Creditor", "Notes", NOW(), NOW()
FROM "FinancialProfileLiabilities" WHERE "UserId" = 2;

INSERT INTO "FinancialProfileLongTermObligations" ("UserId", "ObligationName", "ObligationType", "MonthlyAmount", "AnnualAmount", "StartDate", "EndDate", "Beneficiary", "Notes", "CreatedAt", "UpdatedAt")
SELECT 10, "ObligationName", "ObligationType", "MonthlyAmount", "AnnualAmount", "StartDate", "EndDate", "Beneficiary", "Notes", NOW(), NOW()
FROM "FinancialProfileLongTermObligations" WHERE "UserId" = 2;

INSERT INTO "FinancialProfileSectionStatuses" ("UserId", "SectionName", "IsComplete", "CompletedAt", "LastUpdated")
SELECT 10, "SectionName", "IsComplete", "CompletedAt", NOW()
FROM "FinancialProfileSectionStatuses" WHERE "UserId" = 2;

INSERT INTO "FinancialProfileSnapshots" ("UserId", "SnapshotDate", "TotalAssets", "TotalLiabilities", "NetWorth", "LiquidAssets", "InvestedAssets", "RealEstateValue", "RetirementBalance", "CreatedAt")
SELECT 10, "SnapshotDate", "TotalAssets", "TotalLiabilities", "NetWorth", "LiquidAssets", "InvestedAssets", "RealEstateValue", "RetirementBalance", NOW()
FROM "FinancialProfileSnapshots" WHERE "UserId" = 2;

INSERT INTO "FinancialProfileTaxProfiles" ("UserId", "FilingStatus", "FederalTaxBracket", "StateTaxBracket", "EffectiveTaxRate", "EstimatedAnnualTaxLiability", "WithholdingAmount", "TaxYear", "Notes", "CreatedAt", "UpdatedAt")
SELECT 10, "FilingStatus", "FederalTaxBracket", "StateTaxBracket", "EffectiveTaxRate", "EstimatedAnnualTaxLiability", "WithholdingAmount", "TaxYear", "Notes", NOW(), NOW()
FROM "FinancialProfileTaxProfiles" WHERE "UserId" = 2;

-- Goals
INSERT INTO "Goals" ("UserId", "GoalName", "GoalType", "TargetAmount", "CurrentAmount", "TargetDate", "Priority", "Status", "Notes", "CreatedAt", "UpdatedAt")
SELECT 10, "GoalName", "GoalType", "TargetAmount", "CurrentAmount", "TargetDate", "Priority", "Status", "Notes", NOW(), NOW()
FROM "Goals" WHERE "UserId" = 2;

-- Onboarding Progress
INSERT INTO "OnboardingProgress" ("UserId", "StepName", "IsCompleted", "CompletedAt", "Data", "CreatedAt", "UpdatedAt")
SELECT 10, "StepName", "IsCompleted", "CompletedAt", "Data", NOW(), NOW()
FROM "OnboardingProgress" WHERE "UserId" = 2;

-- 5. Clone Holdings and Transactions using account ID mapping
INSERT INTO "Holdings" (
    "AccountId", "Symbol", "Name", "AssetType", "Quantity", "AverageCostBasis",
    "CurrentPrice", "LastPriceUpdate", "AnnualDividendYield", "StakingAPY",
    "AnnualDividendIncome", "LastDividendDate", "NextDividendDate", "Beta",
    "SectorAllocation", "GeographicAllocation", "IsQualifiedDividend",
    "PurchaseDate", "IsLongTermCapitalGains", "CreatedAt", "UpdatedAt", "Notes"
)
SELECT 
    m.new_account_id, h."Symbol", h."Name", h."AssetType", h."Quantity", h."AverageCostBasis",
    h."CurrentPrice", h."LastPriceUpdate", h."AnnualDividendYield", h."StakingAPY",
    h."AnnualDividendIncome", h."LastDividendDate", h."NextDividendDate", h."Beta",
    h."SectorAllocation", h."GeographicAllocation", h."IsQualifiedDividend",
    h."PurchaseDate", h."IsLongTermCapitalGains", NOW(), NOW(), h."Notes"
FROM "Holdings" h
JOIN account_id_mapping m ON h."AccountId" = m.old_account_id;

INSERT INTO "Transactions" (
    "AccountId", "HoldingId", "TransactionType", "Symbol", "Quantity", "Price",
    "Amount", "Fee", "TransactionDate", "SettlementDate", "IsTaxable",
    "IsLongTermCapitalGains", "TaxableAmount", "CostBasis", "CapitalGainLoss",
    "Source", "ExternalTransactionId", "Description", "IsDividendReinvestment",
    "IsQualifiedDividend", "StakingReward", "StakingAPY", "CreatedAt", "Notes"
)
SELECT 
    m.new_account_id, t."HoldingId", t."TransactionType", t."Symbol", t."Quantity", t."Price",
    t."Amount", t."Fee", t."TransactionDate", t."SettlementDate", t."IsTaxable",
    t."IsLongTermCapitalGains", t."TaxableAmount", t."CostBasis", t."CapitalGainLoss",
    t."Source", t."ExternalTransactionId", t."Description", t."IsDividendReinvestment",
    t."IsQualifiedDividend", t."StakingReward", t."StakingAPY", NOW(), t."Notes"
FROM "Transactions" t
JOIN account_id_mapping m ON t."AccountId" = m.old_account_id;

-- Summary
SELECT 
    'Clone completed!' as status,
    (SELECT COUNT(*) FROM "Accounts" WHERE "UserId" = 10) as accounts,
    (SELECT COUNT(*) FROM "CashAccounts" WHERE "UserId" = 10) as cash_accounts,
    (SELECT COUNT(*) FROM "InvestmentAccounts" WHERE "UserId" = 10) as investment_accounts,
    (SELECT COUNT(*) FROM "TspProfiles" WHERE "UserId" = 10) as tsp_profiles,
    (SELECT COUNT(*) FROM "TspPositionSnapshots" WHERE "UserId" = 10) as tsp_snapshots,
    (SELECT COUNT(*) FROM "Holdings" WHERE "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 10)) as holdings,
    (SELECT COUNT(*) FROM "Transactions" WHERE "AccountId" IN (SELECT "AccountId" FROM "Accounts" WHERE "UserId" = 10)) as transactions,
    (SELECT COUNT(*) FROM "RealEstateProperties" WHERE "UserId" = 10) as real_estate,
    (SELECT COUNT(*) FROM "FinancialProfileLiabilities" WHERE "UserId" = 10) as liabilities,
    (SELECT COUNT(*) FROM "FinancialProfileExpenses" WHERE "UserId" = 10) as expenses,
    (SELECT COUNT(*) FROM "FinancialProfileTaxProfiles" WHERE "UserId" = 10) as tax_profiles,
    (SELECT COUNT(*) FROM "InsurancePolicies" WHERE "UserId" = 10) as insurance_policies,
    (SELECT COUNT(*) FROM "FinancialProfileBenefitCoverages" WHERE "UserId" = 10) as benefits,
    (SELECT COUNT(*) FROM "Goals" WHERE "UserId" = 10) as goals;

COMMIT;
