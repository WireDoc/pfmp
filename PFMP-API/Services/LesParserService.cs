using System.Globalization;
using System.Text.RegularExpressions;
using UglyToad.PdfPig;

namespace PFMP_API.Services
{
    /// <summary>
    /// Parses LES (Leave and Earnings Statement) PDF documents.
    /// LES is a standardized federal pay stub showing earnings, deductions, leave, and benefits.
    /// </summary>
    public class LesParserService
    {
        private readonly ILogger<LesParserService> _logger;

        public LesParserService(ILogger<LesParserService> logger)
        {
            _logger = logger;
        }

        public LesParseResult Parse(Stream pdfStream)
        {
            var result = new LesParseResult();

            try
            {
                using var document = PdfDocument.Open(pdfStream);
                var fullText = string.Join("\n", document.GetPages().Select(p => p.Text));

                _logger.LogInformation("LES PDF extracted, {Length} chars", fullText.Length);

                var text = Regex.Replace(fullText, @"\s+", " ");

                // Pay Period
                result.PayPeriod = ExtractPattern(text,
                    @"(?:Pay\s*Period|PP)[:\s]*(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4}\s*(?:to|through|[-–])\s*\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})",
                    @"(?:Pay\s*Period|PP)[:\s]*(\d{1,2}\s*\d{4})");

                // Pay Grade / Grade-Step
                result.PayGrade = ExtractPattern(text,
                    @"\b(GS[\-\s]?\d{1,2}[\-\s/]?\d{1,2})\b",
                    @"(?:Grade|Pay\s*Plan)[:\s]*([A-Z]{2}[\-\s]?\d{1,2}[\-\s/]?\d{1,2})");

                // Base Pay / Basic Pay (per-period and annual)
                result.AnnualBasicPay = ExtractCurrency(text,
                    @"(?:Annual(?:ized)?|Adj)\s*(?:Basic\s*)?(?:Pay|Salary)[^$]*?\$?\s*([\d,]+\.?\d*)",
                    @"(?:Base\s*Pay|Basic\s*Pay)[^$]*?(?:Annual|YTD)[^$]*?\$?\s*([\d,]+\.?\d*)");

                result.BiweeklyGross = ExtractCurrency(text,
                    @"(?:Gross\s*(?:Pay|Earnings?))[^$]*?\$?\s*([\d,]+\.?\d*)",
                    @"(?:Total\s*(?:Gross|Earnings?))[^$]*?\$?\s*([\d,]+\.?\d*)");

                result.BiweeklyNet = ExtractCurrency(text,
                    @"(?:Net\s*Pay)[^$]*?\$?\s*([\d,]+\.?\d*)",
                    @"(?:Net\s*(?:Amount|Check))[^$]*?\$?\s*([\d,]+\.?\d*)");

                // === DEDUCTIONS ===

                // FEGLI (Federal Employees Group Life Insurance)
                result.FegliDeduction = ExtractDeduction(text, "FEGLI", "Life\\s*Ins");

                // FEHB (Federal Employees Health Benefits)
                result.FehbDeduction = ExtractDeduction(text, "FEHB", "Health\\s*(?:Ins|Ben|Prem)");

                // FEDVIP Dental
                result.FedvipDentalDeduction = ExtractDeduction(text, "FEDVIP.*Dental", "Dental");

                // FEDVIP Vision
                result.FedvipVisionDeduction = ExtractDeduction(text, "FEDVIP.*Vision", "Vision");

                // TSP (Thrift Savings Plan) — Employee contribution
                result.TspEmployeeDeduction = ExtractDeduction(text,
                    "TSP(?!.*(?:Match|Agency|Catch))", "Thrift(?!.*(?:Match|Agency|Catch))");

                // TSP Roth
                result.TspRothDeduction = ExtractDeduction(text, "TSP.*Roth", "Roth.*TSP");

                // TSP Catch-Up
                result.TspCatchUpDeduction = ExtractDeduction(text, "TSP.*Catch", "Catch.*Up");

                // Agency TSP Match
                result.TspAgencyMatch = ExtractDeduction(text, "TSP.*(?:Match|Agency)", "Agency.*(?:Match|TSP)");

                // FERS/CSRS Retirement contribution
                result.RetirementDeduction = ExtractDeduction(text, "FERS", "CSRS", "Retirement");

                // Federal Tax Withholding
                result.FederalTaxWithholding = ExtractDeduction(text, "Federal\\s*Tax", "Fed\\s*(?:Tax|W/?H|Withhold)");

                // State Tax Withholding
                result.StateTaxWithholding = ExtractDeduction(text, "State\\s*Tax", "State\\s*(?:W/?H|Withhold)");

                // OASDI (Social Security)
                result.OasdiDeduction = ExtractDeduction(text, "OASDI", "Soc(?:ial)?\\s*Sec");

                // Medicare
                result.MedicareDeduction = ExtractDeduction(text, "Medicare", "HI\\s*Tax");

                // FSA
                result.FsaDeduction = ExtractDeduction(text, "FSA", "Flex(?:ible)?\\s*Spend");

                // HSA
                result.HsaDeduction = ExtractDeduction(text, "HSA", "Health\\s*Sav");

                // FLTCIP (Long Term Care)
                result.FltcipDeduction = ExtractDeduction(text, "FLTCIP", "Long\\s*Term\\s*Care", "LTC");

                // Leave balances
                result.AnnualLeaveBalance = ExtractLeaveHours(text, "Annual");
                result.SickLeaveBalance = ExtractLeaveHours(text, "Sick");

                result.ParsedSuccessfully = true;
                result.RawText = fullText;

                var foundFields = CountPopulatedFields(result);
                _logger.LogInformation("LES parsed: {Count} fields extracted", foundFields);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse LES PDF");
                result.ParsedSuccessfully = false;
                result.ErrorMessage = "Could not read the PDF. Ensure it is a valid LES document.";
            }

            return result;
        }

        private decimal? ExtractDeduction(string text, params string[] labelPatterns)
        {
            foreach (var label in labelPatterns)
            {
                // Look for the label followed by a dollar amount (current period deduction)
                var pattern = $@"(?:{label})[^$\d]*?\$?\s*([\d,]+\.?\d{{0,2}})";
                var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase);
                if (match.Success)
                {
                    var numStr = match.Groups[1].Value.Replace(",", "").Trim();
                    if (decimal.TryParse(numStr, NumberStyles.Number, CultureInfo.InvariantCulture, out var value) && value > 0)
                        return value;
                }
            }
            return null;
        }

        private decimal? ExtractLeaveHours(string text, string leaveType)
        {
            var patterns = new[]
            {
                $@"(?:{leaveType}\s*Leave)[^0-9]*?(?:Bal(?:ance)?|Current|Available)[^0-9]*?([\d.]+)",
                $@"(?:{leaveType})[^0-9]*?([\d.]+)\s*(?:hrs?|hours?)"
            };

            foreach (var pattern in patterns)
            {
                var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase);
                if (match.Success && decimal.TryParse(match.Groups[1].Value, NumberStyles.Number,
                    CultureInfo.InvariantCulture, out var hours))
                {
                    return hours;
                }
            }
            return null;
        }

        private decimal? ExtractCurrency(string text, params string[] patterns)
        {
            foreach (var pattern in patterns)
            {
                var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase);
                if (match.Success)
                {
                    var numStr = match.Groups[1].Value.Replace(",", "").Trim();
                    if (decimal.TryParse(numStr, NumberStyles.Number, CultureInfo.InvariantCulture, out var value) && value > 100)
                        return value;
                }
            }
            return null;
        }

        private string? ExtractPattern(string text, params string[] patterns)
        {
            foreach (var pattern in patterns)
            {
                var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase);
                if (match.Success)
                {
                    var value = match.Groups[1].Value.Trim();
                    if (!string.IsNullOrWhiteSpace(value))
                        return value;
                }
            }
            return null;
        }

        private int CountPopulatedFields(LesParseResult result)
        {
            int count = 0;
            if (result.PayGrade != null) count++;
            if (result.AnnualBasicPay.HasValue) count++;
            if (result.BiweeklyGross.HasValue) count++;
            if (result.BiweeklyNet.HasValue) count++;
            if (result.FegliDeduction.HasValue) count++;
            if (result.FehbDeduction.HasValue) count++;
            if (result.TspEmployeeDeduction.HasValue) count++;
            if (result.TspAgencyMatch.HasValue) count++;
            if (result.RetirementDeduction.HasValue) count++;
            if (result.FederalTaxWithholding.HasValue) count++;
            if (result.StateTaxWithholding.HasValue) count++;
            if (result.OasdiDeduction.HasValue) count++;
            if (result.MedicareDeduction.HasValue) count++;
            return count;
        }
    }

    public class LesParseResult
    {
        public bool ParsedSuccessfully { get; set; }
        public string? ErrorMessage { get; set; }
        public string? RawText { get; set; }

        // Pay info
        public string? PayPeriod { get; set; }
        public string? PayGrade { get; set; }
        public decimal? AnnualBasicPay { get; set; }
        public decimal? BiweeklyGross { get; set; }
        public decimal? BiweeklyNet { get; set; }

        // Benefit deductions (biweekly amounts)
        public decimal? FegliDeduction { get; set; }
        public decimal? FehbDeduction { get; set; }
        public decimal? FedvipDentalDeduction { get; set; }
        public decimal? FedvipVisionDeduction { get; set; }
        public decimal? FltcipDeduction { get; set; }
        public decimal? FsaDeduction { get; set; }
        public decimal? HsaDeduction { get; set; }

        // TSP deductions (biweekly)
        public decimal? TspEmployeeDeduction { get; set; }
        public decimal? TspRothDeduction { get; set; }
        public decimal? TspCatchUpDeduction { get; set; }
        public decimal? TspAgencyMatch { get; set; }

        // Tax deductions (biweekly)
        public decimal? RetirementDeduction { get; set; }  // FERS/CSRS
        public decimal? FederalTaxWithholding { get; set; }
        public decimal? StateTaxWithholding { get; set; }
        public decimal? OasdiDeduction { get; set; }
        public decimal? MedicareDeduction { get; set; }

        // Leave
        public decimal? AnnualLeaveBalance { get; set; }
        public decimal? SickLeaveBalance { get; set; }
    }
}
