using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<UsersController> _logger;

        public UsersController(ApplicationDbContext context, ILogger<UsersController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            try
            {
                return await _context.Users
                    .Include(u => u.Accounts)
                    .Include(u => u.Goals)
                    .Include(u => u.IncomeSources)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving users");
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/Users/5
        [HttpGet("{id}")]
        public async Task<ActionResult<User>> GetUser(int id)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.Accounts)
                        .ThenInclude(a => a.Holdings)
                    .Include(u => u.Goals)
                        .ThenInclude(g => g.Milestones)
                    .Include(u => u.IncomeSources)
                    .Include(u => u.InsurancePolicies)
                    .Include(u => u.RealEstateProperties)
                    .Include(u => u.Alerts)
                    .FirstOrDefaultAsync(u => u.UserId == id);

                if (user == null)
                {
                    return NotFound($"User with ID {id} not found");
                }

                return user;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user {UserId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // PUT: api/Users/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutUser(int id, User user)
        {
            if (id != user.UserId)
            {
                return BadRequest("User ID mismatch");
            }

            try
            {
                user.UpdatedAt = DateTime.UtcNow;
                _context.Entry(user).State = EntityState.Modified;

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UserExists(id))
                {
                    return NotFound($"User with ID {id} not found");
                }
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user {UserId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/Users
        [HttpPost]
        public async Task<ActionResult<User>> PostUser(User user)
        {
            try
            {
                user.CreatedAt = DateTime.UtcNow;
                user.UpdatedAt = DateTime.UtcNow;
                
                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                return CreatedAtAction("GetUser", new { id = user.UserId }, user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating user");
                return StatusCode(500, "Internal server error");
            }
        }

        // DELETE: api/Users/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound($"User with ID {id} not found");
                }

                _context.Users.Remove(user);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting user {UserId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/Users/5/summary
        [HttpGet("{id}/summary")]
        public async Task<ActionResult<object>> GetUserSummary(int id)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.Accounts)
                    .Include(u => u.Goals)
                    .Include(u => u.IncomeSources)
                    .FirstOrDefaultAsync(u => u.UserId == id);

                if (user == null)
                {
                    return NotFound($"User with ID {id} not found");
                }

                var totalBalance = user.Accounts.Sum(a => a.CurrentBalance);
                var emergencyFundProgress = totalBalance > 0 ? 
                    (user.EmergencyFundTarget > 0 ? (totalBalance / user.EmergencyFundTarget) * 100 : 0) : 0;
                
                var monthlyIncome = user.IncomeSources
                    .Where(i => i.IsActive)
                    .Sum(i => i.Frequency == IncomeFrequency.Monthly ? i.Amount :
                           i.Frequency == IncomeFrequency.BiWeekly ? i.Amount * 2.167m :
                           i.Frequency == IncomeFrequency.Weekly ? i.Amount * 4.333m :
                           i.Amount / 12);

                var summary = new
                {
                    UserId = user.UserId,
                    Name = $"{user.FirstName} {user.LastName}",
                    TotalBalance = totalBalance,
                    EmergencyFundTarget = user.EmergencyFundTarget,
                    EmergencyFundProgress = Math.Round(emergencyFundProgress, 2),
                    MonthlyIncome = monthlyIncome,
                    AccountCount = user.Accounts.Count,
                    ActiveGoals = user.Goals.Count(g => g.Status == GoalStatus.Active),
                    VADisabilityAmount = user.VADisabilityMonthlyAmount,
                    IsGovernmentEmployee = user.IsGovernmentEmployee,
                    RiskTolerance = user.RiskTolerance,
                    LastUpdated = user.UpdatedAt
                };

                return summary;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user summary {UserId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        private bool UserExists(int id)
        {
            return _context.Users.Any(e => e.UserId == id);
        }
    }
}