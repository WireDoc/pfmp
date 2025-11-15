-- Seed transactions for User 20's test accounts
-- AccountId 84: Primary Checking (Chase)
-- AccountId 85: High-Yield Savings (Ally)
-- AccountId 86: Money Market (Vanguard)

-- Primary Checking - Salary deposits (bi-weekly, last 60 days)
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "SettlementDate", "Description", "Source", "IsTaxable", "IsLongTermCapitalGains", "IsDividendReinvestment", "IsQualifiedDividend", "CreatedAt") VALUES
(84, 'Deposit', 3250.00, CURRENT_DATE - INTERVAL '56 days', CURRENT_DATE - INTERVAL '56 days', 'Direct Deposit - Salary', 1, false, false, false, false, NOW()),
(84, 'Deposit', 3250.00, CURRENT_DATE - INTERVAL '42 days', CURRENT_DATE - INTERVAL '42 days', 'Direct Deposit - Salary', 1, false, false, false, false, NOW()),
(84, 'Deposit', 3250.00, CURRENT_DATE - INTERVAL '28 days', CURRENT_DATE - INTERVAL '28 days', 'Direct Deposit - Salary', 1, false, false, false, false, NOW()),
(84, 'Deposit', 3250.00, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '14 days', 'Direct Deposit - Salary', 1, false, false, false, false, NOW()),
(84, 'Deposit', 3250.00, CURRENT_DATE, CURRENT_DATE, 'Direct Deposit - Salary', 1, false, false, false, false, NOW());

-- Primary Checking - Rent/Mortgage
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "SettlementDate", "Description", "Notes", "Source", "IsTaxable", "IsLongTermCapitalGains", "IsDividendReinvestment", "IsQualifiedDividend", "CreatedAt") VALUES
(84, 'Withdrawal', -1850.00, CURRENT_DATE - INTERVAL '55 days', CURRENT_DATE - INTERVAL '55 days', 'Rent Payment', 'Check #1001', 1, false, false, false, false, NOW()),
(84, 'Withdrawal', -1850.00, CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE - INTERVAL '25 days', 'Rent Payment', 'Check #1002', 1, false, false, false, false, NOW());

-- Primary Checking - Utilities
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "SettlementDate", "Description", "Source", "IsTaxable", "IsLongTermCapitalGains", "IsDividendReinvestment", "IsQualifiedDividend", "CreatedAt") VALUES
(84, 'Withdrawal', -125.50, CURRENT_DATE - INTERVAL '52 days', CURRENT_DATE - INTERVAL '52 days', 'Electric Bill', 1, false, false, false, false, NOW()),
(84, 'Withdrawal', -89.99, CURRENT_DATE - INTERVAL '48 days', CURRENT_DATE - INTERVAL '48 days', 'Internet Service', 1, false, false, false, false, NOW()),
(84, 'Withdrawal', -132.75, CURRENT_DATE - INTERVAL '22 days', CURRENT_DATE - INTERVAL '22 days', 'Electric Bill', 1, false, false, false, false, NOW());

-- Primary Checking - Groceries (weekly)
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "CreatedAt") VALUES
(84, 1, -142.50, CURRENT_DATE - INTERVAL '58 days', 'Safeway - Groceries', 'Groceries', NOW()),
(84, 1, -95.75, CURRENT_DATE - INTERVAL '51 days', 'Trader Joes - Groceries', 'Groceries', NOW()),
(84, 1, -178.30, CURRENT_DATE - INTERVAL '44 days', 'Whole Foods - Groceries', 'Groceries', NOW()),
(84, 1, -128.90, CURRENT_DATE - INTERVAL '37 days', 'Safeway - Groceries', 'Groceries', NOW()),
(84, 1, -156.25, CURRENT_DATE - INTERVAL '30 days', 'Giant - Groceries', 'Groceries', NOW()),
(84, 1, -112.40, CURRENT_DATE - INTERVAL '23 days', 'Trader Joes - Groceries', 'Groceries', NOW()),
(84, 1, -145.80, CURRENT_DATE - INTERVAL '16 days', 'Safeway - Groceries', 'Groceries', NOW()),
(84, 1, -98.60, CURRENT_DATE - INTERVAL '9 days', 'Whole Foods - Groceries', 'Groceries', NOW());

-- Primary Checking - Gas
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "CreatedAt") VALUES
(84, 1, -62.50, CURRENT_DATE - INTERVAL '57 days', 'Gas Station', 'Transportation', NOW()),
(84, 1, -58.75, CURRENT_DATE - INTERVAL '47 days', 'Gas Station', 'Transportation', NOW()),
(84, 1, -71.20, CURRENT_DATE - INTERVAL '37 days', 'Gas Station', 'Transportation', NOW()),
(84, 1, -54.90, CURRENT_DATE - INTERVAL '27 days', 'Gas Station', 'Transportation', NOW()),
(84, 1, -68.40, CURRENT_DATE - INTERVAL '17 days', 'Gas Station', 'Transportation', NOW()),
(84, 1, -59.80, CURRENT_DATE - INTERVAL '7 days', 'Gas Station', 'Transportation', NOW());

-- Primary Checking - Restaurants/Dining
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "CreatedAt") VALUES
(84, 1, -45.80, CURRENT_DATE - INTERVAL '58 days', 'Chipotle', 'Dining', NOW()),
(84, 1, -78.50, CURRENT_DATE - INTERVAL '53 days', 'Local Restaurant', 'Dining', NOW()),
(84, 1, -32.90, CURRENT_DATE - INTERVAL '46 days', 'Pizza Place', 'Dining', NOW()),
(84, 1, -56.75, CURRENT_DATE - INTERVAL '42 days', 'Thai Food', 'Dining', NOW()),
(84, 1, -28.40, CURRENT_DATE - INTERVAL '35 days', 'Coffee Shop', 'Dining', NOW()),
(84, 1, -92.30, CURRENT_DATE - INTERVAL '28 days', 'Local Restaurant', 'Dining', NOW()),
(84, 1, -41.60, CURRENT_DATE - INTERVAL '22 days', 'Chipotle', 'Dining', NOW()),
(84, 1, -65.90, CURRENT_DATE - INTERVAL '15 days', 'Thai Food', 'Dining', NOW()),
(84, 1, -38.20, CURRENT_DATE - INTERVAL '9 days', 'Pizza Place', 'Dining', NOW()),
(84, 1, -52.70, CURRENT_DATE - INTERVAL '3 days', 'Coffee Shop', 'Dining', NOW());

-- Primary Checking - Entertainment & Health
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "CreatedAt") VALUES
(84, 1, -89.99, CURRENT_DATE - INTERVAL '50 days', 'Gym Membership', 'Health', NOW()),
(84, 1, -45.00, CURRENT_DATE - INTERVAL '38 days', 'Movie Tickets', 'Entertainment', NOW()),
(84, 1, -89.99, CURRENT_DATE - INTERVAL '20 days', 'Gym Membership', 'Health', NOW()),
(84, 1, -15.99, CURRENT_DATE - INTERVAL '40 days', 'Netflix', 'Entertainment', NOW()),
(84, 1, -12.99, CURRENT_DATE - INTERVAL '40 days', 'Spotify', 'Entertainment', NOW());

-- Primary Checking - Transfers to savings
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "CreatedAt") VALUES
(84, 2, -500.00, CURRENT_DATE - INTERVAL '44 days', 'Transfer to Savings', 'Transfer', NOW()),
(84, 2, -500.00, CURRENT_DATE - INTERVAL '16 days', 'Transfer to Savings', 'Transfer', NOW());

-- Primary Checking - Miscellaneous
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "CreatedAt") VALUES
(84, 1, -32.50, CURRENT_DATE - INTERVAL '49 days', 'Pharmacy', 'Healthcare', NOW()),
(84, 1, -125.00, CURRENT_DATE - INTERVAL '45 days', 'Car Insurance', 'Insurance', NOW()),
(84, 1, -78.45, CURRENT_DATE - INTERVAL '32 days', 'Amazon Purchase', 'Shopping', NOW()),
(84, 1, -42.00, CURRENT_DATE - INTERVAL '25 days', 'Haircut', 'Personal Care', NOW());

-- Primary Checking - ATM withdrawals (with fees)
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "Fee", "CreatedAt") VALUES
(84, 1, -100.00, CURRENT_DATE - INTERVAL '55 days', 'ATM Withdrawal', 'Cash', 2.50, NOW()),
(84, 1, -60.00, CURRENT_DATE - INTERVAL '30 days', 'ATM Withdrawal', 'Cash', 2.50, NOW());

-- High-Yield Savings - Deposits from checking
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "CreatedAt") VALUES
(85, 0, 500.00, CURRENT_DATE - INTERVAL '44 days', 'Transfer from Checking', 'Transfer', NOW()),
(85, 0, 500.00, CURRENT_DATE - INTERVAL '16 days', 'Transfer from Checking', 'Transfer', NOW());

-- High-Yield Savings - Interest payments
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "CreatedAt") VALUES
(85, 0, 91.87, CURRENT_DATE - INTERVAL '30 days', 'Interest Payment', 'Interest', NOW()),
(85, 0, 92.56, CURRENT_DATE, 'Interest Payment', 'Interest', NOW());

-- High-Yield Savings - Large deposit
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "CreatedAt") VALUES
(85, 0, 5000.00, CURRENT_DATE - INTERVAL '40 days', 'Tax Refund Deposit', 'Income', NOW());

-- High-Yield Savings - Emergency withdrawal
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "CreatedAt") VALUES
(85, 1, -1200.00, CURRENT_DATE - INTERVAL '18 days', 'Emergency Car Repair', 'Emergency', NOW());

-- Money Market - Initial deposit
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "CreatedAt") VALUES
(86, 0, 10000.00, CURRENT_DATE - INTERVAL '90 days', 'Initial Deposit', 'Transfer', NOW());

-- Money Market - Additional deposits
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "CreatedAt") VALUES
(86, 0, 2000.00, CURRENT_DATE - INTERVAL '50 days', 'Bonus Deposit', 'Income', NOW());

-- Money Market - Interest payments
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "CreatedAt") VALUES
(86, 0, 43.33, CURRENT_DATE - INTERVAL '30 days', 'Interest Payment', 'Interest', NOW()),
(86, 0, 53.95, CURRENT_DATE, 'Interest Payment', 'Interest', NOW());

-- Money Market - Withdrawal
INSERT INTO "Transactions" ("AccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "CreatedAt") VALUES
(86, 1, -500.00, CURRENT_DATE - INTERVAL '35 days', 'Investment Transfer', 'Investment', NOW());
