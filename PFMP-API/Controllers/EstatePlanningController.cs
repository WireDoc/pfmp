using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.DTOs;
using PFMP_API.Models.FinancialProfile;

namespace PFMP_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EstatePlanningController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<EstatePlanningController> _logger;

        public EstatePlanningController(
            ApplicationDbContext context,
            ILogger<EstatePlanningController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/EstatePlanning/user/{userId}
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<EstatePlanningResponse>> GetByUser(int userId)
        {
            try
            {
                var profile = await _context.EstatePlanningProfiles
                    .FirstOrDefaultAsync(e => e.UserId == userId);

                if (profile == null)
                    return Ok(null); // Not yet configured — frontend shows empty form

                return Ok(MapToResponse(profile));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving estate planning for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/EstatePlanning/user/{userId}
        [HttpPost("user/{userId}")]
        public async Task<ActionResult<EstatePlanningResponse>> Save(int userId, [FromBody] SaveEstatePlanningRequest request)
        {
            try
            {
                var existing = await _context.EstatePlanningProfiles
                    .FirstOrDefaultAsync(e => e.UserId == userId);

                if (existing == null)
                {
                    existing = new EstatePlanningProfile
                    {
                        UserId = userId,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.EstatePlanningProfiles.Add(existing);
                }

                MapFromRequest(request, existing);
                existing.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Estate planning saved for user {UserId}", userId);
                return Ok(MapToResponse(existing));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving estate planning for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        private static EstatePlanningResponse MapToResponse(EstatePlanningProfile profile)
        {
            return new EstatePlanningResponse
            {
                EstatePlanningProfileId = profile.EstatePlanningProfileId,
                UserId = profile.UserId,
                HasWill = profile.HasWill,
                WillLastReviewedDate = profile.WillLastReviewedDate,
                HasTrust = profile.HasTrust,
                TrustType = profile.TrustType,
                TrustLastReviewedDate = profile.TrustLastReviewedDate,
                HasFinancialPOA = profile.HasFinancialPOA,
                HasHealthcarePOA = profile.HasHealthcarePOA,
                HasAdvanceDirective = profile.HasAdvanceDirective,
                AttorneyName = profile.AttorneyName,
                AttorneyLastConsultDate = profile.AttorneyLastConsultDate,
                Notes = profile.Notes,
                CreatedAt = profile.CreatedAt,
                UpdatedAt = profile.UpdatedAt
            };
        }

        private static void MapFromRequest(SaveEstatePlanningRequest request, EstatePlanningProfile profile)
        {
            profile.HasWill = request.HasWill;
            profile.WillLastReviewedDate = request.WillLastReviewedDate;
            profile.HasTrust = request.HasTrust;
            profile.TrustType = request.TrustType;
            profile.TrustLastReviewedDate = request.TrustLastReviewedDate;
            profile.HasFinancialPOA = request.HasFinancialPOA;
            profile.HasHealthcarePOA = request.HasHealthcarePOA;
            profile.HasAdvanceDirective = request.HasAdvanceDirective;
            profile.AttorneyName = request.AttorneyName;
            profile.AttorneyLastConsultDate = request.AttorneyLastConsultDate;
            profile.Notes = request.Notes;
        }
    }
}
