using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using PFMP_API.Models;
using PFMP_API.Services;

namespace PFMP_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdviceController : ControllerBase
    {
        private readonly IAdviceService _adviceService;
        private readonly ILogger<AdviceController> _logger;

        public AdviceController(IAdviceService adviceService, ILogger<AdviceController> logger)
        {
            _adviceService = adviceService;
            _logger = logger;
        }

        /// <summary>
        /// Generate a new piece of advice for a user. For Wave 1 this triggers a basic portfolio analysis.
        /// </summary>
        /// <param name="userId">The user id.</param>
        [HttpPost("generate/{userId:int}")]
        public async Task<ActionResult<Advice>> Generate(int userId)
        {
            if (userId <= 0)
            {
                return BadRequest("Invalid user id");
            }

            try
            {
                var advice = await _adviceService.GenerateBasicAdviceAsync(userId);
                return Ok(advice);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate advice for user {UserId}", userId);
                return StatusCode(500, "Failed to generate advice");
            }
        }

        /// <summary>
        /// Get advice records for a user with optional status filtering.
        /// </summary>
        [HttpGet("user/{userId:int}")]
        public async Task<ActionResult<IEnumerable<Advice>>> GetForUser(int userId, [FromQuery] string? status = null, [FromQuery] bool includeDismissed = false)
        {
            if (userId <= 0) return BadRequest("Invalid user id");
            try
            {
                var advice = await _adviceService.GetAdviceForUserAsync(userId, status, includeDismissed);
                return Ok(advice);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch advice for user {UserId}", userId);
                return StatusCode(500, "Failed to fetch advice");
            }
        }

        /// <summary>
        /// Mark an advice record as Accepted.
        /// </summary>
        [HttpPost("{adviceId:int}/accept")]
        public async Task<ActionResult<Advice>> Accept(int adviceId)
        {
            if (adviceId <= 0) return BadRequest("Invalid advice id");
            try
            {
                var advice = await _adviceService.AcceptAdviceAsync(adviceId);
                if (advice == null) return NotFound();
                return Ok(advice);
            }
            catch (InvalidOperationException ioe)
            {
                _logger.LogWarning(ioe, "Invalid transition accepting advice {AdviceId}", adviceId);
                return Conflict(ioe.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to accept advice {AdviceId}", adviceId);
                return StatusCode(500, "Failed to accept advice");
            }
        }

        /// <summary>
        /// Dismiss an advice (only if not yet accepted).
        /// </summary>
        [HttpPost("{adviceId:int}/dismiss")]
        public async Task<ActionResult<Advice>> Dismiss(int adviceId)
        {
            if (adviceId <= 0) return BadRequest("Invalid advice id");
            try
            {
                var advice = await _adviceService.DismissAdviceAsync(adviceId);
                if (advice == null) return NotFound();
                return Ok(advice);
            }
            catch (InvalidOperationException ioe)
            {
                _logger.LogWarning(ioe, "Invalid transition dismissing advice {AdviceId}", adviceId);
                return Conflict(ioe.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to dismiss advice {AdviceId}", adviceId);
                return StatusCode(500, "Failed to dismiss advice");
            }
        }

    /// <summary>
    /// Legacy endpoint placeholders returning 410 (Gone) to guide clients to new flow.
    /// </summary>
    [HttpPost("{adviceId:int}/reject")]
        public ActionResult RejectLegacy(int adviceId) => StatusCode(410, new { message = "Rejected endpoint deprecated. Use /dismiss or /accept." });

        [HttpPost("{adviceId:int}/convert-to-task")]
        public ActionResult ConvertLegacy(int adviceId) => StatusCode(410, new { message = "Conversion deprecated. Use /accept to create task." });
    }
}
