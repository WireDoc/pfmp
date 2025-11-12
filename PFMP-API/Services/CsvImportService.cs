using System.Globalization;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;

namespace PFMP_API.Services
{
    /// <summary>
    /// Service for importing cash accounts from CSV files
    /// </summary>
    public class CsvImportService
    {
        private readonly ApplicationDbContext _context;

        public CsvImportService(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Import cash accounts from CSV file stream
        /// </summary>
        public async Task<CsvImportResult> ImportCashAccountsAsync(Stream csvStream, int userId)
        {
            var result = new CsvImportResult();
            var accountsToAdd = new List<Account>();

            using var reader = new StreamReader(csvStream, Encoding.UTF8);
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null, // Don't throw on missing optional columns
                MissingFieldFound = null, // Don't throw on missing values
                TrimOptions = TrimOptions.Trim,
            };

            using var csv = new CsvReader(reader, config);

            try
            {
                csv.Read();
                csv.ReadHeader();
                result.TotalRows = 0;

                while (csv.Read())
                {
                    result.TotalRows++;
                    var rowNumber = csv.Context.Parser?.Row ?? 0;

                    try
                    {
                        var record = ParseCashAccountRow(csv, userId);
                        ValidateCashAccount(record, rowNumber, result);

                        if (result.Errors.Count == 0 || result.Errors.All(e => e.Row != rowNumber))
                        {
                            accountsToAdd.Add(record);
                        }
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add(new CsvImportError
                        {
                            Row = rowNumber,
                            Field = "General",
                            Message = ex.Message
                        });
                        result.ErrorCount++;
                    }
                }

                // Batch insert valid accounts into unified Accounts table
                if (accountsToAdd.Any())
                {
                    await _context.Accounts.AddRangeAsync(accountsToAdd);
                    await _context.SaveChangesAsync();

                    result.SuccessCount = accountsToAdd.Count;
                    result.ImportedAccountIds = accountsToAdd.Select(a => a.AccountId.ToString()).ToList();
                }
            }
            catch (Exception ex)
            {
                result.Errors.Add(new CsvImportError
                {
                    Row = 0,
                    Field = "File",
                    Message = $"Failed to parse CSV file: {ex.Message}"
                });
                result.ErrorCount++;
            }

            return result;
        }

        private Account ParseCashAccountRow(CsvReader csv, int userId)
        {
            var now = DateTime.UtcNow;
            
            // Parse CSV fields
            var institution = csv.GetField<string>("Institution") ?? string.Empty;
            var accountTypeStr = csv.GetField<string>("AccountType")?.ToLower() ?? "checking";
            var nickname = csv.GetField<string>("Nickname");
            var balanceStr = csv.GetField<string>("Balance");
            var balance = decimal.TryParse(balanceStr, out var bal) ? bal : 0;
            var aprStr = csv.GetField<string>("InterestRateApr");
            var purpose = csv.GetField<string>("Purpose");
            var isEmergencyStr = csv.GetField<string>("IsEmergencyFund")?.ToLower();
            var isEmergencyFund = isEmergencyStr is "true" or "1" or "yes";

            // Map account type string to enum
            var accountType = accountTypeStr switch
            {
                "checking" => AccountType.Checking,
                "savings" => AccountType.Savings,
                "money_market" or "money market" => AccountType.MoneyMarket,
                "cd" or "certificate_of_deposit" => AccountType.CertificateOfDeposit,
                _ => AccountType.Checking
            };

            var account = new Account
            {
                UserId = userId,
                AccountName = nickname ?? $"{institution} {accountTypeStr}",
                AccountType = accountType,
                Category = AccountCategory.Cash,
                Institution = institution,
                CurrentBalance = balance,
                InterestRate = decimal.TryParse(aprStr, out var apr) ? apr / 100m : null, // Convert APR% to decimal
                IsEmergencyFund = isEmergencyFund,
                Purpose = purpose,
                CreatedAt = now,
                UpdatedAt = now,
                LastBalanceUpdate = now,
                IsActive = true
            };

            return account;
        }

        private void ValidateCashAccount(Account account, int rowNumber, CsvImportResult result)
        {
            // Validate Institution
            if (string.IsNullOrWhiteSpace(account.Institution))
            {
                result.Errors.Add(new CsvImportError
                {
                    Row = rowNumber,
                    Field = "Institution",
                    Message = "Institution is required"
                });
                result.ErrorCount++;
            }
            else if (account.Institution.Length > 150)
            {
                result.Errors.Add(new CsvImportError
                {
                    Row = rowNumber,
                    Field = "Institution",
                    Message = "Institution must be 150 characters or less"
                });
                result.ErrorCount++;
            }

            // Validate AccountType
            var validTypes = new[] { AccountType.Checking, AccountType.Savings, AccountType.MoneyMarket, AccountType.CertificateOfDeposit };
            if (!validTypes.Contains(account.AccountType))
            {
                result.Errors.Add(new CsvImportError
                {
                    Row = rowNumber,
                    Field = "AccountType",
                    Message = $"AccountType must be one of: checking, savings, money_market, cd"
                });
                result.ErrorCount++;
            }

            // Validate Balance
            if (account.CurrentBalance < 0)
            {
                result.Errors.Add(new CsvImportError
                {
                    Row = rowNumber,
                    Field = "Balance",
                    Message = "Balance cannot be negative"
                });
                result.ErrorCount++;
            }

            // Validate InterestRate if provided (stored as decimal, not percentage)
            if (account.InterestRate.HasValue && (account.InterestRate < 0 || account.InterestRate > 1))
            {
                result.Errors.Add(new CsvImportError
                {
                    Row = rowNumber,
                    Field = "InterestRateApr",
                    Message = "Interest rate must be between 0 and 100%"
                });
                result.ErrorCount++;
            }

            // Validate AccountName length
            if (!string.IsNullOrEmpty(account.AccountName) && account.AccountName.Length > 200)
            {
                result.Errors.Add(new CsvImportError
                {
                    Row = rowNumber,
                    Field = "Nickname",
                    Message = "Account name must be 200 characters or less"
                });
                result.ErrorCount++;
            }

            // Validate Purpose length
            if (!string.IsNullOrEmpty(account.Purpose) && account.Purpose.Length > 500)
            {
                result.Errors.Add(new CsvImportError
                {
                    Row = rowNumber,
                    Field = "Purpose",
                    Message = "Purpose must be 500 characters or less"
                });
                result.ErrorCount++;
            }
        }
    }

    public class CsvImportResult
    {
        public int TotalRows { get; set; }
        public int SuccessCount { get; set; }
        public int ErrorCount { get; set; }
        public List<CsvImportError> Errors { get; set; } = new();
        public List<string> ImportedAccountIds { get; set; } = new();
    }

    public class CsvImportError
    {
        public int Row { get; set; }
        public string Field { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}
