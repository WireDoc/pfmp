using System.Globalization;
using System.Text.RegularExpressions;
using UglyToad.PdfPig;

namespace PFMP_API.Services
{
    /// <summary>
    /// Parses SF-50 (Notification of Personnel Action) PDF documents.
    /// SF-50 is a standardized OPM form with numbered boxes containing personnel data.
    /// </summary>
    public class Sf50ParserService
    {
        private readonly ILogger<Sf50ParserService> _logger;

        public Sf50ParserService(ILogger<Sf50ParserService> logger)
        {
            _logger = logger;
        }

        public Sf50ParseResult Parse(Stream pdfStream)
        {
            var result = new Sf50ParseResult();

            try
            {
                using var document = PdfDocument.Open(pdfStream);
                var fullText = string.Join("\n", document.GetPages().Select(p => p.Text));

                _logger.LogInformation("SF-50 PDF extracted, {Length} chars", fullText.Length);

                // Normalize whitespace for easier matching
                var text = Regex.Replace(fullText, @"\s+", " ");

                // Box 15: Pay Plan, Grade, Step (e.g., "GS-13-10" or "GS 13 10")
                result.PayGrade = ExtractPayGrade(text);

                // Box 18: Annual Rate of Basic Pay
                result.AnnualBasicPay = ExtractCurrency(text,
                    @"(?:18[.\-\s]*A?[.\s]*(?:Annual\s*Rate|Basic\s*Pay)[^$]*?\$?\s*)([\d,]+\.?\d*)",
                    @"(?:Annual\s*(?:Rate|Salary|Basic\s*Pay))[^$]*?\$?\s*([\d,]+\.?\d*)");

                // Box 20: Pay Basis (Per Annum, Per Hour, etc.)
                result.PayBasis = ExtractPattern(text,
                    @"(?:20[.\-\s]*Pay\s*Basis[:\s]*)(Per\s*\w+|PA|PH)",
                    @"Pay\s*Basis[:\s]*(Per\s*Annum|PA)");

                // Box 24: Agency
                result.Agency = ExtractPattern(text,
                    @"(?:24[.\-\s]*Agency[:\s]*)([A-Z][A-Za-z\s&\-]+?)(?:\s*\d|\s*25)",
                    @"(?:Agency[:\s]+)([A-Z][A-Za-z\s&\-]{3,50})");

                // Box 30: Retirement Plan (FERS, CSRS, FERS-RAE, FERS-FRAE, etc.)
                result.RetirementPlan = ExtractPattern(text,
                    @"(?:30[.\-\s]*Retirement\s*Plan[:\s]*)(FERS[\-\s]?(?:RAE|FRAE)?|CSRS[\-\s]?(?:Offset)?|[A-Z]{1,2})",
                    @"Retirement\s*Plan[:\s]*(FERS[\-\s]?(?:RAE|FRAE)?|CSRS[\-\s]?(?:Offset)?)");

                // Box 31: Service Computation Date (Retirement) — mm/dd/yyyy or mm-dd-yyyy
                result.ServiceComputationDate = ExtractDate(text,
                    @"(?:31[.\-\s]*(?:Service\s*Comp\.?\s*Date|SCD)[^0-9]*?)(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})",
                    @"(?:SCD|Service\s*Comp)[^0-9]*?(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})");

                // Box 6: Date of Birth
                result.DateOfBirth = ExtractDate(text,
                    @"(?:6[.\-\s]*(?:Date\s*of\s*Birth|DOB|Birth\s*Date)[^0-9]*?)(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})",
                    @"(?:Date\s*of\s*Birth|DOB)[^0-9]*?(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})");

                // Box 34: Position Title
                result.PositionTitle = ExtractPattern(text,
                    @"(?:34[.\-\s]*Position\s*Title[:\s]*)([A-Za-z\s\-/,]+?)(?:\s*\d{2}|\s*35)",
                    @"Position\s*Title[:\s]*([A-Za-z\s\-/,]{5,80})");

                // FEGLI coverage code (Box 35 or nearby)
                result.FegliCode = ExtractPattern(text,
                    @"(?:35[.\-\s]*FEGLI[:\s]*)([A-Za-z0-9\s\+]+?)(?:\s*\d{2}|\s*36)",
                    @"FEGLI[:\s]*([A-Za-z0-9\s\+]{1,30})");

                result.ParsedSuccessfully = true;
                result.RawText = fullText;

                var foundFields = new List<string>();
                if (result.PayGrade != null) foundFields.Add("PayGrade");
                if (result.AnnualBasicPay.HasValue) foundFields.Add("AnnualBasicPay");
                if (result.Agency != null) foundFields.Add("Agency");
                if (result.RetirementPlan != null) foundFields.Add("RetirementPlan");
                if (result.ServiceComputationDate.HasValue) foundFields.Add("SCD");
                if (result.DateOfBirth.HasValue) foundFields.Add("DOB");
                if (result.PositionTitle != null) foundFields.Add("PositionTitle");
                if (result.FegliCode != null) foundFields.Add("FEGLI");

                _logger.LogInformation("SF-50 parsed: {Count} fields found [{Fields}]",
                    foundFields.Count, string.Join(", ", foundFields));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse SF-50 PDF");
                result.ParsedSuccessfully = false;
                result.ErrorMessage = "Could not read the PDF. Ensure it is a valid SF-50 document.";
            }

            return result;
        }

        private string? ExtractPayGrade(string text)
        {
            // Try "GS-13-10", "GS 13 10", "GS-13/10", "WG-12-05"
            var patterns = new[]
            {
                @"(?:15[.\-\s]*(?:Pay\s*Plan|Grade)[^A-Z]*?)([A-Z]{2}[\-\s]?\d{1,2}[\-\s/]?\d{1,2})",
                @"\b(GS[\-\s]?\d{1,2}[\-\s/]?\d{1,2})\b",
                @"\b(WG[\-\s]?\d{1,2}[\-\s/]?\d{1,2})\b",
                @"\b(ES[\-\s]?\d{1,2})\b",
                @"\b(SES[\-\s]?\d{1,2})\b"
            };

            foreach (var pattern in patterns)
            {
                var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase);
                if (match.Success)
                    return Regex.Replace(match.Groups[1].Value.Trim(), @"\s+", "-").ToUpper();
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
                    if (decimal.TryParse(numStr, NumberStyles.Number, CultureInfo.InvariantCulture, out var value) && value > 1000)
                        return value;
                }
            }
            return null;
        }

        private DateTime? ExtractDate(string text, params string[] patterns)
        {
            foreach (var pattern in patterns)
            {
                var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase);
                if (match.Success)
                {
                    var dateStr = match.Groups[1].Value.Trim();
                    if (DateTime.TryParse(dateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                        return date;
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
    }

    public class Sf50ParseResult
    {
        public bool ParsedSuccessfully { get; set; }
        public string? ErrorMessage { get; set; }
        public string? RawText { get; set; }

        // Extracted fields
        public string? PayGrade { get; set; }            // Box 15
        public decimal? AnnualBasicPay { get; set; }     // Box 18
        public string? PayBasis { get; set; }            // Box 20
        public string? Agency { get; set; }              // Box 24
        public string? RetirementPlan { get; set; }      // Box 30
        public DateTime? ServiceComputationDate { get; set; } // Box 31
        public DateTime? DateOfBirth { get; set; }       // Box 6
        public string? PositionTitle { get; set; }       // Box 34
        public string? FegliCode { get; set; }           // Box 35
    }
}
