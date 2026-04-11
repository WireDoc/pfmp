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
        private readonly Sf50ParserService _sf50Parser;
        private readonly LesParserService _lesParser;

        public FederalBenefitsController(
            ApplicationDbContext context,
            ILogger<FederalBenefitsController> logger,
            Sf50ParserService sf50Parser,
            LesParserService lesParser)
        {
            _context = context;
            _logger = logger;
            _sf50Parser = sf50Parser;
            _lesParser = lesParser;
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

        // POST: api/FederalBenefits/upload-sf50
        [HttpPost("upload-sf50")]
        public ActionResult<Sf50UploadResponse> UploadSf50(IFormFile file)
        {
            var validation = ValidatePdfUpload(file);
            if (validation != null) return validation;

            try
            {
                using var stream = file!.OpenReadStream();
                var parseResult = _sf50Parser.Parse(stream);

                if (!parseResult.ParsedSuccessfully)
                    return BadRequest(new Sf50UploadResponse
                    {
                        ParsedSuccessfully = false,
                        ErrorMessage = parseResult.ErrorMessage ?? "Could not parse SF-50 document"
                    });

                int fieldsExtracted = 0;
                if (parseResult.PayGrade != null) fieldsExtracted++;
                if (parseResult.AnnualBasicPay.HasValue) fieldsExtracted++;
                if (parseResult.PayBasis != null) fieldsExtracted++;
                if (parseResult.Agency != null) fieldsExtracted++;
                if (parseResult.RetirementPlan != null) fieldsExtracted++;
                if (parseResult.ServiceComputationDate.HasValue) fieldsExtracted++;
                if (parseResult.DateOfBirth.HasValue) fieldsExtracted++;
                if (parseResult.PositionTitle != null) fieldsExtracted++;
                if (parseResult.FegliCode != null) fieldsExtracted++;

                _logger.LogInformation("SF-50 parsed: {Count} fields from {FileName}",
                    fieldsExtracted, file.FileName);

                return Ok(new Sf50UploadResponse
                {
                    ParsedSuccessfully = true,
                    FieldsExtracted = fieldsExtracted,
                    PayGrade = parseResult.PayGrade,
                    AnnualBasicPay = parseResult.AnnualBasicPay,
                    PayBasis = parseResult.PayBasis,
                    Agency = parseResult.Agency,
                    RetirementPlan = parseResult.RetirementPlan,
                    ServiceComputationDate = parseResult.ServiceComputationDate,
                    DateOfBirth = parseResult.DateOfBirth,
                    PositionTitle = parseResult.PositionTitle,
                    FegliCode = parseResult.FegliCode,
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process SF-50 upload");
                return StatusCode(500, new Sf50UploadResponse
                {
                    ParsedSuccessfully = false,
                    ErrorMessage = "Failed to process the uploaded file"
                });
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

                return Ok(new LesUploadResponse
                {
                    ParsedSuccessfully = true,
                    FieldsExtracted = fieldsExtracted,
                    PayPeriod = parseResult.PayPeriod,
                    PayGrade = parseResult.PayGrade,
                    AnnualBasicPay = parseResult.AnnualBasicPay,
                    BiweeklyGross = parseResult.BiweeklyGross,
                    BiweeklyNet = parseResult.BiweeklyNet,
                    FegliDeduction = parseResult.FegliDeduction,
                    FehbDeduction = parseResult.FehbDeduction,
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

        // POST: api/FederalBenefits/user/{userId}/apply-sf50
        [HttpPost("user/{userId}/apply-sf50")]
        public async Task<ActionResult<FederalBenefitsResponse>> ApplySf50(int userId, IFormFile file)
        {
            var validation = ValidatePdfUpload(file);
            if (validation != null) return validation;

            try
            {
                using var stream = file!.OpenReadStream();
                var parseResult = _sf50Parser.Parse(stream);

                if (!parseResult.ParsedSuccessfully)
                    return BadRequest(new { message = parseResult.ErrorMessage ?? "Could not parse SF-50" });

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

                // Apply parsed SF-50 fields
                if (parseResult.AnnualBasicPay.HasValue)
                    profile.High3AverageSalary = parseResult.AnnualBasicPay; // Current salary as starting point

                if (parseResult.FegliCode != null)
                    profile.HasFegliBasic = true; // SF-50 FEGLI code presence means enrolled

                profile.LastSf50UploadDate = DateTime.UtcNow;
                profile.LastSf50FileName = file.FileName;
                profile.UpdatedAt = DateTime.UtcNow;

                // Also update the User model fields that SF-50 provides
                var user = await _context.Users.FindAsync(userId);
                if (user != null)
                {
                    if (parseResult.PayGrade != null) user.PayGrade = parseResult.PayGrade;
                    if (parseResult.ServiceComputationDate.HasValue)
                        user.ServiceComputationDate = parseResult.ServiceComputationDate;
                    if (parseResult.RetirementPlan != null)
                        user.RetirementSystem = parseResult.RetirementPlan;
                    user.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("SF-50 applied for user {UserId}: {FileName}", userId, file.FileName);
                return Ok(MapToResponse(profile));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to apply SF-50 for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
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
                if (parseResult.FegliDeduction.HasValue)
                {
                    profile.HasFegliBasic = true;
                    profile.FegliTotalMonthlyPremium = parseResult.FegliDeduction * 2.17m; // Biweekly → monthly
                }

                if (parseResult.FehbDeduction.HasValue)
                {
                    profile.FehbMonthlyPremium = parseResult.FehbDeduction * 2.17m;
                }

                if (parseResult.FedvipDentalDeduction.HasValue)
                {
                    profile.HasFedvipDental = true;
                    profile.FedvipDentalMonthlyPremium = parseResult.FedvipDentalDeduction * 2.17m;
                }

                if (parseResult.FedvipVisionDeduction.HasValue)
                {
                    profile.HasFedvipVision = true;
                    profile.FedvipVisionMonthlyPremium = parseResult.FedvipVisionDeduction * 2.17m;
                }

                if (parseResult.FltcipDeduction.HasValue)
                {
                    profile.HasFltcip = true;
                    profile.FltcipMonthlyPremium = parseResult.FltcipDeduction * 2.17m;
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

                profile.LastLesUploadDate = DateTime.UtcNow;
                profile.LastLesFileName = file.FileName;
                profile.UpdatedAt = DateTime.UtcNow;

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
            HasFegliBasic = p.HasFegliBasic,
            FegliBasicCoverage = p.FegliBasicCoverage,
            HasFegliOptionA = p.HasFegliOptionA,
            HasFegliOptionB = p.HasFegliOptionB,
            FegliOptionBMultiple = p.FegliOptionBMultiple,
            HasFegliOptionC = p.HasFegliOptionC,
            FegliOptionCMultiple = p.FegliOptionCMultiple,
            FegliTotalMonthlyPremium = p.FegliTotalMonthlyPremium,
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
            LastSf50UploadDate = p.LastSf50UploadDate,
            LastSf50FileName = p.LastSf50FileName,
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
            p.HasFegliBasic = r.HasFegliBasic;
            p.FegliBasicCoverage = r.FegliBasicCoverage;
            p.HasFegliOptionA = r.HasFegliOptionA;
            p.HasFegliOptionB = r.HasFegliOptionB;
            p.FegliOptionBMultiple = r.FegliOptionBMultiple;
            p.HasFegliOptionC = r.HasFegliOptionC;
            p.FegliOptionCMultiple = r.FegliOptionCMultiple;
            p.FegliTotalMonthlyPremium = r.FegliTotalMonthlyPremium;
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
        }

        private static int CountLesFields(LesParseResult r)
        {
            int count = 0;
            if (r.PayGrade != null) count++;
            if (r.AnnualBasicPay.HasValue) count++;
            if (r.BiweeklyGross.HasValue) count++;
            if (r.BiweeklyNet.HasValue) count++;
            if (r.FegliDeduction.HasValue) count++;
            if (r.FehbDeduction.HasValue) count++;
            if (r.FedvipDentalDeduction.HasValue) count++;
            if (r.FedvipVisionDeduction.HasValue) count++;
            if (r.TspEmployeeDeduction.HasValue) count++;
            if (r.TspAgencyMatch.HasValue) count++;
            if (r.RetirementDeduction.HasValue) count++;
            if (r.FederalTaxWithholding.HasValue) count++;
            if (r.StateTaxWithholding.HasValue) count++;
            if (r.OasdiDeduction.HasValue) count++;
            if (r.MedicareDeduction.HasValue) count++;
            if (r.AnnualLeaveBalance.HasValue) count++;
            if (r.SickLeaveBalance.HasValue) count++;
            return count;
        }
    }
}
