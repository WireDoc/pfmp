
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

            // Explicitly load local configuration file for development secrets
            if (builder.Environment.IsDevelopment())
            {
                var localConfigPath = Path.Combine(builder.Environment.ContentRootPath, "appsettings.Development.local.json");
                if (File.Exists(localConfigPath))
                {
                    builder.Configuration.AddJsonFile("appsettings.Development.local.json", optional: true, reloadOnChange: true);
                }
            }

            // Add services to the container.
            
            // Add Entity Framework
            builder.Services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

            // Add AI Service
            builder.Services.AddScoped<IAIService, AIService>();

            // Add Wave 7: Primary-Backup AI Intelligence Services (OpenAI GPT-5 primary, Gemini backup)
            builder.Services.Configure<PFMP_API.Services.AI.OpenAIServiceOptions>(
                builder.Configuration.GetSection("AI:OpenAI"));
            builder.Services.Configure<PFMP_API.Services.AI.ClaudeServiceOptions>(
                builder.Configuration.GetSection("AI:Claude"));
            builder.Services.Configure<PFMP_API.Services.AI.GeminiServiceOptions>(
                builder.Configuration.GetSection("AI:Gemini"));
            builder.Services.Configure<PFMP_API.Services.AI.ConsensusOptions>(
                builder.Configuration.GetSection("AI:Consensus"));
            builder.Services.Configure<PFMP_API.Services.AI.AISafetyOptions>(
                builder.Configuration.GetSection("AI:Safety"));

            builder.Services.AddHttpClient<PFMP_API.Services.AI.OpenAIService>();
            builder.Services.AddHttpClient<PFMP_API.Services.AI.ClaudeService>();
            builder.Services.AddHttpClient<PFMP_API.Services.AI.GeminiService>();
            
            builder.Services.AddScoped<PFMP_API.Services.AI.IAIFinancialAdvisor, PFMP_API.Services.AI.OpenAIService>();
            builder.Services.AddScoped<PFMP_API.Services.AI.IAIFinancialAdvisor, PFMP_API.Services.AI.ClaudeService>();
            builder.Services.AddScoped<PFMP_API.Services.AI.IAIFinancialAdvisor, PFMP_API.Services.AI.GeminiService>();
            builder.Services.AddScoped<PFMP_API.Services.AI.ConsensusEngine>();
            builder.Services.AddScoped<PFMP_API.Services.AI.IDualAIAdvisor, PFMP_API.Services.AI.PrimaryBackupAIAdvisor>();
            builder.Services.AddScoped<PFMP_API.Services.AI.IAIMemoryService, PFMP_API.Services.AI.AIMemoryService>();
            builder.Services.AddScoped<PFMP_API.Services.AI.IAIIntelligenceService, PFMP_API.Services.AI.AIIntelligenceService>();

            // Add Market Data Services
            builder.Services.AddHttpClient<IMarketDataService, MarketDataService>();
            builder.Services.AddScoped<IMarketDataService, MarketDataService>();
            
            // Add FMP Market Data Service (Wave 9.2)
            builder.Services.Configure<PFMP_API.Services.MarketData.FmpOptions>(
                builder.Configuration.GetSection("FMP"));
            builder.Services.AddHttpClient<PFMP_API.Services.MarketData.FmpMarketDataService>();
            builder.Services.AddScoped<PFMP_API.Services.MarketData.IMarketDataService, PFMP_API.Services.MarketData.FmpMarketDataService>();
            builder.Services.AddMemoryCache(); // Required for FMP service caching

            // Add TSP Service with DailyTSP API
            builder.Services.AddHttpClient("TSPClient", client =>
            {
                client.BaseAddress = new Uri("https://api.dailytsp.com/");
                client.DefaultRequestHeaders.Add("Accept", "application/json");
                client.Timeout = TimeSpan.FromSeconds(18);
            });
            builder.Services.AddScoped<TSPService>();

            // Add Portfolio Valuation Service
            builder.Services.AddScoped<IPortfolioValuationService, PortfolioValuationService>();

            // Add Advice Service (Wave 1 scaffold)
            builder.Services.AddScoped<IAdviceService, AdviceService>();
            builder.Services.AddScoped<IAdviceValidator, AdviceValidator>();

            // Onboarding Progress Service (Wave 3)
            builder.Services.AddScoped<IOnboardingProgressService, OnboardingProgressService>();

            // Financial Profile Service (Wave 5)
            builder.Services.AddScoped<IFinancialProfileService, FinancialProfileService>();

            // CSV Import Service (Wave 8.2)
            builder.Services.AddScoped<CsvImportService>();

            // Analytics Services (Wave 9.3 Option A)
            builder.Services.AddScoped<PerformanceCalculationService>();

            // Holdings Sync Service (Wave 9.3 Holdings/Transactions synchronization)
            builder.Services.AddScoped<HoldingsSyncService>();
            builder.Services.AddScoped<TaxInsightsService>();
            builder.Services.AddScoped<RiskAnalysisService>();
            builder.Services.AddScoped<BenchmarkDataService>();
            builder.Services.AddScoped<PriceHistoryService>();

            // Loan Analytics Services (Wave 9.3 Option B)
            builder.Services.AddScoped<AmortizationService>();
            builder.Services.AddScoped<CreditUtilizationService>();
            builder.Services.AddScoped<DebtPayoffService>();

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
                    options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
                })
                .ConfigureApiBehaviorOptions(options =>
                {
                    // Ensure query string dates are parsed correctly
                    options.SuppressInferBindingSourcesForParameters = false;
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
