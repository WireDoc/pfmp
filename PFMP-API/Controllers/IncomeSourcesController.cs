using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class IncomeSourcesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<IncomeSourcesController> _logger;

        public IncomeSourcesController(ApplicationDbContext context, ILogger<IncomeSourcesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/IncomeSources/user/5
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetIncomeSourcesByUser(int userId)
        {
            try
            {
                var incomeSources = await _context.IncomeSources
                    .Where(i => i.UserId == userId)
                    .OrderByDescending(i => i.IsActive)
                    .ThenByDescending(i => i.Amount)
                    .ThenBy(i => i.Type)
                    .Select(i => new
                    {
                        i.IncomeSourceId,
                        i.Name,
                        i.Type,
                        i.Frequency,
                        i.Amount,
                        MonthlyAmount = i.Frequency == IncomeFrequency.Monthly ? i.Amount :
                                      i.Frequency == IncomeFrequency.BiWeekly ? i.Amount * 2.167m :
                                      i.Frequency == IncomeFrequency.Weekly ? i.Amount * 4.333m :
                                      i.Frequency == IncomeFrequency.Quarterly ? i.Amount / 3 :
                                      i.Frequency == IncomeFrequency.Annually ? i.Amount / 12 : i.Amount,
                        AnnualAmount = i.Frequency == IncomeFrequency.Monthly ? i.Amount * 12 :
                                     i.Frequency == IncomeFrequency.BiWeekly ? i.Amount * 26 :
                                     i.Frequency == IncomeFrequency.Weekly ? i.Amount * 52 :
                                     i.Frequency == IncomeFrequency.Quarterly ? i.Amount * 4 :
                                     i.Frequency == IncomeFrequency.Annually ? i.Amount : i.Amount * 12,
                        i.Reliability,
                        i.IsGuaranteed,
                        i.IsActive,
                        i.IsTaxable,
                        i.IsW2Income,
                        i.Is1099Income,
                        i.VADisabilityPercentage,
                        i.IsVACombined,
                        i.GovernmentAgency,
                        i.GS_PayScale,
                        i.Symbol,
                        i.DividendYield,
                        i.StartDate,
                        i.EndDate,
                        i.NextPaymentDate,
                        i.AnnualGrowthRate,
                        i.CreatedAt,
                        i.UpdatedAt,
                        DaysUntilNextPayment = i.NextPaymentDate.HasValue ? 
                            (int)(i.NextPaymentDate.Value - DateTime.UtcNow).TotalDays : (int?)null
                    })
                    .ToListAsync();

                return Ok(incomeSources);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving income sources for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/IncomeSources/5
        [HttpGet("{id}")]
        public async Task<ActionResult<IncomeSource>> GetIncomeSource(int id)
        {
            try
            {
                var incomeSource = await _context.IncomeSources.FindAsync(id);

                if (incomeSource == null)
                {
                    return NotFound($"Income source with ID {id} not found");
                }

                return incomeSource;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving income source {IncomeSourceId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/IncomeSources
        [HttpPost]
        public async Task<ActionResult<IncomeSource>> PostIncomeSource(IncomeSource incomeSource)
        {
            try
            {
                incomeSource.CreatedAt = DateTime.UtcNow;
                incomeSource.UpdatedAt = DateTime.UtcNow;
                incomeSource.IsActive = true;

                // Set next payment date based on frequency if not provided
                if (!incomeSource.NextPaymentDate.HasValue)
                {
                    incomeSource.NextPaymentDate = CalculateNextPaymentDate(incomeSource.Frequency);
                }

                _context.IncomeSources.Add(incomeSource);
                await _context.SaveChangesAsync();

                return CreatedAtAction("GetIncomeSource", new { id = incomeSource.IncomeSourceId }, incomeSource);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating income source");
                return StatusCode(500, "Internal server error");
            }
        }

        // PUT: api/IncomeSources/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutIncomeSource(int id, IncomeSource incomeSource)
        {
            if (id != incomeSource.IncomeSourceId)
            {
                return BadRequest("Income source ID mismatch");
            }

            try
            {
                incomeSource.UpdatedAt = DateTime.UtcNow;
                
                _context.Entry(incomeSource).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!IncomeSourceExists(id))
                {
                    return NotFound($"Income source with ID {id} not found");
                }
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating income source {IncomeSourceId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // DELETE: api/IncomeSources/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteIncomeSource(int id)
        {
            try
            {
                var incomeSource = await _context.IncomeSources.FindAsync(id);
                if (incomeSource == null)
                {
                    return NotFound($"Income source with ID {id} not found");
                }

                _context.IncomeSources.Remove(incomeSource);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting income source {IncomeSourceId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/IncomeSources/va-disability/user/5
        [HttpGet("va-disability/user/{userId}")]
        public async Task<ActionResult<object>> GetVADisabilityInfo(int userId)
        {
            try
            {
                var vaIncomeSources = await _context.IncomeSources
                    .Where(i => i.UserId == userId && i.Type == IncomeType.VADisability)
                    .OrderByDescending(i => i.Amount)
                    .ToListAsync();

                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound($"User with ID {userId} not found");
                }

                var totalVAIncome = vaIncomeSources.Sum(i => i.Amount);
                var combinedRating = vaIncomeSources.FirstOrDefault(i => i.IsVACombined)?.VADisabilityPercentage;

                var vaInfo = new
                {
                    UserId = userId,
                    TotalMonthlyAmount = totalVAIncome,
                    AnnualAmount = totalVAIncome * 12,
                    CombinedRating = combinedRating,
                    UserVAAmount = user.VADisabilityMonthlyAmount,
                    UserVAPercentage = user.VADisabilityPercentage,
                    IsGuaranteedIncome = vaIncomeSources.Any(i => i.IsGuaranteed),
                    IsTaxFree = vaIncomeSources.All(i => !i.IsTaxable),
                    VASources = vaIncomeSources.Select(i => new
                    {
                        i.IncomeSourceId,
                        i.Name,
                        i.Amount,
                        i.VADisabilityPercentage,
                        i.IsVACombined,
                        i.IsGuaranteed,
                        i.StartDate,
                        i.NextPaymentDate,
                        i.AnnualGrowthRate,
                        i.IsActive
                    }),
                    LastUpdated = vaIncomeSources.Any() ? 
                        vaIncomeSources.Max(i => i.UpdatedAt) : user.UpdatedAt
                };

                return vaInfo;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving VA disability info for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/IncomeSources/summary/user/5
        [HttpGet("summary/user/{userId}")]
        public async Task<ActionResult<object>> GetIncomeSummary(int userId)
        {
            try
            {
                var incomeSources = await _context.IncomeSources
                    .Where(i => i.UserId == userId && i.IsActive)
                    .ToListAsync();

                var monthlyGuaranteed = incomeSources
                    .Where(i => i.IsGuaranteed)
                    .Sum(i => ConvertToMonthlyAmount(i.Amount, i.Frequency));

                var monthlyVariable = incomeSources
                    .Where(i => !i.IsGuaranteed)
                    .Sum(i => ConvertToMonthlyAmount(i.Amount, i.Frequency));

                var monthlyTaxable = incomeSources
                    .Where(i => i.IsTaxable)
                    .Sum(i => ConvertToMonthlyAmount(i.Amount, i.Frequency));

                var monthlyTaxFree = incomeSources
                    .Where(i => !i.IsTaxable)
                    .Sum(i => ConvertToMonthlyAmount(i.Amount, i.Frequency));

                var monthlyW2 = incomeSources
                    .Where(i => i.IsW2Income)
                    .Sum(i => ConvertToMonthlyAmount(i.Amount, i.Frequency));

                var monthly1099 = incomeSources
                    .Where(i => i.Is1099Income)
                    .Sum(i => ConvertToMonthlyAmount(i.Amount, i.Frequency));

                var monthlyDividends = incomeSources
                    .Where(i => i.Type == IncomeType.Dividends)
                    .Sum(i => ConvertToMonthlyAmount(i.Amount, i.Frequency));

                var summary = new
                {
                    UserId = userId,
                    TotalMonthly = monthlyGuaranteed + monthlyVariable,
                    TotalAnnual = (monthlyGuaranteed + monthlyVariable) * 12,
                    GuaranteedMonthly = monthlyGuaranteed,
                    VariableMonthly = monthlyVariable,
                    TaxableMonthly = monthlyTaxable,
                    TaxFreeMonthly = monthlyTaxFree,
                    W2IncomeMonthly = monthlyW2,
                    Income1099Monthly = monthly1099,
                    DividendIncomeMonthly = monthlyDividends,
                    IncomeSourceCount = incomeSources.Count,
                    IncomeTypes = incomeSources.GroupBy(i => i.Type)
                        .Select(g => new
                        {
                            Type = g.Key.ToString(),
                            Count = g.Count(),
                            MonthlyAmount = g.Sum(i => ConvertToMonthlyAmount(i.Amount, i.Frequency))
                        }),
                    LastUpdated = incomeSources.Any() ? 
                        incomeSources.Max(i => i.UpdatedAt) : DateTime.UtcNow
                };

                return summary;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving income summary for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        private DateTime CalculateNextPaymentDate(IncomeFrequency frequency)
        {
            var now = DateTime.UtcNow;
            return frequency switch
            {
                IncomeFrequency.Weekly => now.AddDays(7),
                IncomeFrequency.BiWeekly => now.AddDays(14),
                IncomeFrequency.Monthly => now.AddMonths(1),
                IncomeFrequency.Quarterly => now.AddMonths(3),
                IncomeFrequency.Annually => now.AddYears(1),
                _ => now.AddMonths(1)
            };
        }

        private decimal ConvertToMonthlyAmount(decimal amount, IncomeFrequency frequency)
        {
            return frequency switch
            {
                IncomeFrequency.Weekly => amount * 4.333m,
                IncomeFrequency.BiWeekly => amount * 2.167m,
                IncomeFrequency.Monthly => amount,
                IncomeFrequency.Quarterly => amount / 3,
                IncomeFrequency.Annually => amount / 12,
                _ => amount
            };
        }

        private bool IncomeSourceExists(int id)
        {
            return _context.IncomeSources.Any(e => e.IncomeSourceId == id);
        }
    }
}