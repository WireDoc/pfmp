using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PFMP_API.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace PFMP_API.Services
{
    public interface IAuthenticationService
    {
        Task<User> GetOrCreateUserFromClaimsAsync(ClaimsPrincipal claims);
        Task<AuthenticationResult> AuthenticateAsync(string email, string password);
        Task<AuthenticationResult> RegisterAsync(RegisterRequest request);
        Task<AuthenticationResult> AuthenticateWithAzureAsync(string azureToken);
        Task<AuthenticationResult> RefreshTokenAsync(string refreshToken);
        Task<bool> RevokeTokenAsync(string refreshToken);
        Task<User?> GetUserByAzureIdAsync(string azureObjectId);
        Task<bool> LinkAzureAccountAsync(int userId, string azureObjectId);
    }

    public class AuthenticationService : IAuthenticationService
    {
        private readonly PFMP_API.ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthenticationService> _logger;
        private readonly IPasswordHashService _passwordHashService;
        private readonly HttpClient _httpClient;
        
        // JWT Configuration
        private readonly string _jwtSecretKey;
        private readonly string _jwtIssuer;
        private readonly string _jwtAudience;
        private readonly int _jwtExpirationMinutes;
        
        // Azure AD Configuration
        private readonly string? _azureTenantId;
        private readonly string? _azureClientId;
        private readonly string? _azureClientSecret;
        
        // Developer bypass mode
        private readonly bool _bypassAuthentication;

        public AuthenticationService(
            PFMP_API.ApplicationDbContext context,
            IConfiguration configuration,
            ILogger<AuthenticationService> logger,
            IPasswordHashService passwordHashService,
            HttpClient httpClient)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _passwordHashService = passwordHashService;
            _httpClient = httpClient;

            // JWT Configuration
            _jwtSecretKey = _configuration["JWT:SecretKey"] ?? "PFMP-Dev-Secret-Key-Change-In-Production-2025";
            _jwtIssuer = _configuration["JWT:Issuer"] ?? "PFMP-API";
            _jwtAudience = _configuration["JWT:Audience"] ?? "PFMP-Frontend";
            _jwtExpirationMinutes = _configuration.GetValue<int>("JWT:ExpirationMinutes", 60);

            // Azure AD Configuration
            _azureTenantId = _configuration["AzureAD:TenantId"];
            _azureClientId = _configuration["AzureAD:ClientId"];
            _azureClientSecret = _configuration["AzureAD:ClientSecret"];
            
            // Developer bypass mode
            _bypassAuthentication = _configuration.GetValue<bool>("Development:BypassAuthentication", false);

            if (_bypassAuthentication)
            {
                _logger.LogWarning("Authentication bypass is ENABLED. This should only be used in development!");
            }
        }

        public async Task<User> GetOrCreateUserFromClaimsAsync(ClaimsPrincipal claims)
        {
            var objectId = claims.FindFirst("oid")?.Value ?? claims.FindFirst("sub")?.Value;
            var email = claims.FindFirst("email")?.Value ?? claims.FindFirst("preferred_username")?.Value;
            var name = claims.FindFirst("name")?.Value;
            var givenName = claims.FindFirst("given_name")?.Value;
            var surname = claims.FindFirst("family_name")?.Value;

            if (string.IsNullOrEmpty(objectId) || string.IsNullOrEmpty(email))
            {
                throw new ArgumentException("Required claims (oid/sub and email) not found in token");
            }

            // Try to find existing user by Azure Object ID
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.AzureObjectId == objectId && u.IsActive);

            if (user == null)
            {
                // Try to find by email and link Azure account
                user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower() && u.IsActive);

                if (user != null)
                {
                    // Link existing account with Azure
                    user.AzureObjectId = objectId;
                    user.LastLoginAt = DateTime.UtcNow;
                    user.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Linked existing user {UserId} with Azure Object ID {ObjectId}", user.UserId, objectId);
                }
                else
                {
                    // Create new user from Azure claims
                    user = new User
                    {
                        Email = email,
                        FirstName = givenName ?? ExtractFirstName(name),
                        LastName = surname ?? ExtractLastName(name),
                        AzureObjectId = objectId,
                        IsActive = true,
                        LastLoginAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.Users.Add(user);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Created new user from Azure claims: {Email} (ObjectId: {ObjectId})", email, objectId);
                }
            }
            else
            {
                // Update last login time
                user.LastLoginAt = DateTime.UtcNow;
                user.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return user;
        }

        public async Task<AuthenticationResult> AuthenticateAsync(string email, string password)
        {
            try
            {
                if (_bypassAuthentication)
                {
                    _logger.LogInformation("Authentication bypassed for development - email: {Email}", email);
                    return await CreateDevelopmentAuthResult(email);
                }

                if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
                {
                    return AuthenticationResult.Failure("Email and password are required");
                }

                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower() && u.IsActive);

                if (user == null || string.IsNullOrEmpty(user.PasswordHash))
                {
                    return AuthenticationResult.Failure("Invalid credentials");
                }

                if (!_passwordHashService.VerifyPassword(password, user.PasswordHash))
                {
                    user.FailedLoginAttempts++;
                    await _context.SaveChangesAsync();
                    _logger.LogWarning("Invalid password attempt for user {Email}", email);
                    return AuthenticationResult.Failure("Invalid credentials");
                }

                // Reset failed attempts on successful login
                user.FailedLoginAttempts = 0;
                user.LastLoginAt = DateTime.UtcNow;
                user.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return CreateSuccessfulAuthResult(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during authentication for email: {Email}", email);
                return AuthenticationResult.Failure("Authentication failed");
            }
        }

        public async Task<AuthenticationResult> RegisterAsync(RegisterRequest request)
        {
            try
            {
                if (_bypassAuthentication)
                {
                    _logger.LogInformation("Registration bypassed for development - email: {Email}", request.Email);
                    return await CreateDevelopmentAuthResult(request.Email);
                }

                // Validate request
                if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                {
                    return AuthenticationResult.Failure("Email and password are required");
                }

                if (request.Password.Length < 8)
                {
                    return AuthenticationResult.Failure("Password must be at least 8 characters long");
                }

                // Check if user already exists
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

                if (existingUser != null)
                {
                    return AuthenticationResult.Failure("User with this email already exists");
                }

                // Create new user
                var passwordHash = _passwordHashService.HashPassword(request.Password);
                var user = new User
                {
                    Email = request.Email,
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    PasswordHash = passwordHash,
                    IsActive = true,
                    LastLoginAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                _logger.LogInformation("New user registered: {Email}", request.Email);
                return CreateSuccessfulAuthResult(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during user registration for email: {Email}", request.Email);
                return AuthenticationResult.Failure("Registration failed");
            }
        }

        public async Task<AuthenticationResult> AuthenticateWithAzureAsync(string azureToken)
        {
            try
            {
                if (_bypassAuthentication)
                {
                    _logger.LogInformation("Azure authentication bypassed for development");
                    return await CreateDevelopmentAuthResult("dev.user@pfmp.local");
                }

                // Validate Azure JWT token
                var azureClaims = await ValidateAzureTokenAsync(azureToken);
                if (azureClaims == null)
                {
                    return AuthenticationResult.Failure("Invalid Azure token");
                }

                // Get or create user from Azure claims
                var user = await GetOrCreateUserFromClaimsAsync(azureClaims);
                return CreateSuccessfulAuthResult(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during Azure authentication");
                return AuthenticationResult.Failure("Azure authentication failed");
            }
        }

        public async Task<AuthenticationResult> RefreshTokenAsync(string refreshToken)
        {
            try
            {
                if (_bypassAuthentication)
                {
                    return await CreateDevelopmentAuthResult("dev.user@pfmp.local");
                }

                // In production, implement refresh token validation
                // For now, return failure
                return AuthenticationResult.Failure("Refresh token not implemented");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing token");
                return AuthenticationResult.Failure("Token refresh failed");
            }
        }

        public async Task<bool> RevokeTokenAsync(string refreshToken)
        {
            try
            {
                // In production, implement token revocation
                await Task.CompletedTask;
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error revoking token");
                return false;
            }
        }

        public async Task<User?> GetUserByAzureIdAsync(string azureObjectId)
        {
            try
            {
                return await _context.Users
                    .FirstOrDefaultAsync(u => u.AzureObjectId == azureObjectId && u.IsActive);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finding user by Azure ID: {AzureObjectId}", azureObjectId);
                return null;
            }
        }

        public async Task<bool> LinkAzureAccountAsync(int userId, string azureObjectId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null || !user.IsActive)
                {
                    return false;
                }

                user.AzureObjectId = azureObjectId;
                user.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Linked user {UserId} with Azure Object ID {AzureObjectId}", userId, azureObjectId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error linking Azure account for user {UserId}", userId);
                return false;
            }
        }

        #region Private Helper Methods

        private AuthenticationResult CreateSuccessfulAuthResult(User user)
        {
            var token = GenerateJwtToken(user);

            return new AuthenticationResult
            {
                IsSuccess = true,
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddMinutes(_jwtExpirationMinutes),
                User = new UserInfo
                {
                    UserId = user.UserId,
                    Email = user.Email,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    IsSetupComplete = IsUserSetupComplete(user)
                }
            };
        }

        private async Task<AuthenticationResult> CreateDevelopmentAuthResult(string email)
        {
            try
            {
                // In development mode, try to find existing user or use default test user
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
                
                if (user == null)
                {
                    var defaultUserId = _configuration.GetValue<int>("Development:DefaultTestUserId", 1);
                    user = await _context.Users.FindAsync(defaultUserId);
                    
                    if (user == null)
                    {
                        // Create a development user
                        user = new User
                        {
                            Email = email,
                            FirstName = "Development",
                            LastName = "User",
                            IsActive = true,
                            LastLoginAt = DateTime.UtcNow,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.Users.Add(user);
                        await _context.SaveChangesAsync();
                    }
                }

                return CreateSuccessfulAuthResult(user);
            }
            catch (Exception ex)
            {
                // If database is not available, create a mock user for development
                _logger.LogWarning(ex, "Database not available in development mode, creating mock user");
                
                var mockUser = new User
                {
                    UserId = 1,
                    Email = email,
                    FirstName = "Development",
                    LastName = "User",
                    IsActive = true,
                    LastLoginAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                return CreateSuccessfulAuthResult(mockUser);
            }
        }

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_jwtSecretKey);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, $"{user.FirstName} {user.LastName}".Trim()),
                new Claim("UserId", user.UserId.ToString()),
                new Claim("SetupComplete", IsUserSetupComplete(user).ToString().ToLower())
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(_jwtExpirationMinutes),
                Issuer = _jwtIssuer,
                Audience = _jwtAudience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private async Task<ClaimsPrincipal?> ValidateAzureTokenAsync(string azureToken)
        {
            try
            {
                if (string.IsNullOrEmpty(_azureTenantId))
                {
                    _logger.LogWarning("Azure AD not configured - TenantId missing");
                    return null;
                }

                var tokenHandler = new JwtSecurityTokenHandler();
                if (!tokenHandler.CanReadToken(azureToken))
                {
                    return null;
                }

                // Get Azure AD signing keys from the well-known endpoint
                var keysUrl = $"https://login.microsoftonline.com/{_azureTenantId}/discovery/v2.0/keys";
                var keysResponse = await _httpClient.GetStringAsync(keysUrl);
                var keysJson = JsonDocument.Parse(keysResponse);
                
                // In a production environment, you would:
                // 1. Cache the signing keys
                // 2. Validate the token signature using the keys
                // 3. Validate issuer, audience, and expiration
                
                // For now, we'll do basic validation
                var token = tokenHandler.ReadJwtToken(azureToken);
                var expectedIssuer = $"https://login.microsoftonline.com/{_azureTenantId}/v2.0";
                
                if (token.Issuer != expectedIssuer)
                {
                    _logger.LogWarning("Invalid Azure token issuer: {Issuer}", token.Issuer);
                    return null;
                }

                if (token.ValidTo < DateTime.UtcNow)
                {
                    _logger.LogWarning("Azure token has expired");
                    return null;
                }

                var claims = new ClaimsIdentity(token.Claims, "AzureAD");
                return new ClaimsPrincipal(claims);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to validate Azure token");
                return null;
            }
        }

        private bool IsUserSetupComplete(User user)
        {
            return !string.IsNullOrEmpty(user.FirstName) && 
                   !string.IsNullOrEmpty(user.LastName) &&
                   user.DateOfBirth.HasValue &&
                   !string.IsNullOrEmpty(user.EmploymentType);
        }

        private string ExtractFirstName(string? fullName)
        {
            if (string.IsNullOrEmpty(fullName)) return "";
            var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return parts.Length > 0 ? parts[0] : "";
        }

        private string ExtractLastName(string? fullName)
        {
            if (string.IsNullOrEmpty(fullName)) return "";
            var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return parts.Length > 1 ? string.Join(" ", parts.Skip(1)) : "";
        }

        #endregion
    }

    public class AuthenticationResult
    {
        public bool IsSuccess { get; set; }
        public string? Token { get; set; }
        public UserInfo? User { get; set; }
        public string? ErrorMessage { get; set; }
        public DateTime ExpiresAt { get; set; }

        public static AuthenticationResult Success(User user)
        {
            return new AuthenticationResult { IsSuccess = true };
        }

        public static AuthenticationResult Failure(string error)
        {
            return new AuthenticationResult { IsSuccess = false, ErrorMessage = error };
        }
    }

    public class RegisterRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
    }

    public class UserInfo
    {
        public int UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public bool IsSetupComplete { get; set; }
    }
}
