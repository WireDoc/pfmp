using System.Globalization;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;
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
            var accountsToAdd = new List<CashAccount>();

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
                    var rowNumber = csv.Context.Parser.Row;

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

                // Batch insert valid accounts
                if (accountsToAdd.Any())
                {
                    await _context.CashAccounts.AddRangeAsync(accountsToAdd);
                    await _context.SaveChangesAsync();

                    result.SuccessCount = accountsToAdd.Count;
                    result.ImportedAccountIds = accountsToAdd.Select(a => a.CashAccountId.ToString()).ToList();
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

        private CashAccount ParseCashAccountRow(CsvReader csv, int userId)
        {
            var account = new CashAccount
            {
                CashAccountId = Guid.NewGuid(),
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Required fields
            account.Institution = csv.GetField<string>("Institution") ?? string.Empty;
            account.AccountType = csv.GetField<string>("AccountType")?.ToLower() ?? "checking";
            
            var balanceStr = csv.GetField<string>("Balance");
            account.Balance = decimal.TryParse(balanceStr, out var balance) ? balance : 0;

            // Optional fields
            account.Nickname = csv.GetField<string>("Nickname") ?? $"{account.Institution} {account.AccountType}";

            var aprStr = csv.GetField<string>("InterestRateApr");
            if (!string.IsNullOrWhiteSpace(aprStr) && decimal.TryParse(aprStr, out var apr))
            {
                account.InterestRateApr = apr;
            }

            account.Purpose = csv.GetField<string>("Purpose");

            var isEmergencyStr = csv.GetField<string>("IsEmergencyFund")?.ToLower();
            account.IsEmergencyFund = isEmergencyStr is "true" or "1" or "yes";

            return account;
        }

        private void ValidateCashAccount(CashAccount account, int rowNumber, CsvImportResult result)
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
            var validTypes = new[] { "checking", "savings", "money_market" };
            if (!validTypes.Contains(account.AccountType))
            {
                result.Errors.Add(new CsvImportError
                {
                    Row = rowNumber,
                    Field = "AccountType",
                    Message = $"AccountType must be one of: {string.Join(", ", validTypes)}"
                });
                result.ErrorCount++;
            }

            // Validate Balance
            if (account.Balance < 0)
            {
                result.Errors.Add(new CsvImportError
                {
                    Row = rowNumber,
                    Field = "Balance",
                    Message = "Balance cannot be negative"
                });
                result.ErrorCount++;
            }

            // Validate InterestRateApr if provided
            if (account.InterestRateApr.HasValue && (account.InterestRateApr < 0 || account.InterestRateApr > 100))
            {
                result.Errors.Add(new CsvImportError
                {
                    Row = rowNumber,
                    Field = "InterestRateApr",
                    Message = "Interest rate must be between 0 and 100"
                });
                result.ErrorCount++;
            }

            // Validate Nickname length
            if (!string.IsNullOrEmpty(account.Nickname) && account.Nickname.Length > 200)
            {
                result.Errors.Add(new CsvImportError
                {
                    Row = rowNumber,
                    Field = "Nickname",
                    Message = "Nickname must be 200 characters or less"
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
