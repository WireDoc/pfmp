using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.DTOs;
using PFMP_API.Models.FinancialProfile;
using PFMP_API.Services;

namespace PFMP_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FederalBenefitsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<FederalBenefitsController> _logger;
        private readonly LesParserService _lesParser;
        private readonly FehbPlanLookupService _fehbLookup;

        public FederalBenefitsController(
            ApplicationDbContext context,
            ILogger<FederalBenefitsController> logger,
            LesParserService lesParser,
            FehbPlanLookupService fehbLookup)
        {
            _context = context;
            _logger = logger;
            _lesParser = lesParser;
            _fehbLookup = fehbLookup;
        }

        // GET: api/FederalBenefits/user/{userId}
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<FederalBenefitsResponse>> GetByUser(int userId)
        {
            try
            {
                var profile = await _context.FederalBenefitsProfiles
                    .FirstOrDefaultAsync(f => f.UserId == userId);

                if (profile == null)
                    return Ok(null); // Not yet configured — frontend shows empty form

                return Ok(MapToResponse(profile));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving federal benefits for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/FederalBenefits/user/{userId}
        [HttpPost("user/{userId}")]
        public async Task<ActionResult<FederalBenefitsResponse>> Save(int userId, [FromBody] SaveFederalBenefitsRequest request)
        {
            try
            {
                var existing = await _context.FederalBenefitsProfiles
                    .FirstOrDefaultAsync(f => f.UserId == userId);

                if (existing == null)
                {
                    existing = new FederalBenefitsProfile
                    {
                        UserId = userId,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.FederalBenefitsProfiles.Add(existing);
                }

                MapFromRequest(request, existing);
                existing.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Federal benefits saved for user {UserId}", userId);
                return Ok(MapToResponse(existing));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving federal benefits for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        // DELETE: api/FederalBenefits/user/{userId}
        [HttpDelete("user/{userId}")]
        public async Task<IActionResult> Delete(int userId)
        {
            try
            {
                var profile = await _context.FederalBenefitsProfiles
                    .FirstOrDefaultAsync(f => f.UserId == userId);

                if (profile == null)
                    return NotFound("Federal benefits profile not found");

                _context.FederalBenefitsProfiles.Remove(profile);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Federal benefits deleted for user {UserId}", userId);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting federal benefits for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/FederalBenefits/debug-pdf — returns raw extracted text for parser development
        [HttpPost("debug-pdf")]
        public ActionResult DebugPdf(IFormFile file)
        {
            var validation = ValidatePdfUpload(file);
            if (validation != null) return validation;

            try
            {
                using var stream = file!.OpenReadStream();
                using var document = UglyToad.PdfPig.PdfDocument.Open(stream);

                var pages = document.GetPages().Select((p, i) => new
                {
                    Page = i + 1,
                    RawText = p.Text,
                    Normalized = System.Text.RegularExpressions.Regex.Replace(p.Text, @"\s+", " ").Trim()
                }).ToList();

                return Ok(new
                {
                    FileName = file.FileName,
                    PageCount = pages.Count,
                    TotalChars = pages.Sum(p => p.RawText.Length),
                    Pages = pages
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // POST: api/FederalBenefits/upload-les
        [HttpPost("upload-les")]
        public ActionResult<LesUploadResponse> UploadLes(IFormFile file)
        {
            var validation = ValidatePdfUpload(file);
            if (validation != null) return validation;

            try
            {
                using var stream = file!.OpenReadStream();
                var parseResult = _lesParser.Parse(stream);

                if (!parseResult.ParsedSuccessfully)
                    return BadRequest(new LesUploadResponse
                    {
                        ParsedSuccessfully = false,
                        ErrorMessage = parseResult.ErrorMessage ?? "Could not parse LES document"
                    });

                int fieldsExtracted = CountLesFields(parseResult);

                _logger.LogInformation("LES parsed: {Count} fields from {FileName}",
                    fieldsExtracted, file.FileName);

                // Look up FEHB plan info for the upload response
                var fehbPlanInfo = _fehbLookup.Lookup(parseResult.FehbEnrollmentCode);
                decimal? fehbGovtMonthly = null;
                if (parseResult.FehbDeduction.HasValue && fehbPlanInfo != null)
                {
                    var govtBiweekly = _fehbLookup.ComputeBiweeklyGovernmentShare(
                        parseResult.FehbDeduction.Value, fehbPlanInfo.CoverageLevel);
                    if (govtBiweekly.HasValue)
                        fehbGovtMonthly = govtBiweekly.Value * 26m / 12m;
                }

                return Ok(new LesUploadResponse
                {
                    ParsedSuccessfully = true,
                    FieldsExtracted = fieldsExtracted,
                    PayPeriod = parseResult.PayPeriod,
                    PayGrade = parseResult.PayGrade,
                    AnnualBasicPay = parseResult.AnnualBasicPay,
                    BiweeklyGross = parseResult.BiweeklyGross,
                    BiweeklyNet = parseResult.BiweeklyNet,
                    ServiceComputationDate = parseResult.ServiceComputationDate,
                    FegliDeduction = parseResult.FegliDeduction,
                    FegliBasicCode = parseResult.FegliBasicCode,
                    FegliOptionalCode = parseResult.FegliOptionalCode,
                    FegliOptionalDeduction = parseResult.FegliOptionalDeduction,
                    FehbDeduction = parseResult.FehbDeduction,
                    FehbEnrollmentCode = parseResult.FehbEnrollmentCode,
                    FehbPlanName = fehbPlanInfo?.PlanName,
                    FehbCoverageLevel = fehbPlanInfo?.CoverageLevel,
                    FehbEmployerContribution = fehbGovtMonthly,
                    FedvipDentalDeduction = parseResult.FedvipDentalDeduction,
                    FedvipVisionDeduction = parseResult.FedvipVisionDeduction,
                    FltcipDeduction = parseResult.FltcipDeduction,
                    FsaDeduction = parseResult.FsaDeduction,
                    HsaDeduction = parseResult.HsaDeduction,
                    TspEmployeeDeduction = parseResult.TspEmployeeDeduction,
                    TspRothDeduction = parseResult.TspRothDeduction,
                    TspCatchUpDeduction = parseResult.TspCatchUpDeduction,
                    TspAgencyMatch = parseResult.TspAgencyMatch,
                    RetirementDeduction = parseResult.RetirementDeduction,
                    FersCumulativeRetirement = parseResult.FersCumulativeRetirement,
                    FederalTaxWithholding = parseResult.FederalTaxWithholding,
                    StateTaxWithholding = parseResult.StateTaxWithholding,
                    OasdiDeduction = parseResult.OasdiDeduction,
                    MedicareDeduction = parseResult.MedicareDeduction,
                    AnnualLeaveBalance = parseResult.AnnualLeaveBalance,
                    SickLeaveBalance = parseResult.SickLeaveBalance,
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process LES upload");
                return StatusCode(500, new LesUploadResponse
                {
                    ParsedSuccessfully = false,
                    ErrorMessage = "Failed to process the uploaded file"
                });
            }
        }

        // POST: api/FederalBenefits/user/{userId}/apply-les
        [HttpPost("user/{userId}/apply-les")]
        public async Task<ActionResult<FederalBenefitsResponse>> ApplyLes(int userId, IFormFile file)
        {
            var validation = ValidatePdfUpload(file);
            if (validation != null) return validation;

            try
            {
                using var stream = file!.OpenReadStream();
                var parseResult = _lesParser.Parse(stream);

                if (!parseResult.ParsedSuccessfully)
                    return BadRequest(new { message = parseResult.ErrorMessage ?? "Could not parse LES" });

                var profile = await _context.FederalBenefitsProfiles
                    .FirstOrDefaultAsync(f => f.UserId == userId);

                if (profile == null)
                {
                    profile = new FederalBenefitsProfile
                    {
                        UserId = userId,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.FederalBenefitsProfiles.Add(profile);
                }

                // Apply LES deductions to federal benefits profile
                // Biweekly → monthly: × 26 pay periods / 12 months (exact conversion)
                if (parseResult.FegliDeduction.HasValue)
                {
                    profile.HasFegliBasic = true;
                    var fegliBasicBiweekly = parseResult.FegliDeduction.Value;
                    var fegliOptionalBiweekly = parseResult.FegliOptionalDeduction ?? 0m;
                    profile.FegliTotalMonthlyPremium = (fegliBasicBiweekly + fegliOptionalBiweekly) * 26m / 12m;

                    // Compute BIA (Basic Insurance Amount) = salary rounded up to next $1,000 + $2,000
                    if (parseResult.AnnualBasicPay.HasValue)
                    {
                        profile.FegliBasicCoverage = Math.Ceiling(parseResult.AnnualBasicPay.Value / 1000m) * 1000m + 2000m;
                    }

                    // Parse FEGLI optional code (e.g., "AC") to set option toggles
                    if (!string.IsNullOrEmpty(parseResult.FegliOptionalCode))
                    {
                        var optCode = parseResult.FegliOptionalCode.ToUpperInvariant();
                        profile.HasFegliOptionA = optCode.Contains('A');
                        profile.HasFegliOptionB = optCode.Contains('B');
                        profile.HasFegliOptionC = optCode.Contains('C');
                    }

                    // Parse FEGLI basic code digit (e.g., "F5" → 5) for option multiples
                    if (!string.IsNullOrEmpty(parseResult.FegliBasicCode))
                    {
                        var digitChar = parseResult.FegliBasicCode.LastOrDefault(c => char.IsDigit(c));
                        if (digitChar != default && int.TryParse(digitChar.ToString(), out var multiple) && multiple >= 1 && multiple <= 5)
                        {
                            if (profile.HasFegliOptionC)
                                profile.FegliOptionCMultiple = multiple;
                            else if (profile.HasFegliOptionB)
                                profile.FegliOptionBMultiple = multiple;
                        }
                    }
                }

                if (parseResult.FehbDeduction.HasValue)
                {
                    profile.FehbMonthlyPremium = parseResult.FehbDeduction * 26m / 12m;

                    // Look up plan details from enrollment code
                    if (!string.IsNullOrEmpty(parseResult.FehbEnrollmentCode))
                    {
                        profile.FehbEnrollmentCode = parseResult.FehbEnrollmentCode;
                        var planInfo = _fehbLookup.Lookup(parseResult.FehbEnrollmentCode);
                        if (planInfo != null)
                        {
                            profile.FehbPlanName = planInfo.PlanName;
                            profile.FehbCoverageLevel = planInfo.CoverageLevel;

                            var govtShare = _fehbLookup.ComputeBiweeklyGovernmentShare(
                                parseResult.FehbDeduction.Value, planInfo.CoverageLevel);
                            if (govtShare.HasValue)
                            {
                                profile.FehbEmployerContribution = govtShare.Value * 26m / 12m;
                            }
                        }
                    }
                }

                if (parseResult.FedvipDentalDeduction.HasValue)
                {
                    profile.HasFedvipDental = true;
                    profile.FedvipDentalMonthlyPremium = parseResult.FedvipDentalDeduction * 26m / 12m;
                }

                if (parseResult.FedvipVisionDeduction.HasValue)
                {
                    profile.HasFedvipVision = true;
                    profile.FedvipVisionMonthlyPremium = parseResult.FedvipVisionDeduction * 26m / 12m;
                }

                if (parseResult.FltcipDeduction.HasValue)
                {
                    profile.HasFltcip = true;
                    profile.FltcipMonthlyPremium = parseResult.FltcipDeduction * 26m / 12m;
                }

                if (parseResult.FsaDeduction.HasValue)
                {
                    profile.HasFsa = true;
                    profile.FsaAnnualElection = parseResult.FsaDeduction * 26; // 26 pay periods
                }

                if (parseResult.HsaDeduction.HasValue)
                {
                    profile.HasHsa = true;
                    profile.HsaAnnualContribution = parseResult.HsaDeduction * 26;
                }

                if (parseResult.AnnualBasicPay.HasValue)
                    profile.High3AverageSalary = parseResult.AnnualBasicPay;

                // Cumulative FERS retirement contributions from LES YTD column
                if (parseResult.FersCumulativeRetirement.HasValue)
                    profile.FersCumulativeRetirement = parseResult.FersCumulativeRetirement;

                // Leave balances (snapshot from most recent LES)
                if (parseResult.AnnualLeaveBalance.HasValue)
                    profile.AnnualLeaveBalance = parseResult.AnnualLeaveBalance;
                if (parseResult.SickLeaveBalance.HasValue)
                    profile.SickLeaveBalance = parseResult.SickLeaveBalance;

                // Tax withholding (biweekly amounts from LES)
                if (parseResult.FederalTaxWithholding.HasValue)
                    profile.FederalTaxWithholdingBiweekly = parseResult.FederalTaxWithholding;
                if (parseResult.StateTaxWithholding.HasValue)
                    profile.StateTaxWithholdingBiweekly = parseResult.StateTaxWithholding;
                if (parseResult.OasdiDeduction.HasValue)
                    profile.OasdiDeductionBiweekly = parseResult.OasdiDeduction;
                if (parseResult.MedicareDeduction.HasValue)
                    profile.MedicareDeductionBiweekly = parseResult.MedicareDeduction;

                profile.LastLesUploadDate = DateTime.UtcNow;
                profile.LastLesFileName = file.FileName;
                profile.UpdatedAt = DateTime.UtcNow;

                // Also update User model fields that LES provides
                var user = await _context.Users.FindAsync(userId);
                if (user != null)
                {
                    if (parseResult.PayGrade != null) user.PayGrade = parseResult.PayGrade;
                    if (parseResult.RetirementSystem != null) user.RetirementSystem = parseResult.RetirementSystem;
                    if (parseResult.AnnualBasicPay.HasValue) user.AnnualIncome = parseResult.AnnualBasicPay;
                    if (parseResult.ServiceComputationDate.HasValue)
                        user.ServiceComputationDate = parseResult.ServiceComputationDate;
                    user.UpdatedAt = DateTime.UtcNow;

                    // Auto-calculate FERS pension fields from SCD and DOB
                    ComputeFersPension(profile, user);
                }

                // TSP biweekly contribution amounts from LES
                if (parseResult.TspEmployeeDeduction.HasValue || parseResult.TspRothDeduction.HasValue
                    || parseResult.TspCatchUpDeduction.HasValue || parseResult.TspAgencyMatch.HasValue)
                {
                    var tspProfile = await _context.TspProfiles
                        .FirstOrDefaultAsync(t => t.UserId == userId);

                    if (tspProfile != null)
                    {
                        if (parseResult.TspEmployeeDeduction.HasValue)
                            tspProfile.EmployeeContributionBiweekly = parseResult.TspEmployeeDeduction;
                        if (parseResult.TspRothDeduction.HasValue)
                            tspProfile.RothContributionBiweekly = parseResult.TspRothDeduction;
                        if (parseResult.TspCatchUpDeduction.HasValue)
                            tspProfile.CatchUpContributionBiweekly = parseResult.TspCatchUpDeduction;
                        if (parseResult.TspAgencyMatch.HasValue)
                            tspProfile.AgencyMatchBiweekly = parseResult.TspAgencyMatch;
                        tspProfile.LastUpdatedAt = DateTime.UtcNow;
                    }
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("LES applied for user {UserId}: {FileName}", userId, file.FileName);
                return Ok(MapToResponse(profile));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to apply LES for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        private ActionResult? ValidatePdfUpload(IFormFile? file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file uploaded" });

            if (!file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "File must be a PDF document" });

            if (file.Length > 10 * 1024 * 1024) // 10MB limit
                return BadRequest(new { message = "File size must be less than 10MB" });

            return null;
        }

        /// <summary>
        /// Compute FERS pension fields from the User's SCD, DOB, and High-3 salary.
        /// OPM rules: https://www.opm.gov/retirement-center/fers-information/computation/
        /// </summary>
        private static void ComputeFersPension(FederalBenefitsProfile profile, Models.User user)
        {
            var today = DateTime.UtcNow.Date;

            // --- Creditable service from SCD ---
            if (user.ServiceComputationDate.HasValue)
            {
                var scd = user.ServiceComputationDate.Value.Date;
                var totalMonths = ((today.Year - scd.Year) * 12) + today.Month - scd.Month;
                if (today.Day < scd.Day) totalMonths--; // partial month not counted
                if (totalMonths < 0) totalMonths = 0;

                profile.CreditableYearsOfService = totalMonths / 12;
                profile.CreditableMonthsOfService = totalMonths % 12;
            }

            // --- MRA from DOB (OPM birth-year table) ---
            if (user.DateOfBirth.HasValue)
            {
                var mra = CalculateMra(user.DateOfBirth.Value);
                profile.MinimumRetirementAge = mra;
            }

            // --- FERS Supplement eligibility ---
            // Eligible if: (1) MRA + 30 years service, or (2) age 60 + 20 years service
            // NOT eligible under MRA+10 (reduced benefit) provision
            if (user.DateOfBirth.HasValue && profile.CreditableYearsOfService.HasValue)
            {
                var creditableYears = profile.CreditableYearsOfService.Value;
                var mra = CalculateMra(user.DateOfBirth.Value);

                // Check if the user currently meets or will meet a supplement-eligible retirement scenario.
                // We project: at MRA, how many years of service will they have?
                // For now, use current creditable years as the baseline.
                var ageToday = today.Year - user.DateOfBirth.Value.Year;
                if (today < user.DateOfBirth.Value.AddYears(ageToday)) ageToday--;

                // MRA + 30: will they have 30 years at MRA?
                int mraAgeYears = mra.Year - user.DateOfBirth.Value.Year;
                if (mra < user.DateOfBirth.Value.AddYears(mraAgeYears)) mraAgeYears--;
                int yearsUntilMra = Math.Max(0, mraAgeYears - ageToday);
                int projectedYearsAtMra = creditableYears + yearsUntilMra;

                // Age 60 + 20: will they have 20 years at age 60?
                int yearsUntil60 = Math.Max(0, 60 - ageToday);
                int projectedYearsAt60 = creditableYears + yearsUntil60;

                bool supplementEligible = projectedYearsAtMra >= 30 || projectedYearsAt60 >= 20;
                profile.IsEligibleForSpecialRetirementSupplement = supplementEligible;

                if (supplementEligible)
                {
                    profile.SupplementEligibilityAge = mraAgeYears;
                    profile.SupplementEndAge = 62;
                }
            }

            // --- Projected annuity ---
            // Formula: multiplier × High-3 × total creditable service (years + months/12)
            // Multiplier: 1.1% if retiring at age 62+ with 20+ years; else 1.0%
            if (profile.High3AverageSalary.HasValue && profile.CreditableYearsOfService.HasValue)
            {
                var high3 = profile.High3AverageSalary.Value;
                var years = profile.CreditableYearsOfService.Value;
                var months = profile.CreditableMonthsOfService ?? 0;
                var totalService = years + (months / 12m);

                // Determine multiplier: use 1.1% if user will be 62+ with 20+ years,
                // otherwise 1.0%. For projection, check if they have 20+ years already
                // (most typical FERS employees intend to reach 62 with 20+ years).
                decimal multiplier = (years >= 20) ? 0.011m : 0.01m;

                profile.ProjectedAnnuity = Math.Round(multiplier * high3 * totalService, 2);
                profile.ProjectedMonthlyPension = Math.Round((profile.ProjectedAnnuity ?? 0) / 12m, 2);
            }
        }

        /// <summary>
        /// Calculate OPM Minimum Retirement Age from date of birth.
        /// MRA depends on birth year per the OPM table.
        /// </summary>
        private static DateTime CalculateMra(DateTime dateOfBirth)
        {
            int birthYear = dateOfBirth.Year;
            int mraYears;
            int mraMonths;

            if (birthYear < 1948) { mraYears = 55; mraMonths = 0; }
            else if (birthYear == 1948) { mraYears = 55; mraMonths = 2; }
            else if (birthYear == 1949) { mraYears = 55; mraMonths = 4; }
            else if (birthYear == 1950) { mraYears = 55; mraMonths = 6; }
            else if (birthYear == 1951) { mraYears = 55; mraMonths = 8; }
            else if (birthYear == 1952) { mraYears = 55; mraMonths = 10; }
            else if (birthYear >= 1953 && birthYear <= 1964) { mraYears = 56; mraMonths = 0; }
            else if (birthYear == 1965) { mraYears = 56; mraMonths = 2; }
            else if (birthYear == 1966) { mraYears = 56; mraMonths = 4; }
            else if (birthYear == 1967) { mraYears = 56; mraMonths = 6; }
            else if (birthYear == 1968) { mraYears = 56; mraMonths = 8; }
            else if (birthYear == 1969) { mraYears = 56; mraMonths = 10; }
            else { mraYears = 57; mraMonths = 0; } // 1970 and after

            return dateOfBirth.AddYears(mraYears).AddMonths(mraMonths);
        }

        private static FederalBenefitsResponse MapToResponse(FederalBenefitsProfile p) => new()
        {
            FederalBenefitsProfileId = p.FederalBenefitsProfileId,
            UserId = p.UserId,
            High3AverageSalary = p.High3AverageSalary,
            ProjectedAnnuity = p.ProjectedAnnuity,
            ProjectedMonthlyPension = p.ProjectedMonthlyPension,
            CreditableYearsOfService = p.CreditableYearsOfService,
            CreditableMonthsOfService = p.CreditableMonthsOfService,
            MinimumRetirementAge = p.MinimumRetirementAge,
            IsEligibleForSpecialRetirementSupplement = p.IsEligibleForSpecialRetirementSupplement,
            EstimatedSupplementMonthly = p.EstimatedSupplementMonthly,
            SupplementEligibilityAge = p.SupplementEligibilityAge,
            SupplementEndAge = p.SupplementEndAge,
            FersCumulativeRetirement = p.FersCumulativeRetirement,
            SocialSecurityEstimateAt62 = p.SocialSecurityEstimateAt62,
            AnnualSalaryGrowthRate = p.AnnualSalaryGrowthRate,
            HasFegliBasic = p.HasFegliBasic,
            FegliBasicCoverage = p.FegliBasicCoverage,
            HasFegliOptionA = p.HasFegliOptionA,
            HasFegliOptionB = p.HasFegliOptionB,
            FegliOptionBMultiple = p.FegliOptionBMultiple,
            HasFegliOptionC = p.HasFegliOptionC,
            FegliOptionCMultiple = p.FegliOptionCMultiple,
            FegliTotalMonthlyPremium = p.FegliTotalMonthlyPremium,
            FehbEnrollmentCode = p.FehbEnrollmentCode,
            FehbPlanName = p.FehbPlanName,
            FehbCoverageLevel = p.FehbCoverageLevel,
            FehbMonthlyPremium = p.FehbMonthlyPremium,
            FehbEmployerContribution = p.FehbEmployerContribution,
            HasFedvipDental = p.HasFedvipDental,
            FedvipDentalMonthlyPremium = p.FedvipDentalMonthlyPremium,
            HasFedvipVision = p.HasFedvipVision,
            FedvipVisionMonthlyPremium = p.FedvipVisionMonthlyPremium,
            HasFltcip = p.HasFltcip,
            FltcipMonthlyPremium = p.FltcipMonthlyPremium,
            HasFsa = p.HasFsa,
            FsaAnnualElection = p.FsaAnnualElection,
            HasHsa = p.HasHsa,
            HsaBalance = p.HsaBalance,
            HsaAnnualContribution = p.HsaAnnualContribution,
            AnnualLeaveBalance = p.AnnualLeaveBalance,
            SickLeaveBalance = p.SickLeaveBalance,
            FederalTaxWithholdingBiweekly = p.FederalTaxWithholdingBiweekly,
            StateTaxWithholdingBiweekly = p.StateTaxWithholdingBiweekly,
            OasdiDeductionBiweekly = p.OasdiDeductionBiweekly,
            MedicareDeductionBiweekly = p.MedicareDeductionBiweekly,
            LastLesUploadDate = p.LastLesUploadDate,
            LastLesFileName = p.LastLesFileName,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt,
        };

        private static void MapFromRequest(SaveFederalBenefitsRequest r, FederalBenefitsProfile p)
        {
            p.High3AverageSalary = r.High3AverageSalary;
            p.ProjectedAnnuity = r.ProjectedAnnuity;
            p.ProjectedMonthlyPension = r.ProjectedMonthlyPension;
            p.CreditableYearsOfService = r.CreditableYearsOfService;
            p.CreditableMonthsOfService = r.CreditableMonthsOfService;
            p.MinimumRetirementAge = r.MinimumRetirementAge;
            p.IsEligibleForSpecialRetirementSupplement = r.IsEligibleForSpecialRetirementSupplement;
            p.EstimatedSupplementMonthly = r.EstimatedSupplementMonthly;
            p.SupplementEligibilityAge = r.SupplementEligibilityAge;
            p.SupplementEndAge = r.SupplementEndAge;
            p.FersCumulativeRetirement = r.FersCumulativeRetirement;
            p.SocialSecurityEstimateAt62 = r.SocialSecurityEstimateAt62;
            p.AnnualSalaryGrowthRate = r.AnnualSalaryGrowthRate;
            p.HasFegliBasic = r.HasFegliBasic;
            p.FegliBasicCoverage = r.FegliBasicCoverage;
            p.HasFegliOptionA = r.HasFegliOptionA;
            p.HasFegliOptionB = r.HasFegliOptionB;
            p.FegliOptionBMultiple = r.FegliOptionBMultiple;
            p.HasFegliOptionC = r.HasFegliOptionC;
            p.FegliOptionCMultiple = r.FegliOptionCMultiple;
            p.FegliTotalMonthlyPremium = r.FegliTotalMonthlyPremium;
            p.FehbEnrollmentCode = r.FehbEnrollmentCode;
            p.FehbPlanName = r.FehbPlanName;
            p.FehbCoverageLevel = r.FehbCoverageLevel;
            p.FehbMonthlyPremium = r.FehbMonthlyPremium;
            p.FehbEmployerContribution = r.FehbEmployerContribution;
            p.HasFedvipDental = r.HasFedvipDental;
            p.FedvipDentalMonthlyPremium = r.FedvipDentalMonthlyPremium;
            p.HasFedvipVision = r.HasFedvipVision;
            p.FedvipVisionMonthlyPremium = r.FedvipVisionMonthlyPremium;
            p.HasFltcip = r.HasFltcip;
            p.FltcipMonthlyPremium = r.FltcipMonthlyPremium;
            p.HasFsa = r.HasFsa;
            p.FsaAnnualElection = r.FsaAnnualElection;
            p.HasHsa = r.HasHsa;
            p.HsaBalance = r.HsaBalance;
            p.HsaAnnualContribution = r.HsaAnnualContribution;
            p.AnnualLeaveBalance = r.AnnualLeaveBalance;
            p.SickLeaveBalance = r.SickLeaveBalance;
            p.FederalTaxWithholdingBiweekly = r.FederalTaxWithholdingBiweekly;
            p.StateTaxWithholdingBiweekly = r.StateTaxWithholdingBiweekly;
            p.OasdiDeductionBiweekly = r.OasdiDeductionBiweekly;
            p.MedicareDeductionBiweekly = r.MedicareDeductionBiweekly;
        }

        private static int CountLesFields(LesParseResult r)
        {
            int count = 0;
            if (r.PayGrade != null) count++;
            if (r.AnnualBasicPay.HasValue) count++;
            if (r.BiweeklyGross.HasValue) count++;
            if (r.BiweeklyNet.HasValue) count++;
            if (r.ServiceComputationDate.HasValue) count++;
            if (r.FegliDeduction.HasValue) count++;
            if (r.FehbDeduction.HasValue) count++;
            if (!string.IsNullOrEmpty(r.FehbEnrollmentCode)) count++;
            if (r.FedvipDentalDeduction.HasValue) count++;
            if (r.FedvipVisionDeduction.HasValue) count++;
            if (r.TspEmployeeDeduction.HasValue) count++;
            if (r.TspAgencyMatch.HasValue) count++;
            if (r.RetirementDeduction.HasValue) count++;
            if (r.FersCumulativeRetirement.HasValue) count++;
            if (r.FederalTaxWithholding.HasValue) count++;
            if (r.StateTaxWithholding.HasValue) count++;
            if (r.OasdiDeduction.HasValue) count++;
            if (r.MedicareDeduction.HasValue) count++;
            if (r.AnnualLeaveBalance.HasValue) count++;
            if (r.SickLeaveBalance.HasValue) count++;
            return count;
        }

        // ===== FERS Retirement Projection =====

        [HttpGet("user/{userId}/retirement-projection")]
        public async Task<ActionResult<RetirementProjectionResponse>> GetRetirementProjection(
            int userId,
            [FromQuery] int? customAge = null,
            [FromQuery] string? survivorElection = null,
            [FromQuery] decimal? colaRate = null,
            [FromQuery] decimal? incomeGoal = null)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null) return NotFound("User not found");

                var profile = await _context.FederalBenefitsProfiles
                    .FirstOrDefaultAsync(f => f.UserId == userId);

                if (profile == null)
                    return NotFound("Federal benefits profile not found");

                if (!user.ServiceComputationDate.HasValue || !user.DateOfBirth.HasValue)
                    return BadRequest(new { message = "Service Computation Date and Date of Birth are required for projections" });

                // Load TSP data for projection
                var tspProfile = await _context.TspProfiles
                    .FirstOrDefaultAsync(t => t.UserId == userId && !t.IsOptedOut);

                // Resolve actual TSP balance: prefer TotalBalance/CurrentBalance, fall back to sum of positions
                decimal tspBalance = 0m;
                if (tspProfile != null)
                {
                    tspBalance = tspProfile.TotalBalance ?? 0m;
                    if (tspBalance == 0m) tspBalance = tspProfile.CurrentBalance;
                    if (tspBalance == 0m)
                    {
                        tspBalance = await _context.TspLifecyclePositions
                            .Where(p => p.UserId == userId && p.CurrentMarketValue > 0)
                            .SumAsync(p => p.CurrentMarketValue ?? 0m);
                    }
                }

                // Load tax snapshot for tax impact modeling
                var taxSnapshot = await _context.FinancialProfileSnapshots
                    .FirstOrDefaultAsync(s => s.UserId == userId);

                var result = BuildRetirementProjection(
                    profile, user, tspProfile, tspBalance,
                    customAge, survivorElection, colaRate,
                    taxSnapshot?.MarginalTaxRatePercent,
                    taxSnapshot?.EffectiveTaxRatePercent,
                    incomeGoal);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate retirement projection for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        internal static RetirementProjectionResponse BuildRetirementProjection(
            FederalBenefitsProfile profile, Models.User user,
            Models.FinancialProfile.TspProfile? tspProfile = null,
            decimal resolvedTspBalance = 0m,
            int? customAge = null, string? survivorElection = null,
            decimal? colaRateOverride = null,
            decimal? marginalTaxRate = null, decimal? effectiveTaxRate = null,
            decimal? incomeGoal = null)
        {
            var today = DateTime.UtcNow.Date;
            var dob = user.DateOfBirth!.Value.Date;
            var scd = user.ServiceComputationDate!.Value.Date;

            // Current age
            int ageYears = today.Year - dob.Year;
            if (today < dob.AddYears(ageYears)) ageYears--;

            // Current creditable months from SCD
            var totalMonthsNow = ((today.Year - scd.Year) * 12) + today.Month - scd.Month;
            if (today.Day < scd.Day) totalMonthsNow--;
            if (totalMonthsNow < 0) totalMonthsNow = 0;

            // MRA
            var mraDate = CalculateMra(dob);
            int mraAgeYears = mraDate.Year - dob.Year;
            int mraAgeMonths = mraDate.Month - dob.Month;
            if (mraAgeMonths < 0) { mraAgeYears--; mraAgeMonths += 12; }

            var currentHigh3 = profile.High3AverageSalary ?? 0m;
            var growthRate = (profile.AnnualSalaryGrowthRate ?? 0m) / 100m; // e.g. 2.5 -> 0.025
            var ssAt62 = profile.SocialSecurityEstimateAt62;

            // TSP projection inputs
            var tspBalance = resolvedTspBalance;
            var tspContribPct = tspProfile?.ContributionRatePercent ?? 0m;
            var tspMatchPct = tspProfile?.EmployerMatchPercent ?? 0m;
            var tspGrowthRate = 0.07m; // 7% default long-term market return
            var annualSalary = currentHigh3; // use current High-3 as salary proxy
            var inflationRate = (user.InflationAssumptionPercent ?? 2.5m) / 100m; // default 2.5%

            // Roth/Traditional split
            var tspRothBalance = tspProfile?.RothBalance ?? 0m;
            var tspTradBalance = tspProfile?.TraditionalBalance ?? 0m;
            var tspRothContribPct = tspProfile?.RothContributionRatePercent; // % of employee contrib going to Roth

            // VA disability
            var includeVa = user.IncludeVaDisabilityInProjections && user.VADisabilityMonthlyAmount.HasValue && user.VADisabilityMonthlyAmount.Value > 0;
            var vaMonthly = includeVa ? user.VADisabilityMonthlyAmount!.Value : 0m;

            var response = new RetirementProjectionResponse
            {
                Inputs = new RetirementProjectionInputs
                {
                    High3AverageSalary = profile.High3AverageSalary,
                    AnnualSalaryGrowthRate = profile.AnnualSalaryGrowthRate,
                    DateOfBirth = dob,
                    ServiceComputationDate = scd,
                    SocialSecurityEstimateAt62 = ssAt62,
                    CurrentCreditableYears = totalMonthsNow / 12,
                    CurrentCreditableMonths = totalMonthsNow % 12,
                    MinimumRetirementAge = mraDate,
                    CurrentTspBalance = tspBalance > 0 ? tspBalance : null,
                    CurrentTspRothBalance = tspRothBalance > 0 ? tspRothBalance : null,
                    CurrentTspTraditionalBalance = tspTradBalance > 0 ? tspTradBalance : null,
                    TspContributionRatePercent = tspContribPct > 0 ? tspContribPct : null,
                    TspEmployerMatchPercent = tspMatchPct > 0 ? tspMatchPct : null,
                    TspRothContributionRatePercent = tspRothContribPct,
                    TspAnnualGrowthRate = 7m,
                    InflationAssumptionPercent = user.InflationAssumptionPercent ?? 2.5m,
                    ColaRatePercent = colaRateOverride ?? 1.5m,
                    SurvivorElection = survivorElection ?? "none",
                    MarginalTaxRatePercent = marginalTaxRate,
                    StateTaxRatePercent = effectiveTaxRate, // use effective as rough state proxy
                    MonthlyRetirementIncomeGoal = incomeGoal,
                    CustomRetirementAge = customAge,
                    VaDisabilityMonthlyAmount = includeVa ? vaMonthly : null,
                    IncludeVaDisabilityInProjections = includeVa,
                }
            };

            // Phase 2 parameters
            decimal colaRate = (colaRateOverride ?? 1.5m) / 100m; // default FERS COLA 1.5%
            string survivor = survivorElection ?? "none";
            decimal fedTaxRate = (marginalTaxRate ?? 0m) / 100m;
            decimal stateTaxRate = (effectiveTaxRate ?? 0m) / 100m; // rough proxy

            // Build scenarios: MRA, MRA+30 (if different), Age 60, Age 62, Age 65
            var scenarioAges = new List<(string Label, int AgeYears, int AgeMonths)>();

            // MRA scenario
            scenarioAges.Add(("MRA", mraAgeYears, mraAgeMonths));

            // MRA+30: figure out what age yields 30 years service
            int monthsToGet30 = (30 * 12) - totalMonthsNow;
            if (monthsToGet30 > 0)
            {
                int ageAt30YrsMonths = (ageYears * 12) + monthsToGet30;
                int ageAt30Yrs = ageAt30YrsMonths / 12;
                int ageAt30Mo = ageAt30YrsMonths % 12;
                if (ageAt30Yrs >= mraAgeYears && !(ageAt30Yrs == mraAgeYears && ageAt30Mo <= mraAgeMonths))
                    scenarioAges.Add(("MRA + 30 yrs service", ageAt30Yrs, ageAt30Mo));
            }
            else if (totalMonthsNow >= 360) // already have 30+ years
            {
                // MRA + 30 is just MRA (already added)
            }

            // Fixed age milestones
            if (mraAgeYears < 60) scenarioAges.Add(("Age 60", 60, 0));
            scenarioAges.Add(("Age 62", 62, 0));
            scenarioAges.Add(("Age 65", 65, 0));

            // Custom retirement age (if provided)
            if (customAge.HasValue && customAge.Value >= 50 && customAge.Value <= 80)
                scenarioAges.Add(($"Age {customAge.Value} (custom)", customAge.Value, 0));

            // Deduplicate by age and sort
            var seen = new HashSet<int>();
            var deduped = new List<(string Label, int AgeYears, int AgeMonths)>();
            foreach (var s in scenarioAges.OrderBy(s => s.AgeYears * 12 + s.AgeMonths))
            {
                var key = s.AgeYears * 12 + s.AgeMonths;
                if (seen.Add(key)) deduped.Add(s);
            }

            foreach (var (label, retireAgeY, retireAgeM) in deduped)
            {
                var scenario = BuildScenario(
                    label, retireAgeY, retireAgeM,
                    ageYears, totalMonthsNow, currentHigh3, growthRate,
                    mraAgeYears, mraAgeMonths, ssAt62, dob, scd,
                    tspBalance, tspContribPct, tspMatchPct, tspGrowthRate, annualSalary,
                    inflationRate,
                    tspRothBalance, tspTradBalance, tspRothContribPct,
                    colaRate, survivor, fedTaxRate, stateTaxRate, incomeGoal,
                    vaMonthly);
                response.Scenarios.Add(scenario);
            }

            return response;
        }

        private static RetirementScenario BuildScenario(
            string label, int retireAgeY, int retireAgeM,
            int currentAge, int currentServiceMonths,
            decimal currentHigh3, decimal growthRate,
            int mraAgeY, int mraAgeM, decimal? ssAt62,
            DateTime dob, DateTime scd,
            decimal tspBalance = 0m, decimal tspContribPct = 0m,
            decimal tspMatchPct = 0m, decimal tspGrowthRate = 0.07m,
            decimal annualSalary = 0m, decimal inflationRate = 0.025m,
            decimal tspRothBalance = 0m, decimal tspTradBalance = 0m,
            decimal? tspRothContribPct = null,
            decimal colaRate = 0.015m, string survivorElection = "none",
            decimal fedTaxRate = 0m, decimal stateTaxRate = 0m,
            decimal? incomeGoal = null,
            decimal vaMonthly = 0m)
        {
            int yearsUntilRetire = retireAgeY - currentAge;
            if (yearsUntilRetire < 0) yearsUntilRetire = 0;

            // Projected service at retirement
            int projectedServiceMonths = currentServiceMonths + (yearsUntilRetire * 12) + retireAgeM;
            int svcYears = projectedServiceMonths / 12;
            int svcMonths = projectedServiceMonths % 12;
            decimal totalService = svcYears + (svcMonths / 12m);

            // Projected High-3: grow current salary, then average the last 3 years
            // Simplified: project salary forward, High-3 ≈ salary grown by (yearsUntilRetire - 1.5) years
            decimal projectedHigh3 = currentHigh3;
            if (growthRate > 0 && yearsUntilRetire > 0)
            {
                decimal yearsForHigh3 = Math.Max(0, yearsUntilRetire - 1.5m);
                projectedHigh3 = currentHigh3 * (decimal)Math.Pow((double)(1m + growthRate), (double)yearsForHigh3);
            }
            projectedHigh3 = Math.Round(projectedHigh3, 2);

            // Inflate SS estimate to nominal (future) dollars to match pension/TSP projections.
            // SSA estimates are in today's purchasing power; this adjusts for expected inflation.
            decimal? inflatedSsAt62 = ssAt62;
            if (ssAt62.HasValue && ssAt62.Value > 0 && inflationRate > 0 && yearsUntilRetire > 0)
            {
                inflatedSsAt62 = Math.Round(ssAt62.Value * (decimal)Math.Pow((double)(1m + inflationRate), yearsUntilRetire), 2);
            }

            // Multiplier: 1.1% if retiring at 62+ with 20+ years; else 1.0%
            decimal multiplier = (retireAgeY >= 62 && svcYears >= 20) ? 0.011m : 0.01m;

            decimal annualAnnuity = Math.Round(multiplier * projectedHigh3 * totalService, 2);
            decimal monthlyPension = Math.Round(annualAnnuity / 12m, 2);

            // Eligibility determination
            bool isEligible = false;
            string? eligibilityNote = null;
            int retireAgeTotalMonths = retireAgeY * 12 + retireAgeM;
            int mraTotalMonths = mraAgeY * 12 + mraAgeM;

            if (retireAgeY >= 62 && svcYears >= 5)
            {
                isEligible = true;
            }
            else if (retireAgeTotalMonths >= mraTotalMonths && svcYears >= 30)
            {
                isEligible = true;
                eligibilityNote = "MRA + 30 years — immediate unreduced annuity";
            }
            else if (retireAgeY >= 60 && svcYears >= 20)
            {
                isEligible = true;
                eligibilityNote = "Age 60 + 20 years — immediate unreduced annuity";
            }
            else if (retireAgeTotalMonths >= mraTotalMonths && svcYears >= 10)
            {
                isEligible = true;
                // Reduced by 5% per year (5/12% per month) before age 62
                int monthsBelow62 = Math.Max(0, (62 * 12) - retireAgeTotalMonths);
                decimal reductionPct = Math.Round(monthsBelow62 * (5m / 12m), 1);
                annualAnnuity = Math.Round(annualAnnuity * (1m - (reductionPct / 100m)), 2);
                monthlyPension = Math.Round(annualAnnuity / 12m, 2);
                eligibilityNote = $"MRA + 10 — reduced annuity ({reductionPct:0.#}% reduction)";
            }
            else if (retireAgeTotalMonths < mraTotalMonths)
            {
                eligibilityNote = "Below MRA — not eligible for voluntary retirement";
            }
            else
            {
                eligibilityNote = $"Need at least 5 years of service at age 62, or 10 at MRA";
            }

            // FERS Supplement: available for MRA+30 or 60+20 only (not MRA+10)
            bool supplementEligible = false;
            decimal supplementEstimate = 0m;
            int? supplementMonths = null;
            if (isEligible && eligibilityNote == null || (eligibilityNote?.Contains("unreduced") == true))
            {
                if (retireAgeY < 62)
                {
                    supplementEligible = true;
                    int monthsToAge62 = (62 * 12) - retireAgeTotalMonths;
                    supplementMonths = Math.Max(0, monthsToAge62);

                    // SRS ≈ SS benefit at 62 × (FERS service years / 40), inflation-adjusted
                    if (inflatedSsAt62.HasValue && inflatedSsAt62.Value > 0)
                    {
                        supplementEstimate = Math.Round(inflatedSsAt62.Value * (totalService / 40m), 2);
                    }
                }
            }

            // SS at 62 (only applicable if retiring at or after 62), inflation-adjusted
            decimal? socialSecurityMonthly = null;
            if (retireAgeY >= 62 && inflatedSsAt62.HasValue && inflatedSsAt62.Value > 0)
            {
                socialSecurityMonthly = inflatedSsAt62.Value;
            }

            // VA disability: flat amount today, adjusted by COLA (follows SS COLA) to nominal dollars at retirement
            // Unlike SS, VA disability doesn't change with claiming age — it's the same from day one
            decimal? vaDisabilityMonthly = null;
            if (vaMonthly > 0 && yearsUntilRetire >= 0)
            {
                // Apply inflation/COLA to bring today's dollars to nominal future dollars (same approach as SS)
                vaDisabilityMonthly = yearsUntilRetire > 0
                    ? Math.Round(vaMonthly * (decimal)Math.Pow((double)(1m + inflationRate), yearsUntilRetire), 2)
                    : vaMonthly;
            }

            // Total monthly retirement income
            decimal totalMonthly = monthlyPension;
            if (supplementEligible && supplementEstimate > 0)
                totalMonthly += supplementEstimate;
            if (socialSecurityMonthly.HasValue)
                totalMonthly += socialSecurityMonthly.Value;
            if (vaDisabilityMonthly.HasValue)
                totalMonthly += vaDisabilityMonthly.Value;

            // TSP projection: future value with annual contributions, then 4% safe withdrawal rate
            decimal? projectedTspBalance = null;
            decimal? monthlyTspWithdrawal = null;
            decimal? projectedRothBalance = null;
            decimal? projectedTradBalance = null;
            decimal? monthlyRothWithdrawal = null;
            decimal? monthlyTradWithdrawal = null;
            if (tspBalance > 0 || (tspContribPct > 0 && annualSalary > 0))
            {
                decimal annualEmployeeContrib = annualSalary * (tspContribPct / 100m);
                decimal annualMatchContrib = annualSalary * (tspMatchPct / 100m); // always goes traditional

                // Determine Roth/Traditional split of employee contributions
                decimal rothPct = tspRothContribPct ?? 0m; // 0-100: % of employee contrib to Roth
                decimal annualRothContrib = annualEmployeeContrib * (rothPct / 100m);
                decimal annualTradContrib = annualEmployeeContrib - annualRothContrib + annualMatchContrib;

                bool hasSplit = tspRothBalance > 0 || tspTradBalance > 0;

                decimal balance = tspBalance;
                decimal rothBal = tspRothBalance;
                decimal tradBal = tspTradBalance;

                for (int y = 0; y < yearsUntilRetire; y++)
                {
                    balance = (balance + annualEmployeeContrib + annualMatchContrib) * (1m + tspGrowthRate);
                    if (hasSplit)
                    {
                        rothBal = (rothBal + annualRothContrib) * (1m + tspGrowthRate);
                        tradBal = (tradBal + annualTradContrib) * (1m + tspGrowthRate);
                    }
                }

                projectedTspBalance = Math.Round(balance, 2);
                monthlyTspWithdrawal = Math.Round(balance * 0.04m / 12m, 2);
                totalMonthly += monthlyTspWithdrawal.Value;

                if (hasSplit)
                {
                    projectedRothBalance = Math.Round(rothBal, 2);
                    projectedTradBalance = Math.Round(tradBal, 2);
                    monthlyRothWithdrawal = Math.Round(rothBal * 0.04m / 12m, 2);
                    monthlyTradWithdrawal = Math.Round(tradBal * 0.04m / 12m, 2);
                }
            }

            // === Phase 2: COLA projection ===
            // FERS COLA: applied annually starting 1 year after retirement, project to age 85
            decimal? pensionAt85WithCola = null;
            if (colaRate > 0 && monthlyPension > 0)
            {
                int yearsToAge85 = Math.Max(0, 85 - retireAgeY);
                var pensionWithCola = monthlyPension;
                for (int y = 0; y < yearsToAge85; y++)
                    pensionWithCola *= (1m + colaRate);
                pensionAt85WithCola = Math.Round(pensionWithCola, 2);
            }

            // === Phase 2: Survivor benefit ===
            decimal? survivorReduction = null;
            decimal? survivorBenefitMonthly = null;
            decimal adjustedPension = monthlyPension;
            if (survivorElection == "50%" && monthlyPension > 0)
            {
                // 50% survivor: pension reduced by ~10% (max full effect), spouse gets 50%
                survivorReduction = Math.Round(monthlyPension * 0.10m, 2);
                adjustedPension = monthlyPension - survivorReduction.Value;
                survivorBenefitMonthly = Math.Round(monthlyPension * 0.50m, 2);
            }
            else if (survivorElection == "25%" && monthlyPension > 0)
            {
                // 25% survivor: pension reduced by ~5%, spouse gets 25%
                survivorReduction = Math.Round(monthlyPension * 0.05m, 2);
                adjustedPension = monthlyPension - survivorReduction.Value;
                survivorBenefitMonthly = Math.Round(monthlyPension * 0.25m, 2);
            }

            // Recalculate total with adjusted pension if survivor elected
            if (survivorReduction.HasValue)
            {
                totalMonthly = adjustedPension;
                if (supplementEligible && supplementEstimate > 0)
                    totalMonthly += supplementEstimate;
                if (socialSecurityMonthly.HasValue)
                    totalMonthly += socialSecurityMonthly.Value;
                if (vaDisabilityMonthly.HasValue)
                    totalMonthly += vaDisabilityMonthly.Value;
                if (monthlyTspWithdrawal.HasValue)
                    totalMonthly += monthlyTspWithdrawal.Value;
            }

            // === Phase 2: Tax impact modeling ===
            decimal? estFedTax = null;
            decimal? estStateTax = null;
            decimal? afterTaxIncome = null;
            if (fedTaxRate > 0 || stateTaxRate > 0)
            {
                // Taxable income: pension + traditional TSP + supplement (SS taxed at ~85% for most feds)
                decimal taxablePension = adjustedPension;
                decimal taxableTsp = monthlyTradWithdrawal ?? monthlyTspWithdrawal ?? 0m;
                decimal taxableSs = (socialSecurityMonthly ?? 0m) * 0.85m;
                decimal taxableSupplement = supplementEligible ? supplementEstimate : 0m;
                decimal totalTaxable = taxablePension + taxableTsp + taxableSs + taxableSupplement;

                estFedTax = fedTaxRate > 0 ? Math.Round(totalTaxable * fedTaxRate, 2) : null;
                estStateTax = stateTaxRate > 0 ? Math.Round(totalTaxable * stateTaxRate, 2) : null;
                afterTaxIncome = Math.Round(totalMonthly - (estFedTax ?? 0m) - (estStateTax ?? 0m), 2);
            }

            // === Phase 2: Income gap analysis ===
            decimal? monthlyGap = null;
            if (incomeGoal.HasValue && incomeGoal.Value > 0)
            {
                var effectiveIncome = afterTaxIncome ?? totalMonthly;
                monthlyGap = Math.Round(effectiveIncome - incomeGoal.Value, 2);
            }

            return new RetirementScenario
            {
                Label = label,
                RetirementAge = retireAgeY,
                RetirementAgeMonths = retireAgeM,
                ProjectedServiceYears = svcYears,
                ProjectedServiceMonths = svcMonths,
                Multiplier = multiplier,
                ProjectedHigh3 = projectedHigh3,
                AnnualAnnuity = annualAnnuity,
                MonthlyPension = survivorReduction.HasValue ? adjustedPension : monthlyPension,
                SupplementEligible = supplementEligible,
                MonthlySupplementEstimate = supplementEstimate,
                SupplementMonths = supplementMonths,
                TotalMonthlyRetirementIncome = Math.Round(totalMonthly, 2),
                SocialSecurityMonthly = socialSecurityMonthly,
                VaDisabilityMonthly = vaDisabilityMonthly,
                ProjectedTspBalance = projectedTspBalance,
                MonthlyTspWithdrawal = monthlyTspWithdrawal,
                ProjectedTspRothBalance = projectedRothBalance,
                ProjectedTspTraditionalBalance = projectedTradBalance,
                MonthlyTspRothWithdrawal = monthlyRothWithdrawal,
                MonthlyTspTraditionalWithdrawal = monthlyTradWithdrawal,
                MonthlyPensionAge85WithCola = pensionAt85WithCola,
                ColaRatePercent = colaRate * 100m,
                SurvivorBenefitReduction = survivorReduction,
                SurvivorBenefitMonthly = survivorBenefitMonthly,
                SurvivorElection = survivorElection != "none" ? survivorElection : null,
                EstimatedFederalTaxMonthly = estFedTax,
                EstimatedStateTaxMonthly = estStateTax,
                AfterTaxMonthlyIncome = afterTaxIncome,
                MonthlyIncomeGoal = incomeGoal,
                MonthlyIncomeGap = monthlyGap,
                IsEligible = isEligible,
                EligibilityNote = eligibilityNote,
            };
        }
    }
}
