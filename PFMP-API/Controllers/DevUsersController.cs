using Microsoft.AspNetCore.Mvc;
using PFMP_API.Services;
using Microsoft.AspNetCore.Hosting;

namespace PFMP_API.Controllers;

[ApiController]
[Route("api/dev/users")] // dev-only utilities
public class DevUsersController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    public DevUsersController(IWebHostEnvironment env)
    {
        _env = env;
    }

    [HttpGet]
    public ActionResult<object> List()
    {
        if (!_env.IsDevelopment()) return NotFound();
        var users = DevUserRegistry.GetAll().Select(kv => new { userId = kv.Key, email = kv.Value, isDefault = kv.Key == DevUserRegistry.DefaultTestUserId });
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
