using System.Globalization;
using System.Text.RegularExpressions;
using UglyToad.PdfPig;

namespace PFMP_API.Services
{
    /// <summary>
    /// Parses DFAS Civilian Leave and Earnings Statement (LES) PDF documents.
    /// DFAS LES text is extracted as a continuous stream with no whitespace between fields.
    /// This parser uses the known DFAS label format to locate current-period and YTD amounts.
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

                // Detect image-based/scanned PDFs
                if (fullText.Trim().Length < 50)
                {
                    _logger.LogWarning("LES PDF appears to be image-based ({Length} chars extracted).",
                        fullText.Trim().Length);
                    result.ParsedSuccessfully = false;
                    result.ErrorMessage = "This LES appears to be a scanned image. " +
                        "Text-based PDFs (e.g., myPay downloads) can be parsed automatically. " +
                        "For scanned documents, please enter your information manually on the Federal Benefits tab.";
                    return result;
                }

                // DFAS LES text comes out with minimal/no whitespace between fields.
                // We keep original text for pattern matching (labels run into values).
                var text = fullText;
                // Also build a normalized version (collapse whitespace)
                var normalized = Regex.Replace(fullText, @"\s+", " ");

                // === HEADER FIELDS ===
                // Format: "GS1300" = PayPlan(GS) + Grade(13) + Step(00) right after field 4 label
                var gradeMatch = Regex.Match(normalized, @"(GS|WG|WL|WS|ES|SL|SES)(\d{2})(\d{2})", RegexOptions.IgnoreCase);
                if (gradeMatch.Success)
                {
                    var plan = gradeMatch.Groups[1].Value.ToUpper();
                    var grade = int.Parse(gradeMatch.Groups[2].Value);
                    var step = int.Parse(gradeMatch.Groups[3].Value);
                    // Step 00 typically means step 10 in DFAS encoding
                    if (step == 0) step = 10;
                    result.PayGrade = $"{plan}-{grade}-{step}";
                }

                // Pay Period End date — "03/21/26" after the Pay Period End label
                var ppMatch = Regex.Match(normalized, @"(\d{2}/\d{2}/\d{2})(\d{2}/\d{2}/\d{2})");
                if (ppMatch.Success)
                {
                    result.PayPeriod = ppMatch.Groups[1].Value;
                }

                // Annual Basic Pay — appears as the adjusted basic pay amount (e.g., "142476.00")
                // In DFAS format: the pay fields appear after GS grade/step.
                // Pattern: after the grade+step, the format is: AnnualPay.00 OTRate.00 AdjustedPay.00
                // e.g., "GS1300142476.000.00142476.00"
                var payMatch = Regex.Match(normalized, @"(?:GS|WG|WL|WS)\d{4}(\d{4,6}\.\d{2})", RegexOptions.IgnoreCase);
                if (payMatch.Success && decimal.TryParse(payMatch.Groups[1].Value, NumberStyles.Number,
                    CultureInfo.InvariantCulture, out var annualPay) && annualPay > 10000)
                {
                    result.AnnualBasicPay = annualPay;
                }

                // === SUMMARY AMOUNTS ===
                // After SCD Leave/Max carry over/Leave Year End/Financial Institution data,
                // there's the summary block: GROSS PAY, TAXABLE WAGES, etc. with current+YTD pairs.
                // === SUMMARY AMOUNTS ===
                // The summary block contains 7 row pairs (current, YTD) for:
                // GROSS PAY, TAXABLE WAGES, NONTAXABLE WAGES, TAX DEFERRED WAGES, DEDUCTIONS, AEIC, NET PAY
                // These appear in the header area as a stream of amounts.
                // Strategy: find the CURRENT EARNINGS marker (which precedes the earnings section).
                // The summary amounts come between the header data and CURRENT EARNINGS.
                // In the raw text: ...68.2768.275461.6041178.40...2891.0922474.33ROTH DATA...CURRENT EARNINGS...

                // Find the summary block: extract all ###.## amounts between FEDS and CURRENT EARNINGS
                // Exclude the "ROTH DATA...FERS:..." (section 22) that PdfPig merges into the text.
                var summaryStart = normalized.IndexOf("FEDS", StringComparison.OrdinalIgnoreCase);
                var earningsStart = normalized.IndexOf("CURRENT EARNINGS", StringComparison.OrdinalIgnoreCase);
                if (summaryStart >= 0 && earningsStart > summaryStart)
                {
                    var summaryBlock = normalized.Substring(summaryStart, earningsStart - summaryStart);
                    // Trim at "ROTH DATA" — that's section 22 (TSP contribution info), not a summary row
                    var rothDataPos = summaryBlock.IndexOf("ROTH DATA", StringComparison.OrdinalIgnoreCase);
                    if (rothDataPos > 0)
                        summaryBlock = summaryBlock.Substring(0, rothDataPos);

                    var summaryAmounts = Regex.Matches(summaryBlock, @"(\d+\.\d{2})");

                    // The amounts in order include hourly rates (small, ~68.27) then summary row pairs.
                    // Summary rows: GROSS, TAXABLE, NONTAXABLE, TAX_DEFERRED(blank), DEDUCTIONS, AEIC(blank), NET PAY
                    // Blank rows produce no amounts, so we get ~5 pairs (10 amounts) plus hourly rates.
                    // Gross pay is the first amount >= 1000 (biweekly gross for a GS employee).
                    foreach (Match amt in summaryAmounts)
                    {
                        if (decimal.TryParse(amt.Value, NumberStyles.Number,
                            CultureInfo.InvariantCulture, out var val) && val >= 1000)
                        {
                            result.BiweeklyGross = val;
                            break;
                        }
                    }

                    // Net Pay is the last pair in the summary rows (after trimming ROTH DATA).
                    // It's the second-to-last amount (current) and last amount (YTD).
                    if (summaryAmounts.Count >= 2)
                    {
                        var netPayStr = summaryAmounts[summaryAmounts.Count - 2].Value;
                        if (decimal.TryParse(netPayStr, NumberStyles.Number,
                            CultureInfo.InvariantCulture, out var netPay) && netPay > 100)
                            result.BiweeklyNet = netPay;
                    }
                }

                // === DEDUCTIONS SECTION ===
                // DFAS deductions format: TYPECODEcurrent.XXYTD.XX (no spaces)
                // The deductions appear between "DEDUCTIONS" and "LEAVE" sections.
                var deductionsSection = "";
                var dedStart = normalized.IndexOf("DEDUCTIONSTYPECODE", StringComparison.OrdinalIgnoreCase);
                if (dedStart < 0) dedStart = normalized.IndexOf("DEDUCTIONS", StringComparison.OrdinalIgnoreCase);
                var leaveStart = normalized.IndexOf("LEAVETYPE", StringComparison.OrdinalIgnoreCase);
                if (leaveStart < 0) leaveStart = normalized.IndexOf("LEAVE", StringComparison.OrdinalIgnoreCase);
                if (dedStart >= 0 && leaveStart > dedStart)
                    deductionsSection = normalized.Substring(dedStart, leaveStart - dedStart);
                else if (dedStart >= 0)
                    deductionsSection = normalized.Substring(dedStart);

                _logger.LogInformation("LES deductions section ({Length} chars): {Text}",
                    deductionsSection.Length, deductionsSection.Length > 500 ? deductionsSection[..500] : deductionsSection);

                // Parse deductions using the DFAS concatenated format
                // Each deduction: LABEL + optional CODE + CURRENT_AMOUNT + YTD_AMOUNT
                // Amounts are always formatted as digits with exactly 2 decimal places: ###.##

                // FEGLI Basic — labeled "FEGLI" followed by a code letter+digit (e.g., "F5")
                // Must NOT match "FEGLI OPTNL" which is the optional coverage
                result.FegliDeduction = ExtractDfasDeduction(deductionsSection, @"FEGLI([A-Z]\d)(\d+\.\d{2})(\d+\.\d{2})");
                result.FegliBasicCode = ExtractDfasCode(deductionsSection, @"FEGLI([A-Z]\d)\d+\.\d{2}");

                // FEGLI Optional — labeled "FEGLI OPTNL" with code (e.g., "AC")
                result.FegliOptionalDeduction = ExtractDfasDeduction(deductionsSection, @"FEGLI\s*OPTNL([A-Z]{1,3})(\d+\.\d{2})(\d+\.\d{2})");
                result.FegliOptionalCode = ExtractDfasCode(deductionsSection, @"FEGLI\s*OPTNL([A-Z]{1,3})\d+\.\d{2}");

                // If basic fegli not found via specific pattern, try generic
                if (!result.FegliDeduction.HasValue)
                    result.FegliDeduction = ExtractDfasDeduction(deductionsSection, @"FEGLI[A-Z]\d(\d+\.\d{2})(\d+\.\d{2})");

                // FEHB — labeled "FEHB" followed by a numeric code (e.g., "111")
                // The tricky part: "FEHB111133.77895.17" → code=111, current=133.77, YTD=895.17
                // Code is typically 2-3 alphanumeric chars. We need to find where the decimal amount starts.
                result.FehbDeduction = ExtractFehbDeduction(deductionsSection);

                // DENTAL (FEDVIP Dental) — labeled "DENTAL"
                result.FedvipDentalDeduction = ExtractDfasDeduction(deductionsSection, @"DENTAL(\d+\.\d{2})(\d+\.\d{2})");

                // FEDVIP Vision
                result.FedvipVisionDeduction = ExtractDfasDeduction(deductionsSection, @"VISION(\d+\.\d{2})(\d+\.\d{2})");

                // FSA — labeled "FSA-HC" or "FSA"
                result.FsaDeduction = ExtractDfasDeduction(deductionsSection, @"FSA[\-\s]*(?:HC|HEALTH)?(\d+\.\d{2})(\d+\.\d{2})");

                // HSA
                result.HsaDeduction = ExtractDfasDeduction(deductionsSection, @"HSA(\d+\.\d{2})(\d+\.\d{2})");

                // OASDI (Social Security)
                result.OasdiDeduction = ExtractDfasDeduction(deductionsSection, @"OASDI(\d+\.\d{2})(\d+\.\d{2})");

                // Federal Tax — labeled "TAX, FEDERAL" or "TAX,FEDERAL"
                result.FederalTaxWithholding = ExtractDfasDeduction(deductionsSection, @"TAX,?\s*FEDERAL(\d+\.\d{2})(\d+\.\d{2})");

                // State Tax — labeled "TAX, STATE" followed by state code (e.g., "AR")
                result.StateTaxWithholding = ExtractDfasDeduction(deductionsSection, @"TAX,?\s*STATE[A-Z]{0,2}(\d+\.\d{2})(\d+\.\d{2})");

                // Medicare
                result.MedicareDeduction = ExtractDfasDeduction(deductionsSection, @"MEDICARE(\d+\.\d{2})(\d+\.\d{2})");

                // FERS Retirement — labeled "RETIRE, FERS" + code
                result.RetirementDeduction = ExtractDfasDeduction(deductionsSection, @"RETIRE,?\s*(?:FERS|CSRS)[A-Z]?(\d+\.\d{2})(\d+\.\d{2})");
                // Cumulative (YTD) retirement deduction — the second amount in the pair
                result.FersCumulativeRetirement = ExtractDfasYtdAmount(deductionsSection, @"RETIRE,?\s*(?:FERS|CSRS)[A-Z]?(\d+\.\d{2})(\d+\.\d{2})");
                // Determine retirement system from the label
                if (Regex.IsMatch(deductionsSection, @"RETIRE,?\s*FERS", RegexOptions.IgnoreCase))
                    result.RetirementSystem = "FERS";

                // TSP deductions — Roth or traditional
                result.TspEmployeeDeduction = ExtractDfasDeduction(deductionsSection, @"TSP(?!\s*(?:MATCH|BASIC))[\s,]*(?!ROTH)(\d+\.\d{2})(\d+\.\d{2})");
                result.TspRothDeduction = ExtractDfasDeduction(deductionsSection, @"ROTH\s*DED(\d+\.\d{2})(\d+\.\d{2})");
                result.TspCatchUpDeduction = ExtractDfasDeduction(deductionsSection, @"(?:TSP|ROTH)\s*CATCH[\-\s]*UP(\d+\.\d{2})(\d+\.\d{2})");

                // FLTCIP (Long Term Care)
                result.FltcipDeduction = ExtractDfasDeduction(deductionsSection, @"(?:FLTCIP|LONG\s*TERM\s*CARE|LTC)(\d+\.\d{2})(\d+\.\d{2})");

                // Agency TSP Match — in BENEFITS section, not deductions
                var benefitsSection = "";
                var benStart = normalized.IndexOf("BENEFITS PAID BY GOVERNMENT", StringComparison.OrdinalIgnoreCase);
                var remarksStart = normalized.IndexOf("REMARKS", StringComparison.OrdinalIgnoreCase);
                if (benStart >= 0 && remarksStart > benStart)
                    benefitsSection = normalized.Substring(benStart, remarksStart - benStart);
                else if (benStart >= 0)
                    benefitsSection = normalized.Substring(benStart);

                result.TspAgencyMatch = ExtractDfasDeduction(benefitsSection, @"TSP\s*MATCHING(\d+\.\d{2})(\d+\.\d{2})");

                // === LEAVE SECTION ===
                // Format: ANNUAL###.##... or SICK###.##...
                // The "CURRENT BALANCE" column is what we want.
                // In DFAS format: TYPE PRIOR_BAL ACCRUED_PP ACCRUED_YTD USED_PP USED_YTD DONATED CURRENT_BAL
                result.AnnualLeaveBalance = ExtractLeaveBalance(normalized, "ANNUAL");
                result.SickLeaveBalance = ExtractLeaveBalance(normalized, "SICK");

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

        /// <summary>
        /// Extract current-period amount from DFAS concatenated deduction text.
        /// Pattern should capture: (current_amount)(ytd_amount) where amounts are ###.## format.
        /// Returns the first capture group (current period amount).
        /// </summary>
        private decimal? ExtractDfasDeduction(string text, string pattern)
        {
            var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase);
            if (!match.Success) return null;

            // The current amount is in the first numeric capture group
            // Find the first group that looks like a decimal amount
            for (int i = 1; i <= match.Groups.Count - 1; i++)
            {
                var val = match.Groups[i].Value;
                if (Regex.IsMatch(val, @"^\d+\.\d{2}$") &&
                    decimal.TryParse(val, NumberStyles.Number, CultureInfo.InvariantCulture, out var amount) &&
                    amount > 0)
                {
                    return amount;
                }
            }
            return null;
        }

        /// <summary>
        /// Extract the YTD (second) amount from a DFAS deduction line.
        /// Pattern should capture: (current_amount)(ytd_amount) where amounts are ###.## format.
        /// Returns the second numeric capture group (YTD amount).
        /// </summary>
        private decimal? ExtractDfasYtdAmount(string text, string pattern)
        {
            var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase);
            if (!match.Success) return null;

            int found = 0;
            for (int i = 1; i <= match.Groups.Count - 1; i++)
            {
                var val = match.Groups[i].Value;
                if (Regex.IsMatch(val, @"^\d+\.\d{2}$") &&
                    decimal.TryParse(val, NumberStyles.Number, CultureInfo.InvariantCulture, out var amount) &&
                    amount > 0)
                {
                    found++;
                    if (found == 2) return amount; // second match = YTD
                }
            }
            return null;
        }

        /// <summary>
        /// Extract the alpha/alphanumeric code from a DFAS deduction label.
        /// Returns the first capture group that is NOT a pure decimal amount.
        /// </summary>
        private string? ExtractDfasCode(string text, string pattern)
        {
            var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase);
            if (!match.Success || match.Groups.Count < 2) return null;
            return match.Groups[1].Value;
        }

        /// <summary>
        /// Special parser for FEHB which has a tricky format: FEHBcccNNN.NNYYY.YY
        /// where ccc is a 2-3 char code that can contain digits (e.g., "111").
        /// The trick is finding where the code ends and the dollar amount starts.
        /// We use the decimal point as anchor — amounts always have .XX format.
        /// Example: "FEHB111133.77895.17" → code=111, current=133.77, YTD=895.17
        /// </summary>
        private decimal? ExtractFehbDeduction(string section)
        {
            // Find "FEHB" in the deductions section
            var fehbPos = section.IndexOf("FEHB", StringComparison.OrdinalIgnoreCase);
            if (fehbPos < 0) return null;

            // Get text after "FEHB"
            var after = section.Substring(fehbPos + 4);

            // Find the first decimal point — this anchors us to the first amount
            var firstDot = after.IndexOf('.');
            if (firstDot < 1) return null;

            // The character after the decimal point + 2 digits is the end of the first amount.
            // E.g., in "111133.77895.17", firstDot=6, chars at 7-8 are "77"
            // The amount before the decimal: we try 1, 2, 3 digits before the '.' as the dollar part.
            // FEHB biweekly premiums for federal employees range ~$50-$900.
            // So we try 3 digits, then 2 digits, then 1 digit before the decimal.
            for (int digits = 3; digits >= 1; digits--)
            {
                if (firstDot < digits) continue;

                var startIdx = firstDot - digits;
                var endIdx = firstDot + 3; // .XX = 3 chars
                if (endIdx > after.Length) continue;

                var candidate = after.Substring(startIdx, endIdx - startIdx);
                if (decimal.TryParse(candidate, NumberStyles.Number,
                    CultureInfo.InvariantCulture, out var val) && val >= 1 && val <= 2000)
                {
                    return val;
                }
            }

            return null;
        }

        /// <summary>
        /// Extract leave balance from DFAS LES.
        /// Format after leave type label: a series of ###.## numbers representing columns.
        /// The second-to-last number before the next leave type or section is the current balance.
        /// </summary>
        private decimal? ExtractLeaveBalance(string text, string leaveType)
        {
            // Find the leave type in text
            var pattern = $@"{leaveType}([\d.]+)";
            var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase);
            if (!match.Success) return null;

            // Get all numbers after the leave type label
            var startPos = match.Index + leaveType.Length;
            var remaining = text.Substring(startPos);

            // Stop at next leave type or section
            var endMatch = Regex.Match(remaining, @"(SICK|ANNUAL|HOLIDAY|BENEFITS|REMARKS)", RegexOptions.IgnoreCase);
            if (endMatch.Success)
                remaining = remaining.Substring(0, endMatch.Index);

            // Extract all decimal numbers
            var numbers = Regex.Matches(remaining, @"(\d+\.\d{2})");
            // DFAS columns: PRIOR_BAL | ACCRUED_PP | ACCRUED_YTD | USED_PP | USED_YTD | DONATED | CURRENT_BAL | USE_LOSE
            // Current balance is typically the 7th value, but count varies. Take second-to-last for balance.
            if (numbers.Count >= 2)
            {
                // Current balance — for annual/sick it's near the end
                var balIdx = numbers.Count >= 6 ? numbers.Count - 2 : numbers.Count - 1;
                if (decimal.TryParse(numbers[balIdx].Value, NumberStyles.Number,
                    CultureInfo.InvariantCulture, out var balance))
                    return balance;
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
            if (result.FegliOptionalDeduction.HasValue) count++;
            if (result.FehbDeduction.HasValue) count++;
            if (result.FedvipDentalDeduction.HasValue) count++;
            if (result.FedvipVisionDeduction.HasValue) count++;
            if (result.FsaDeduction.HasValue) count++;
            if (result.HsaDeduction.HasValue) count++;
            if (result.TspEmployeeDeduction.HasValue) count++;
            if (result.TspRothDeduction.HasValue) count++;
            if (result.TspAgencyMatch.HasValue) count++;
            if (result.RetirementDeduction.HasValue) count++;
            if (result.FederalTaxWithholding.HasValue) count++;
            if (result.StateTaxWithholding.HasValue) count++;
            if (result.OasdiDeduction.HasValue) count++;
            if (result.MedicareDeduction.HasValue) count++;
            if (result.FltcipDeduction.HasValue) count++;
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
        public string? FegliBasicCode { get; set; }
        public decimal? FegliOptionalDeduction { get; set; }
        public string? FegliOptionalCode { get; set; }
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
        public decimal? RetirementDeduction { get; set; }  // FERS
        public decimal? FersCumulativeRetirement { get; set; }  // YTD cumulative FERS retirement contributions
        public string? RetirementSystem { get; set; }  // Detected from deduction label (e.g., "FERS")
        public decimal? FederalTaxWithholding { get; set; }
        public decimal? StateTaxWithholding { get; set; }
        public decimal? OasdiDeduction { get; set; }
        public decimal? MedicareDeduction { get; set; }

        // Leave
        public decimal? AnnualLeaveBalance { get; set; }
        public decimal? SickLeaveBalance { get; set; }
    }
}
