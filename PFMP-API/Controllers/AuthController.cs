using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PFMP_API.Services;
using PFMP_API.Services.Auth;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace PFMP_API.Controllers
{
    /// <summary>
    /// Authentication controller for user login, registration, and Azure EntraID integration
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthenticationService _authService;
        private readonly IUserProvisioningService _provisioning;
        private readonly ApplicationDbContext _db;
        private readonly ILogger<AuthController> _logger;
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _env;
        private readonly bool _bypassAuthentication;

        public AuthController(
            IAuthenticationService authService,
            IUserProvisioningService provisioning,
            ApplicationDbContext db,
            ILogger<AuthController> logger,
            IConfiguration configuration,
            IWebHostEnvironment env)
        {
            _authService = authService;
            _provisioning = provisioning;
            _db = db;
            _logger = logger;
            _configuration = configuration;
            _env = env;
            _bypassAuthentication = _configuration.GetValue<bool>("Development:BypassAuthentication", false);
        }

        /// <summary>
        /// Authenticate user with email and password
        /// </summary>
        /// <param name="request">Login credentials</param>
        /// <returns>JWT token and user information</returns>
        [HttpPost("login")]
        public async Task<ActionResult<AuthenticationResult>> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _authService.AuthenticateAsync(request.Email, request.Password);
                
                if (!result.IsSuccess)
                {
                    return Unauthorized(new { message = result.ErrorMessage });
                }

                _logger.LogInformation("Successful login for user: {Email}", request.Email);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login error for email: {Email}", request.Email);
                return StatusCode(500, new { message = "Login failed" });
            }
        }

        /// <summary>
        /// Register new user account
        /// </summary>
        /// <param name="request">Registration information</param>
        /// <returns>JWT token and user information</returns>
        [HttpPost("register")]
        public async Task<ActionResult<AuthenticationResult>> Register([FromBody] RegisterRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _authService.RegisterAsync(request);
                
                if (!result.IsSuccess)
                {
                    return BadRequest(new { message = result.ErrorMessage });
                }

                _logger.LogInformation("Successful registration for user: {Email}", request.Email);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Registration error for email: {Email}", request.Email);
                return StatusCode(500, new { message = "Registration failed" });
            }
        }

        /// <summary>
        /// Authenticate with Azure EntraID token
        /// </summary>
        /// <param name="request">Azure token</param>
        /// <returns>JWT token and user information</returns>
        [HttpPost("azure-login")]
        public async Task<ActionResult<AuthenticationResult>> AzureLogin([FromBody] AzureLoginRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.AzureToken))
                {
                    return BadRequest(new { message = "Azure token is required" });
                }

                var result = await _authService.AuthenticateWithAzureAsync(request.AzureToken);
                
                if (!result.IsSuccess)
                {
                    return Unauthorized(new { message = result.ErrorMessage });
                }

                _logger.LogInformation("Successful Azure login for user: {Email}", result.User?.Email);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Azure login error");
                return StatusCode(500, new { message = "Azure authentication failed" });
            }
        }

        /// <summary>
        /// Refresh JWT token
        /// </summary>
        /// <param name="request">Refresh token</param>
        /// <returns>New JWT token</returns>
        [HttpPost("refresh")]
        public async Task<ActionResult<AuthenticationResult>> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.RefreshToken))
                {
                    return BadRequest(new { message = "Refresh token is required" });
                }

                var result = await _authService.RefreshTokenAsync(request.RefreshToken);
                
                if (!result.IsSuccess)
                {
                    return Unauthorized(new { message = result.ErrorMessage });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Token refresh error");
                return StatusCode(500, new { message = "Token refresh failed" });
            }
        }

        /// <summary>
        /// Logout user and revoke refresh token
        /// </summary>
        /// <param name="request">Refresh token to revoke</param>
        /// <returns>Success status</returns>
        [HttpPost("logout")]
        [Authorize]
        public async Task<ActionResult> Logout([FromBody] RefreshTokenRequest request)
        {
            try
            {
                if (!string.IsNullOrWhiteSpace(request.RefreshToken))
                {
                    await _authService.RevokeTokenAsync(request.RefreshToken);
                }

                return Ok(new { message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Logout error");
                return StatusCode(500, new { message = "Logout failed" });
            }
        }

        /// <summary>
        /// Wave 25 — Returns the PFMP user associated with the current bearer token.
        /// Routes through <see cref="IUserProvisioningService"/> which handles both
        /// dev tokens (UserId claim) and Entra tokens (oid claim, with on-first-login
        /// admin provisioning gated by <c>AzureAD:AdminEmails</c>).
        /// </summary>
        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<UserInfo>> GetCurrentUser(CancellationToken ct)
        {
            try
            {
                var result = await _provisioning.ResolveAsync(User, ct);
                if (result.User == null)
                {
                    _logger.LogInformation("/auth/me rejected: {Outcome} ({Reason})", result.Outcome, result.Reason);
                    return result.Outcome switch
                    {
                        UserProvisioningOutcome.NotAllowed => StatusCode(403, new { message = result.Reason ?? "Not allowed" }),
                        UserProvisioningOutcome.Inactive => StatusCode(403, new { message = result.Reason ?? "Account inactive" }),
                        _ => Unauthorized(new { message = result.Reason ?? "Could not resolve user" })
                    };
                }

                var user = result.User;
                return Ok(new UserInfo
                {
                    UserId = user.UserId,
                    Email = user.Email,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    IsSetupComplete = !string.IsNullOrEmpty(user.FirstName)
                                     && !string.IsNullOrEmpty(user.LastName)
                                     && user.DateOfBirth.HasValue
                                     && !string.IsNullOrEmpty(user.EmploymentType)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current user");
                return StatusCode(500, new { message = "Failed to get user information" });
            }
        }

        /// <summary>
        /// Wave 25 — Mints a dev JWT for the requested user id. Only available in the
        /// Development environment. Used by the simulated-auth path so the frontend can
        /// hit <c>[Authorize]</c>-protected endpoints with a real validated token instead
        /// of a mock string. The mint signs with the <c>JWT:SecretKey</c> symmetric key
        /// that the "DevJwt" bearer scheme validates against.
        /// </summary>
        [HttpPost("dev-login")]
        [AllowAnonymous]
        public async Task<ActionResult<DevLoginResponse>> DevLogin([FromQuery] int userId, CancellationToken ct)
        {
            if (!_env.IsDevelopment())
            {
                return NotFound();
            }

            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId, ct);
            if (user == null) return NotFound(new { message = $"User {userId} not found" });
            if (!user.IsActive) return StatusCode(403, new { message = $"User {userId} is inactive" });

            var jwtKey = _configuration["JWT:SecretKey"] ?? "PFMP-Dev-Secret-Key-Change-In-Production-2025";
            var issuer = _configuration["JWT:Issuer"] ?? "PFMP-API";
            var audience = _configuration["JWT:Audience"] ?? "PFMP-Frontend";
            var expirationMinutes = _configuration.GetValue<int>("JWT:ExpirationMinutes", 60);

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new(ClaimTypes.Email, user.Email ?? string.Empty),
                new(ClaimTypes.Name, $"{user.FirstName} {user.LastName}".Trim()),
                new("UserId", user.UserId.ToString())
            };

            var signing = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                SecurityAlgorithms.HmacSha256Signature);

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                notBefore: DateTime.UtcNow,
                expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
                signingCredentials: signing);

            var encoded = new JwtSecurityTokenHandler().WriteToken(token);

            _logger.LogInformation("Dev login minted token for user {UserId} ({Email})", user.UserId, user.Email);

            return Ok(new DevLoginResponse(
                AccessToken: encoded,
                ExpiresAtUtc: token.ValidTo,
                UserId: user.UserId,
                Email: user.Email ?? string.Empty,
                FirstName: user.FirstName ?? string.Empty,
                LastName: user.LastName ?? string.Empty));
        }

        /// <summary>
        /// Link existing account with Azure EntraID
        /// </summary>
        /// <param name="request">Azure linking information</param>
        /// <returns>Success status</returns>
        [HttpPost("link-azure")]
        [Authorize]
        public async Task<ActionResult> LinkAzureAccount([FromBody] LinkAzureRequest request)
        {
            try
            {
                var userIdClaim = User.FindFirst("UserId")?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                if (string.IsNullOrWhiteSpace(request.AzureObjectId))
                {
                    return BadRequest(new { message = "Azure Object ID is required" });
                }

                var success = await _authService.LinkAzureAccountAsync(userId, request.AzureObjectId);
                
                if (!success)
                {
                    return BadRequest(new { message = "Failed to link Azure account" });
                }

                return Ok(new { message = "Azure account linked successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error linking Azure account");
                return StatusCode(500, new { message = "Failed to link Azure account" });
            }
        }

        /// <summary>
        /// Get authentication configuration for frontend
        /// </summary>
        /// <returns>Authentication settings</returns>
        [HttpGet("config")]
        public ActionResult<AuthConfig> GetAuthConfig()
        {
            return Ok(new AuthConfig
            {
                BypassAuthentication = _bypassAuthentication,
                AzureEnabled = !string.IsNullOrEmpty(_configuration["AzureAD:ClientId"]),
                LocalAuthEnabled = true,
                RegistrationEnabled = _configuration.GetValue<bool>("Authentication:RegistrationEnabled", true)
            });
        }
    }

    #region Request/Response Models

    /// <summary>
    /// Login request model
    /// </summary>
    public class LoginRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(8)]
        public string Password { get; set; } = string.Empty;
    }

    /// <summary>
    /// Azure login request model
    /// </summary>
    public class AzureLoginRequest
    {
        [Required]
        public string AzureToken { get; set; } = string.Empty;
    }

    /// <summary>
    /// Refresh token request model
    /// </summary>
    public class RefreshTokenRequest
    {
        [Required]
        public string RefreshToken { get; set; } = string.Empty;
    }

    /// <summary>
    /// Link Azure account request model
    /// </summary>
    public class LinkAzureRequest
    {
        [Required]
        public string AzureObjectId { get; set; } = string.Empty;
    }

    /// <summary>
    /// Authentication configuration response
    /// </summary>
    public class AuthConfig
    {
        public bool BypassAuthentication { get; set; }
        public bool AzureEnabled { get; set; }
        public bool LocalAuthEnabled { get; set; }
        public bool RegistrationEnabled { get; set; }
    }

    /// <summary>Wave 25 — response shape for /auth/dev-login.</summary>
    public record DevLoginResponse(
        string AccessToken,
        DateTime ExpiresAtUtc,
        int UserId,
        string Email,
        string FirstName,
        string LastName);

    #endregion
}