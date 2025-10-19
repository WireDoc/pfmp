using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Services;
using Microsoft.AspNetCore.Hosting;

namespace PFMP_API.Controllers;

[ApiController]
[Route("api/dev/users")] // dev-only utilities
public class DevUsersController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ApplicationDbContext _db;
    public DevUsersController(IWebHostEnvironment env, ApplicationDbContext db)
    {
        _env = env;
        _db = db;
    }

    [HttpGet]
    public ActionResult<object> List()
    {
        if (!_env.IsDevelopment()) return NotFound();
        var reg = DevUserRegistry.GetAll();

        // DB fallback: if registry is empty (fresh server boot without seeding), populate from Users
        if (reg.Count == 0)
        {
            // Pull a small set of clearly dev/test users
            var candidates = _db.Users
                .AsNoTracking()
                .Where(u => u.IsTestAccount || u.BypassAuthentication)
                .OrderBy(u => u.UserId)
                .Select(u => new { u.UserId, u.Email })
                .Take(20)
                .ToList();

            foreach (var c in candidates)
            {
                DevUserRegistry.Register(c.UserId, c.Email);
            }
            if (candidates.Count > 0)
            {
                // If default points to a non-registered id, set it to the lowest candidate
                var currentDefault = DevUserRegistry.DefaultTestUserId;
                if (!DevUserRegistry.GetAll().ContainsKey(currentDefault))
                {
                    DevUserRegistry.SetDefault(candidates.First().UserId);
                }
            }
            reg = DevUserRegistry.GetAll();
        }

        var users = reg.Select(kv => new { userId = kv.Key, email = kv.Value, isDefault = kv.Key == DevUserRegistry.DefaultTestUserId });
        return Ok(new { defaultUserId = DevUserRegistry.DefaultTestUserId, users });
    }

    [HttpPost("default/{userId:int}")]
    public ActionResult SetDefault(int userId)
    {
        if (!_env.IsDevelopment()) return NotFound();
        if (!DevUserRegistry.GetAll().ContainsKey(userId)) return BadRequest("User not registered as dev user");
        DevUserRegistry.SetDefault(userId);
        return NoContent();
    }
}
