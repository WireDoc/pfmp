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
        /// Get all advice records for a user ordered newest first.
        /// </summary>
        /// <param name="userId">The user id.</param>
        [HttpGet("user/{userId:int}")]
        public async Task<ActionResult<IEnumerable<Advice>>> GetForUser(int userId)
        {
            if (userId <= 0)
            {
                return BadRequest("Invalid user id");
            }

            try
            {
                var advice = await _adviceService.GetAdviceForUserAsync(userId);
                return Ok(advice.OrderByDescending(a => a.CreatedAt));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch advice for user {UserId}", userId);
                return StatusCode(500, "Failed to fetch advice");
            }
        }
    }
}
