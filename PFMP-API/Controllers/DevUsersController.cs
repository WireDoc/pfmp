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

        // Merge any DB test users not yet in the in-memory registry (e.g. created via admin endpoint or direct DB insert)
        var candidates = _db.Users
            .AsNoTracking()
            .Where(u => u.IsTestAccount || u.BypassAuthentication)
            .OrderBy(u => u.UserId)
            .Select(u => new { u.UserId, u.Email })
            .Take(50)
            .ToList();

        foreach (var c in candidates)
        {
            DevUserRegistry.Register(c.UserId, c.Email);
        }
        if (reg.Count == 0 && candidates.Count > 0)
        {
            // If default points to a non-registered id, set it to the lowest candidate
            var currentDefault = DevUserRegistry.DefaultTestUserId;
            if (!DevUserRegistry.GetAll().ContainsKey(currentDefault))
            {
                DevUserRegistry.SetDefault(candidates.First().UserId);
            }
        }
        reg = DevUserRegistry.GetAll();

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
