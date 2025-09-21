using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GoalsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<GoalsController> _logger;

        public GoalsController(ApplicationDbContext context, ILogger<GoalsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Goals/user/5
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetGoalsByUser(int userId)
        {
            try
            {
                var goals = await _context.Goals
                    .Where(g => g.UserId == userId)
                    .Include(g => g.Milestones)
                    .OrderByDescending(g => g.Priority)
                    .ThenBy(g => g.TargetDate)
                    .Select(g => new
                    {
                        g.GoalId,
                        g.Name,
                        g.Description,
                        g.Type,
                        g.Category,
                        g.TargetAmount,
                        g.CurrentAmount,
                        RemainingAmount = g.TargetAmount - g.CurrentAmount,
                        CompletionPercentage = g.TargetAmount != 0 ? (g.CurrentAmount / g.TargetAmount) * 100 : 0,
                        g.TargetDate,
                        g.MonthlyContribution,
                        g.RequiredMonthlyContribution,
                        g.Priority,
                        g.Status,
                        g.CreatedAt,
                        g.UpdatedAt,
                        MilestoneCount = g.Milestones.Count,
                        CompletedMilestones = g.Milestones.Count(m => m.Status == MilestoneStatus.Completed),
                        DaysRemaining = g.TargetDate.HasValue ? 
                            (int)(g.TargetDate.Value - DateTime.UtcNow).TotalDays : (int?)null
                    })
                    .ToListAsync();

                return Ok(goals);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving goals for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/Goals/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Goal>> GetGoal(int id)
        {
            try
            {
                var goal = await _context.Goals
                    .Include(g => g.Milestones.OrderBy(m => m.SortOrder))
                    .FirstOrDefaultAsync(g => g.GoalId == id);

                if (goal == null)
                {
                    return NotFound($"Goal with ID {id} not found");
                }

                return goal;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving goal {GoalId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/Goals
        [HttpPost]
        public async Task<ActionResult<Goal>> PostGoal(Goal goal)
        {
            try
            {
                goal.CreatedAt = DateTime.UtcNow;
                goal.UpdatedAt = DateTime.UtcNow;
                goal.CurrentAmount = 0; // Start with 0

                // Calculate required monthly contribution if target date is provided
                if (goal.TargetDate.HasValue && goal.TargetAmount > 0)
                {
                    var monthsRemaining = (decimal)((goal.TargetDate.Value - DateTime.UtcNow).TotalDays / 30.44);
                    if (monthsRemaining > 0)
                    {
                        goal.RequiredMonthlyContribution = (goal.TargetAmount - goal.CurrentAmount) / monthsRemaining;
                    }
                }

                _context.Goals.Add(goal);
                await _context.SaveChangesAsync();

                // Create default milestones for certain goal types
                await CreateDefaultMilestones(goal);

                return CreatedAtAction("GetGoal", new { id = goal.GoalId }, goal);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating goal");
                return StatusCode(500, "Internal server error");
            }
        }

        // PUT: api/Goals/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutGoal(int id, Goal goal)
        {
            if (id != goal.GoalId)
            {
                return BadRequest("Goal ID mismatch");
            }

            try
            {
                goal.UpdatedAt = DateTime.UtcNow;

                // Recalculate required monthly contribution
                if (goal.TargetDate.HasValue && goal.TargetAmount > 0)
                {
                    var monthsRemaining = (decimal)((goal.TargetDate.Value - DateTime.UtcNow).TotalDays / 30.44);
                    if (monthsRemaining > 0)
                    {
                        goal.RequiredMonthlyContribution = (goal.TargetAmount - goal.CurrentAmount) / monthsRemaining;
                    }
                }

                // Update status based on completion
                if (goal.CurrentAmount >= goal.TargetAmount)
                {
                    goal.Status = GoalStatus.Completed;
                    goal.CompletedAt = DateTime.UtcNow;
                }
                else if (goal.Status == GoalStatus.Completed)
                {
                    goal.Status = GoalStatus.Active;
                    goal.CompletedAt = null;
                }

                _context.Entry(goal).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!GoalExists(id))
                {
                    return NotFound($"Goal with ID {id} not found");
                }
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating goal {GoalId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/Goals/5/progress
        [HttpPost("{id}/progress")]
        public async Task<IActionResult> UpdateGoalProgress(int id, [FromBody] decimal newAmount)
        {
            try
            {
                var goal = await _context.Goals
                    .Include(g => g.Milestones)
                    .FirstOrDefaultAsync(g => g.GoalId == id);

                if (goal == null)
                {
                    return NotFound($"Goal with ID {id} not found");
                }

                var previousAmount = goal.CurrentAmount;
                goal.CurrentAmount = newAmount;
                goal.UpdatedAt = DateTime.UtcNow;

                // Update status based on completion
                if (goal.CurrentAmount >= goal.TargetAmount && goal.Status != GoalStatus.Completed)
                {
                    goal.Status = GoalStatus.Completed;
                    goal.CompletedAt = DateTime.UtcNow;
                }
                else if (goal.CurrentAmount < goal.TargetAmount && goal.Status == GoalStatus.Completed)
                {
                    goal.Status = GoalStatus.Active;
                    goal.CompletedAt = null;
                }

                // Update milestone completion status
                foreach (var milestone in goal.Milestones)
                {
                    if (goal.CurrentAmount >= milestone.TargetAmount && milestone.Status != MilestoneStatus.Completed)
                    {
                        milestone.Status = MilestoneStatus.Completed;
                        milestone.CompletedAt = DateTime.UtcNow;
                        milestone.UpdatedAt = DateTime.UtcNow;
                    }
                    else if (goal.CurrentAmount < milestone.TargetAmount && milestone.Status == MilestoneStatus.Completed)
                    {
                        milestone.Status = MilestoneStatus.InProgress;
                        milestone.CompletedAt = null;
                        milestone.UpdatedAt = DateTime.UtcNow;
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    GoalId = id,
                    PreviousAmount = previousAmount,
                    NewAmount = newAmount,
                    Progress = Math.Round((newAmount / goal.TargetAmount) * 100, 2),
                    Status = goal.Status,
                    CompletedMilestones = goal.Milestones.Count(m => m.Status == MilestoneStatus.Completed),
                    TotalMilestones = goal.Milestones.Count
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating progress for goal {GoalId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/Goals/emergency-fund/user/5
        [HttpGet("emergency-fund/user/{userId}")]
        public async Task<ActionResult<object>> GetEmergencyFundStatus(int userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound($"User with ID {userId} not found");
                }

                var emergencyFundGoal = await _context.Goals
                    .Include(g => g.Milestones)
                    .FirstOrDefaultAsync(g => g.UserId == userId && g.Type == GoalType.EmergencyFund);

                var emergencyFundAccounts = await _context.Accounts
                    .Where(a => a.UserId == userId && a.IsEmergencyFund)
                    .ToListAsync();

                var currentBalance = emergencyFundAccounts.Sum(a => a.CurrentBalance);
                var target = emergencyFundGoal?.TargetAmount ?? user.EmergencyFundTarget;
                var progress = target > 0 ? (currentBalance / target) * 100 : 0;

                var monthsOfExpenses = emergencyFundGoal?.MonthlyExpenses ?? 0;
                var actualMonthsCovered = monthsOfExpenses > 0 ? currentBalance / monthsOfExpenses : 0;

                var status = new
                {
                    UserId = userId,
                    CurrentBalance = currentBalance,
                    TargetAmount = target,
                    Progress = Math.Round(progress, 2),
                    MonthsOfExpensesTarget = emergencyFundGoal?.MonthsOfExpenses,
                    MonthlyExpenses = monthsOfExpenses,
                    ActualMonthsCovered = Math.Round(actualMonthsCovered, 1),
                    IsFullyFunded = currentBalance >= target,
                    ShortfallAmount = Math.Max(0, target - currentBalance),
                    ExcessAmount = Math.Max(0, currentBalance - target),
                    GoalId = emergencyFundGoal?.GoalId,
                    GoalStatus = emergencyFundGoal?.Status,
                    RequiredMonthlyContribution = emergencyFundGoal?.RequiredMonthlyContribution,
                    Accounts = emergencyFundAccounts.Select(a => new
                    {
                        a.AccountId,
                        a.AccountName,
                        a.CurrentBalance,
                        InterestRate = a.InterestRate ?? 0,
                        a.Institution,
                        MonthlyInterestIncome = (a.CurrentBalance * (a.InterestRate ?? 0) / 100) / 12
                    }),
                    LastUpdated = emergencyFundGoal?.UpdatedAt ?? user.UpdatedAt
                };

                return status;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving emergency fund status for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        // DELETE: api/Goals/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteGoal(int id)
        {
            try
            {
                var goal = await _context.Goals.FindAsync(id);
                if (goal == null)
                {
                    return NotFound($"Goal with ID {id} not found");
                }

                _context.Goals.Remove(goal);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting goal {GoalId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        private async Task CreateDefaultMilestones(Goal goal)
        {
            try
            {
                var milestones = new List<GoalMilestone>();

                // Create percentage-based milestones for most goals
                var percentages = new[] { 25m, 50m, 75m, 100m };
                var milestoneNames = new[] { "25% Complete", "Halfway There", "75% Complete", "Goal Achieved" };

                for (int i = 0; i < percentages.Length; i++)
                {
                    milestones.Add(new GoalMilestone
                    {
                        GoalId = goal.GoalId,
                        Title = milestoneNames[i],
                        Description = $"Reach {percentages[i]}% of your {goal.Name} goal",
                        TargetAmount = Math.Round(goal.TargetAmount * (percentages[i] / 100), 2),
                        TargetDate = goal.TargetDate ?? DateTime.UtcNow.AddYears(1),
                        SortOrder = i + 1,
                        Status = MilestoneStatus.NotStarted,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }

                _context.GoalMilestones.AddRange(milestones);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating default milestones for goal {GoalId}", goal.GoalId);
                // Don't throw - milestone creation is optional
            }
        }

        private bool GoalExists(int id)
        {
            return _context.Goals.Any(e => e.GoalId == id);
        }
    }
}