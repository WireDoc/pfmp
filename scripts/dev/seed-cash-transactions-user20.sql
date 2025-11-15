-- Seed CashTransactions for User 20's test accounts
-- CashAccountId '71d71082-1e50-4c3a-9f21-2f05b1cfcf82': Primary Checking
-- CashAccountId '9383938b-44e2-4cd1-9045-2ac83482c899': High-Yield Savings
-- CashAccountId '65d6d651-3222-4d63-98e4-338b3ce111a5': Money Market Fund

-- Primary Checking - Salary deposits (bi-weekly, last 60 days)
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "IsPending", "IsRecurring", "CreatedAt") VALUES
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Deposit', 3250.00, CURRENT_DATE - INTERVAL '56 days', 'Direct Deposit - Salary', 'Income', false, true, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Deposit', 3250.00, CURRENT_DATE - INTERVAL '42 days', 'Direct Deposit - Salary', 'Income', false, true, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Deposit', 3250.00, CURRENT_DATE - INTERVAL '28 days', 'Direct Deposit - Salary', 'Income', false, true, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Deposit', 3250.00, CURRENT_DATE - INTERVAL '14 days', 'Direct Deposit - Salary', 'Income', false, true, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Deposit', 3250.00, CURRENT_DATE, 'Direct Deposit - Salary', 'Income', false, true, NOW());

-- Primary Checking - Rent/Mortgage
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "CheckNumber", "IsPending", "IsRecurring", "CreatedAt") VALUES
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -1850.00, CURRENT_DATE - INTERVAL '55 days', 'Rent Payment', 'Housing', '1001', false, true, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -1850.00, CURRENT_DATE - INTERVAL '25 days', 'Rent Payment', 'Housing', '1002', false, true, NOW());

-- Primary Checking - Utilities
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "Merchant", "IsPending", "IsRecurring", "CreatedAt") VALUES
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -125.50, CURRENT_DATE - INTERVAL '52 days', 'Electric Bill', 'Utilities', 'Power Company', false, true, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -89.99, CURRENT_DATE - INTERVAL '48 days', 'Internet Service', 'Utilities', 'ISP Provider', false, true, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -132.75, CURRENT_DATE - INTERVAL '22 days', 'Electric Bill', 'Utilities', 'Power Company', false, true, NOW());

-- Primary Checking - Groceries (weekly)
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "Merchant", "IsPending", "IsRecurring", "CreatedAt") VALUES
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -142.50, CURRENT_DATE - INTERVAL '58 days', 'Weekly Groceries', 'Groceries', 'Safeway', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -95.75, CURRENT_DATE - INTERVAL '51 days', 'Weekly Groceries', 'Groceries', 'Trader Joes', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -178.30, CURRENT_DATE - INTERVAL '44 days', 'Weekly Groceries', 'Groceries', 'Whole Foods', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -128.90, CURRENT_DATE - INTERVAL '37 days', 'Weekly Groceries', 'Groceries', 'Safeway', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -156.25, CURRENT_DATE - INTERVAL '30 days', 'Weekly Groceries', 'Groceries', 'Giant', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -112.40, CURRENT_DATE - INTERVAL '23 days', 'Weekly Groceries', 'Groceries', 'Trader Joes', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -145.80, CURRENT_DATE - INTERVAL '16 days', 'Weekly Groceries', 'Groceries', 'Safeway', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -98.60, CURRENT_DATE - INTERVAL '9 days', 'Weekly Groceries', 'Groceries', 'Whole Foods', false, false, NOW());

-- Primary Checking - Gas
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "Merchant", "IsPending", "IsRecurring", "CreatedAt") VALUES
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -62.50, CURRENT_DATE - INTERVAL '57 days', 'Gasoline', 'Transportation', 'Shell', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -58.75, CURRENT_DATE - INTERVAL '47 days', 'Gasoline', 'Transportation', 'Chevron', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -71.20, CURRENT_DATE - INTERVAL '37 days', 'Gasoline', 'Transportation', 'BP', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -54.90, CURRENT_DATE - INTERVAL '27 days', 'Gasoline', 'Transportation', 'Shell', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -68.40, CURRENT_DATE - INTERVAL '17 days', 'Gasoline', 'Transportation', 'Chevron', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -59.80, CURRENT_DATE - INTERVAL '7 days', 'Gasoline', 'Transportation', 'BP', false, false, NOW());

-- Primary Checking - Restaurants/Dining
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "Merchant", "IsPending", "IsRecurring", "CreatedAt") VALUES
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -45.80, CURRENT_DATE - INTERVAL '58 days', 'Lunch', 'Dining', 'Chipotle', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -78.50, CURRENT_DATE - INTERVAL '53 days', 'Dinner', 'Dining', 'Local Restaurant', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -32.90, CURRENT_DATE - INTERVAL '46 days', 'Pizza', 'Dining', 'Pizza Place', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -56.75, CURRENT_DATE - INTERVAL '42 days', 'Thai Food', 'Dining', 'Thai Food', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -28.40, CURRENT_DATE - INTERVAL '35 days', 'Coffee', 'Dining', 'Coffee Shop', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -92.30, CURRENT_DATE - INTERVAL '28 days', 'Dinner', 'Dining', 'Local Restaurant', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -41.60, CURRENT_DATE - INTERVAL '22 days', 'Lunch', 'Dining', 'Chipotle', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -65.90, CURRENT_DATE - INTERVAL '15 days', 'Dinner', 'Dining', 'Thai Food', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -38.20, CURRENT_DATE - INTERVAL '9 days', 'Pizza', 'Dining', 'Pizza Place', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -52.70, CURRENT_DATE - INTERVAL '3 days', 'Coffee & Snack', 'Dining', 'Coffee Shop', false, false, NOW());

-- Primary Checking - Entertainment & Health
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "Merchant", "IsPending", "IsRecurring", "CreatedAt") VALUES
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -89.99, CURRENT_DATE - INTERVAL '50 days', 'Gym Membership', 'Health', 'LA Fitness', false, true, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -45.00, CURRENT_DATE - INTERVAL '38 days', 'Movie Tickets', 'Entertainment', 'AMC Theatres', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -89.99, CURRENT_DATE - INTERVAL '20 days', 'Gym Membership', 'Health', 'LA Fitness', false, true, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -15.99, CURRENT_DATE - INTERVAL '40 days', 'Streaming Service', 'Entertainment', 'Netflix', false, true, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -12.99, CURRENT_DATE - INTERVAL '40 days', 'Music Streaming', 'Entertainment', 'Spotify', false, true, NOW());

-- Primary Checking - Transfers to savings
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "IsPending", "IsRecurring", "CreatedAt") VALUES
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Transfer', -500.00, CURRENT_DATE - INTERVAL '44 days', 'Transfer to Savings', 'Transfer', false, true, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Transfer', -500.00, CURRENT_DATE - INTERVAL '16 days', 'Transfer to Savings', 'Transfer', false, true, NOW());

-- Primary Checking - Miscellaneous
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "Merchant", "IsPending", "IsRecurring", "CreatedAt") VALUES
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -32.50, CURRENT_DATE - INTERVAL '49 days', 'Prescription', 'Healthcare', 'CVS Pharmacy', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -125.00, CURRENT_DATE - INTERVAL '45 days', 'Car Insurance', 'Insurance', 'Geico', false, true, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -78.45, CURRENT_DATE - INTERVAL '32 days', 'Online Purchase', 'Shopping', 'Amazon', false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -42.00, CURRENT_DATE - INTERVAL '25 days', 'Haircut', 'Personal Care', 'Hair Salon', false, false, NOW());

-- Primary Checking - ATM withdrawals (with fees)
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "Fee", "IsPending", "IsRecurring", "CreatedAt") VALUES
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -100.00, CURRENT_DATE - INTERVAL '55 days', 'ATM Withdrawal', 'Cash', 2.50, false, false, NOW()),
('71d71082-1e50-4c3a-9f21-2f05b1cfcf82', 'Withdrawal', -60.00, CURRENT_DATE - INTERVAL '30 days', 'ATM Withdrawal', 'Cash', 2.50, false, false, NOW());

-- High-Yield Savings - Deposits from checking
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "IsPending", "IsRecurring", "CreatedAt") VALUES
('9383938b-44e2-4cd1-9045-2ac83482c899', 'Transfer', 500.00, CURRENT_DATE - INTERVAL '44 days', 'Transfer from Checking', 'Transfer', false, true, NOW()),
('9383938b-44e2-4cd1-9045-2ac83482c899', 'Transfer', 500.00, CURRENT_DATE - INTERVAL '16 days', 'Transfer from Checking', 'Transfer', false, true, NOW());

-- High-Yield Savings - Interest payments
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "IsPending", "IsRecurring", "CreatedAt") VALUES
('9383938b-44e2-4cd1-9045-2ac83482c899', 'Interest', 91.87, CURRENT_DATE - INTERVAL '30 days', 'Monthly Interest Payment', 'Interest', false, true, NOW()),
('9383938b-44e2-4cd1-9045-2ac83482c899', 'Interest', 92.56, CURRENT_DATE, 'Monthly Interest Payment', 'Interest', false, true, NOW());

-- High-Yield Savings - Large deposit
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "IsPending", "IsRecurring", "CreatedAt") VALUES
('9383938b-44e2-4cd1-9045-2ac83482c899', 'Deposit', 5000.00, CURRENT_DATE - INTERVAL '40 days', 'Tax Refund Deposit', 'Income', false, false, NOW());

-- High-Yield Savings - Emergency withdrawal
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "Notes", "IsPending", "IsRecurring", "CreatedAt") VALUES
('9383938b-44e2-4cd1-9045-2ac83482c899', 'Withdrawal', -1200.00, CURRENT_DATE - INTERVAL '18 days', 'Emergency Car Repair', 'Emergency', 'Transmission repair after breakdown', false, false, NOW());

-- Money Market - Initial deposit
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "IsPending", "IsRecurring", "CreatedAt") VALUES
('65d6d651-3222-4d63-98e4-338b3ce111a5', 'Deposit', 10000.00, CURRENT_DATE - INTERVAL '90 days', 'Initial Deposit', 'Transfer', false, false, NOW());

-- Money Market - Additional deposits
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "IsPending", "IsRecurring", "CreatedAt") VALUES
('65d6d651-3222-4d63-98e4-338b3ce111a5', 'Deposit', 2000.00, CURRENT_DATE - INTERVAL '50 days', 'Bonus Deposit', 'Income', false, false, NOW());

-- Money Market - Interest payments
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "IsPending", "IsRecurring", "CreatedAt") VALUES
('65d6d651-3222-4d63-98e4-338b3ce111a5', 'Interest', 43.33, CURRENT_DATE - INTERVAL '30 days', 'Monthly Interest Payment', 'Interest', false, true, NOW()),
('65d6d651-3222-4d63-98e4-338b3ce111a5', 'Interest', 53.95, CURRENT_DATE, 'Monthly Interest Payment', 'Interest', false, true, NOW());

-- Money Market - Withdrawal
INSERT INTO "CashTransactions" ("CashAccountId", "TransactionType", "Amount", "TransactionDate", "Description", "Category", "Notes", "IsPending", "IsRecurring", "CreatedAt") VALUES
('65d6d651-3222-4d63-98e4-338b3ce111a5', 'Withdrawal', -500.00, CURRENT_DATE - INTERVAL '35 days', 'Investment Opportunity', 'Investment', 'Moving funds to brokerage', false, false, NOW());
