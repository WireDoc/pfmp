
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PFMP_API.Services;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.OpenApi.Models;
using PFMP_API.Services.FinancialProfile;

namespace PFMP_API
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.
            
            // Add Entity Framework
            builder.Services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

            // Add AI Service
            builder.Services.AddScoped<IAIService, AIService>();

            // Add Wave 7: Dual AI Intelligence Services
            builder.Services.Configure<PFMP_API.Services.AI.ClaudeServiceOptions>(
                builder.Configuration.GetSection("AI:Claude"));
            builder.Services.Configure<PFMP_API.Services.AI.GeminiServiceOptions>(
                builder.Configuration.GetSection("AI:Gemini"));
            builder.Services.Configure<PFMP_API.Services.AI.ConsensusOptions>(
                builder.Configuration.GetSection("AI:Consensus"));
            builder.Services.Configure<PFMP_API.Services.AI.AISafetyOptions>(
                builder.Configuration.GetSection("AI:Safety"));

            builder.Services.AddHttpClient<PFMP_API.Services.AI.ClaudeService>();
            builder.Services.AddHttpClient<PFMP_API.Services.AI.GeminiService>();
            
            builder.Services.AddScoped<PFMP_API.Services.AI.IAIFinancialAdvisor, PFMP_API.Services.AI.ClaudeService>();
            builder.Services.AddScoped<PFMP_API.Services.AI.IAIFinancialAdvisor, PFMP_API.Services.AI.GeminiService>();
            builder.Services.AddScoped<PFMP_API.Services.AI.ConsensusEngine>();
            builder.Services.AddScoped<PFMP_API.Services.AI.IDualAIAdvisor, PFMP_API.Services.AI.DualAIAdvisor>();

            // Add Market Data Service
            builder.Services.AddHttpClient<IMarketDataService, MarketDataService>();
            builder.Services.AddScoped<IMarketDataService, MarketDataService>();

            // Add Portfolio Valuation Service
            builder.Services.AddScoped<IPortfolioValuationService, PortfolioValuationService>();

            // Add Advice Service (Wave 1 scaffold)
            builder.Services.AddScoped<IAdviceService, AdviceService>();
            builder.Services.AddScoped<IAdviceValidator, AdviceValidator>();

            // Onboarding Progress Service (Wave 3)
            builder.Services.AddScoped<IOnboardingProgressService, OnboardingProgressService>();

            // Financial Profile Service (Wave 5)
            builder.Services.AddScoped<IFinancialProfileService, FinancialProfileService>();

            // Add Authentication Services
            builder.Services.AddScoped<IPasswordHashService, PasswordHashService>();
            builder.Services.AddHttpClient<IAuthenticationService, AuthenticationService>();
            builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();

            // Add Authentication & Authorization
            var authBuilder = builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                var jwtKey = builder.Configuration["JWT:SecretKey"] ?? "PFMP-Dev-Secret-Key-Change-In-Production-2025";
                var issuer = builder.Configuration["JWT:Issuer"] ?? "PFMP-API";
                var audience = builder.Configuration["JWT:Audience"] ?? "PFMP-Frontend";

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = true,
                    ValidAudience = audience,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                    ClockSkew = TimeSpan.Zero
                };
            });

            // Only add Azure AD OIDC if configuration is provided
            var tenantId = builder.Configuration["AzureAD:TenantId"];
            var clientId = builder.Configuration["AzureAD:ClientId"];
            var clientSecret = builder.Configuration["AzureAD:ClientSecret"];

            if (!string.IsNullOrEmpty(tenantId) && !string.IsNullOrEmpty(clientId))
            {
                authBuilder.AddOpenIdConnect("AzureAD", options =>
                {
                    options.Authority = $"https://login.microsoftonline.com/{tenantId}/v2.0";
                    options.ClientId = clientId;
                    options.ClientSecret = clientSecret;
                    options.ResponseType = "code";
                    options.SaveTokens = true;
                    options.Scope.Add("openid");
                    options.Scope.Add("profile");
                    options.Scope.Add("email");
                });
            }

            builder.Services.AddAuthorization();

            // Add CORS
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", policy =>
                {
                    policy.WithOrigins("http://localhost:3000", "http://localhost:3001", "http://localhost:5173")
                          .AllowAnyHeader()
                          .AllowAnyMethod();
                });
            });

            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
                    options.JsonSerializerOptions.WriteIndented = true;
                });
            // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "PFMP API",
                    Version = "v1",
                    Description = "Personal Financial Management Platform API"
                });
            });

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            bool enableSwaggerAlways = builder.Configuration.GetValue<bool>("Swagger:Always", false);
            if (app.Environment.IsDevelopment() || enableSwaggerAlways)
            {
                app.UseSwagger();
                app.UseSwaggerUI(c =>
                {
                    c.SwaggerEndpoint("/swagger/v1/swagger.json", "PFMP API v1");
                    c.DocumentTitle = "PFMP API Docs";
                });
            }

            if (!app.Environment.IsDevelopment())
            {
                app.UseHttpsRedirection();
            }

            // Use CORS
            app.UseCors("AllowFrontend");

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();

            // Lightweight health endpoint (unauthenticated)
            app.MapGet("/health", () => Results.Json(new
            {
                status = "OK",
                service = "PFMP-API",
                utc = DateTime.UtcNow,
                env = app.Environment.EnvironmentName
            }));

            // Readiness endpoint: checks DB connectivity and pending migrations
            app.MapGet("/health/ready", async (ApplicationDbContext db, IWebHostEnvironment env) =>
            {
                var dbOk = false;
                int? appliedMigrations = null;
                int? totalMigrations = null;
                string? error = null;
                try
                {
                    // Quick connectivity test
                    dbOk = await db.Database.CanConnectAsync();
                    // Use synchronous enumeration via IMigrator because async extension methods may not be available in current EF Core version
                    var all = db.Database.GetMigrations();
                    var applied = db.Database.GetAppliedMigrations();
                    totalMigrations = all.Count();
                    appliedMigrations = applied.Count();
                }
                catch (Exception ex)
                {
                    error = ex.GetType().Name + ": " + ex.Message;
                }

                var ready = dbOk && (error == null);

                var payload = new
                {
                    status = ready ? "READY" : "DEGRADED",
                    service = "PFMP-API",
                    utc = DateTime.UtcNow,
                    env = env.EnvironmentName,
                    database = new
                    {
                        reachable = dbOk,
                        appliedMigrations,
                        totalMigrations,
                        allApplied = appliedMigrations.HasValue && totalMigrations.HasValue && appliedMigrations == totalMigrations
                    },
                    error
                };

                return ready ? Results.Json(payload) : Results.Json(payload, statusCode: 503);
            });

            // NOTE: Original automatic seeding removed (archived under archive/seeder/DevelopmentDataSeeder.cs).
            // Prefer explicit runtime creation via /api/admin/users endpoints now.

            app.Run();
        }
    }
}
