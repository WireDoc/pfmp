
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PFMP_API.Services;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.OpenApi.Models;
using PFMP_API.Services.FinancialProfile;
using Hangfire;
using Hangfire.PostgreSql;

namespace PFMP_API
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            // Npgsql 6+ rejects DateTime with Kind=Unspecified for timestamptz columns.
            // Enable legacy behavior so Unspecified is treated as UTC.
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

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

            // All AI services route through OpenRouter
            builder.Services.AddScoped<IAIService, AIService>();

            // OpenRouter AI gateway — single provider, two model roles
            builder.Services.Configure<PFMP_API.Services.AI.OpenRouterOptions>(
                builder.Configuration.GetSection("AI:OpenRouter"));
            builder.Services.Configure<PFMP_API.Services.AI.ConsensusOptions>(
                builder.Configuration.GetSection("AI:Consensus"));
            builder.Services.Configure<PFMP_API.Services.AI.AISafetyOptions>(
                builder.Configuration.GetSection("AI:Safety"));

            builder.Services.AddHttpClient("OpenRouter");

            // Register two OpenRouterService instances with different roles (Primary + Verifier)
            builder.Services.AddScoped<PFMP_API.Services.AI.IAIFinancialAdvisor>(sp =>
                new PFMP_API.Services.AI.OpenRouterService(
                    sp.GetRequiredService<IHttpClientFactory>(),
                    sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<PFMP_API.Services.AI.OpenRouterOptions>>(),
                    sp.GetRequiredService<ILogger<PFMP_API.Services.AI.OpenRouterService>>(),
                    "Primary"));
            builder.Services.AddScoped<PFMP_API.Services.AI.IAIFinancialAdvisor>(sp =>
                new PFMP_API.Services.AI.OpenRouterService(
                    sp.GetRequiredService<IHttpClientFactory>(),
                    sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<PFMP_API.Services.AI.OpenRouterOptions>>(),
                    sp.GetRequiredService<ILogger<PFMP_API.Services.AI.OpenRouterService>>(),
                    "Verifier"));
            // Wave 22 Phase E — News slot registered for the future Market Context Awareness
            // wave. No consumer in PFMP today. PrimaryBackupAIAdvisor selects services by name
            // from the IEnumerable<IAIFinancialAdvisor>, so the News instance won't be picked
            // up accidentally by the analyze flow.
            builder.Services.AddScoped<PFMP_API.Services.AI.IAIFinancialAdvisor>(sp =>
                new PFMP_API.Services.AI.OpenRouterService(
                    sp.GetRequiredService<IHttpClientFactory>(),
                    sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<PFMP_API.Services.AI.OpenRouterOptions>>(),
                    sp.GetRequiredService<ILogger<PFMP_API.Services.AI.OpenRouterService>>(),
                    "News"));

            builder.Services.AddScoped<PFMP_API.Services.AI.ConsensusEngine>();

            // Register both advisors as concrete types so the Wave 22 spike controller
            // can invoke each directly for side-by-side comparison without restarting.
            builder.Services.AddScoped<PFMP_API.Services.AI.PrimaryBackupAIAdvisor>();
            builder.Services.AddScoped<PFMP_API.Services.AI.FusionAIAdvisor>();

            // Wave 22 Phase A — Fusion spike feature flag. When AI:OpenRouter:Fusion:Enabled=true,
            // production IDualAIAdvisor routes through openrouter/fusion. Default false so the
            // dashboard analyze path keeps the Primary→Verifier flow until the spike decides.
            var fusionEnabled = builder.Configuration
                .GetValue<bool>("AI:OpenRouter:Fusion:Enabled");
            if (fusionEnabled)
            {
                builder.Services.AddScoped<PFMP_API.Services.AI.IDualAIAdvisor>(sp =>
                    sp.GetRequiredService<PFMP_API.Services.AI.FusionAIAdvisor>());
            }
            else
            {
                builder.Services.AddScoped<PFMP_API.Services.AI.IDualAIAdvisor>(sp =>
                    sp.GetRequiredService<PFMP_API.Services.AI.PrimaryBackupAIAdvisor>());
            }

            builder.Services.AddScoped<PFMP_API.Services.AI.IAIMemoryService, PFMP_API.Services.AI.AIMemoryService>();
            builder.Services.AddScoped<PFMP_API.Services.AI.IAIIntelligenceService, PFMP_API.Services.AI.AIIntelligenceService>();

            // Add Market Data Service (FMP - Financial Modeling Prep)
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
            builder.Services.AddScoped<ISymbolMetricsService, SymbolMetricsService>();

            // Loan Analytics Services (Wave 9.3 Option B)
            builder.Services.AddScoped<AmortizationService>();
            builder.Services.AddScoped<CreditUtilizationService>();
            builder.Services.AddScoped<DebtPayoffService>();

            // Credit Alert Service (Wave 12.5)
            builder.Services.AddScoped<ICreditAlertService, CreditAlertService>();

            // Property Task Service (Wave 12.5)
            builder.Services.AddScoped<IPropertyTaskService, PropertyTaskService>();

            // Federal Benefits / PDF Parsers (Wave 18)
            builder.Services.AddScoped<LesParserService>();
            builder.Services.AddSingleton<FehbPlanLookupService>();

            // Property Valuation & Address Services (Wave 15)
            builder.Services.AddScoped<PFMP_API.Services.Properties.IAddressValidationService, PFMP_API.Services.Properties.UspsAddressValidationService>();
            builder.Services.AddScoped<PFMP_API.Services.Properties.IPropertyValuationProvider, PFMP_API.Services.Properties.RentCastValuationProvider>();
            builder.Services.AddScoped<PFMP_API.Services.Properties.IPropertyValuationService, PFMP_API.Services.Properties.PropertyValuationService>();

            // Background Jobs - Hangfire (Wave 10)
            // Skip Hangfire in Testing environment to allow WebApplicationFactory tests to work
            var isTestingEnvironment = builder.Environment.EnvironmentName == "Testing";
            if (!isTestingEnvironment)
            {
                var hangfireConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
                builder.Services.AddHangfire(config => config
                    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                    .UseSimpleAssemblyNameTypeSerializer()
                    .UseRecommendedSerializerSettings()
                    .UsePostgreSqlStorage(options => 
                        options.UseNpgsqlConnection(hangfireConnectionString)));
                builder.Services.AddHangfireServer(options =>
                {
                    options.WorkerCount = Environment.ProcessorCount * 2;
                    options.Queues = new[] { "default", "price-refresh", "snapshots" };
                });
            }

            // Background Job Classes (Wave 10)
            builder.Services.AddScoped<PFMP_API.Jobs.PriceRefreshJob>();
            builder.Services.AddScoped<PFMP_API.Jobs.NetWorthSnapshotJob>();
            builder.Services.AddScoped<PFMP_API.Jobs.TspPriceRefreshJob>();

            // Plaid Integration Services (Wave 11)
            builder.Services.AddDataProtection();
            builder.Services.AddSingleton<PFMP_API.Services.Plaid.ICredentialEncryptionService, PFMP_API.Services.Plaid.DataProtectionEncryptionService>();
            builder.Services.AddScoped<PFMP_API.Services.Plaid.IPlaidService, PFMP_API.Services.Plaid.PlaidService>();
            builder.Services.AddScoped<PFMP_API.Jobs.PlaidSyncJob>();

            // Plaid Investments Services (Wave 12)
            builder.Services.AddScoped<PFMP_API.Services.Plaid.IPlaidInvestmentsService, PFMP_API.Services.Plaid.PlaidInvestmentsService>();

            // Plaid Liabilities Services (Wave 12.5)
            builder.Services.AddScoped<PFMP_API.Services.Plaid.IPlaidLiabilitiesService, PFMP_API.Services.Plaid.PlaidLiabilitiesService>();

            // Plaid Unified Connection Service (Wave 12.5)
            builder.Services.AddScoped<PFMP_API.Services.Plaid.IPlaidConnectionService, PFMP_API.Services.Plaid.PlaidConnectionService>();

            // Wave 13: Crypto Exchange Integration
            builder.Services.AddHttpClient("Kraken", client =>
            {
                client.Timeout = TimeSpan.FromSeconds(30);
                client.DefaultRequestHeaders.UserAgent.ParseAdd("PFMP/1.0 (+https://github.com/WireDoc/pfmp)");
            });
            builder.Services.AddHttpClient("BinanceUS", client =>
            {
                client.Timeout = TimeSpan.FromSeconds(30);
                client.DefaultRequestHeaders.UserAgent.ParseAdd("PFMP/1.0 (+https://github.com/WireDoc/pfmp)");
            });
            builder.Services.AddHttpClient("CoinGecko", client =>
            {
                client.Timeout = TimeSpan.FromSeconds(30);
                client.DefaultRequestHeaders.UserAgent.ParseAdd("PFMP/1.0 (+https://github.com/WireDoc/pfmp)");
            });
            builder.Services.AddSingleton<PFMP_API.Services.Crypto.IExchangeCredentialEncryptionService, PFMP_API.Services.Crypto.ExchangeCredentialEncryptionService>();
            builder.Services.AddSingleton<PFMP_API.Services.Crypto.ICoinGeckoPriceService, PFMP_API.Services.Crypto.CoinGeckoPriceService>();
            builder.Services.AddScoped<PFMP_API.Services.Crypto.IExchangeAdapter, PFMP_API.Services.Crypto.KrakenExchangeAdapter>();
            builder.Services.AddScoped<PFMP_API.Services.Crypto.IExchangeAdapter, PFMP_API.Services.Crypto.BinanceUsExchangeAdapter>();
            builder.Services.AddScoped<PFMP_API.Services.Crypto.ICryptoSyncService, PFMP_API.Services.Crypto.CryptoSyncService>();
            builder.Services.AddScoped<PFMP_API.Services.Crypto.ICryptoTaxLotService, PFMP_API.Services.Crypto.CryptoTaxLotService>();
            builder.Services.AddScoped<PFMP_API.Services.Crypto.ICryptoAlertService, PFMP_API.Services.Crypto.CryptoAlertService>();
            builder.Services.AddScoped<PFMP_API.Services.Crypto.IExchangeConnectionService, PFMP_API.Services.Crypto.ExchangeConnectionService>();
            builder.Services.AddScoped<PFMP_API.Jobs.CryptoSyncJob>();

            // Wave 14 — Spending Analysis
            builder.Services.Configure<PFMP_API.Services.Spending.SpendingOptions>(
                builder.Configuration.GetSection(PFMP_API.Services.Spending.SpendingOptions.SectionName));
            builder.Services.AddScoped<PFMP_API.Services.Spending.ICategoryRuleService, PFMP_API.Services.Spending.CategoryRuleService>();
            builder.Services.AddScoped<PFMP_API.Services.Spending.IBudgetService, PFMP_API.Services.Spending.BudgetService>();
            builder.Services.AddScoped<PFMP_API.Services.Spending.ISpendingAnalyticsService, PFMP_API.Services.Spending.SpendingAnalyticsService>();
            builder.Services.AddScoped<PFMP_API.Services.Spending.ICashFlowSummaryService, PFMP_API.Services.Spending.CashFlowSummaryService>();
            // Wave 14 P3 — recurring detection + anomaly alerts
            builder.Services.AddScoped<PFMP_API.Services.Spending.IHeuristicRecurringDetector, PFMP_API.Services.Spending.HeuristicRecurringDetector>();
            builder.Services.AddScoped<PFMP_API.Services.Spending.IAnomalyDetectionService, PFMP_API.Services.Spending.AnomalyDetectionService>();
            builder.Services.AddScoped<PFMP_API.Services.Spending.ISpendingAlertService, PFMP_API.Services.Spending.SpendingAlertService>();
            // Wave 14 P4 — 90-day cash-flow forecast
            builder.Services.AddScoped<PFMP_API.Services.Spending.ICashFlowForecastService, PFMP_API.Services.Spending.CashFlowForecastService>();
            builder.Services.AddScoped<PFMP_API.Jobs.SpendingRollupJob>();

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

            // SAFETY GUARD: Under the "Testing" environment, refuse to boot unless the connection
            // string has been overridden to the unresolvable sentinel host that TestingWebAppFactory
            // injects. This is defense-in-depth against a future change accidentally exposing the
            // real pfmp_dev database to the test harness — which previously caused ~10K leaked test
            // users and $36 in unintended RentCast API charges. If you ever see this throw, do NOT
            // "fix" it by relaxing the check — instead audit how the test factory was bypassed.
            // Runs after Build() so WebApplicationFactory's ConfigureAppConfiguration overrides
            // have been merged into app.Configuration.
            if (app.Environment.EnvironmentName == "Testing")
            {
                var testCs = app.Configuration.GetConnectionString("DefaultConnection") ?? string.Empty;
                if (!testCs.Contains("invalid-test-host-do-not-resolve", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(
                        "Refusing to start under Testing environment without the unresolvable test " +
                        "sentinel connection string. TestingWebAppFactory must inject " +
                        "'Host=invalid-test-host-do-not-resolve;...' into ConnectionStrings:DefaultConnection. " +
                        $"Got: '{testCs}'. See PFMP-API.Tests/Fixtures/TestingWebAppFactory.cs.");
                }
            }

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

            // Hangfire Dashboard (Wave 10) - only in development for now
            if (app.Environment.IsDevelopment())
            {
                app.UseHangfireDashboard("/hangfire", new DashboardOptions
                {
                    DashboardTitle = "PFMP Background Jobs",
                    DisplayStorageConnectionString = false
                });
            }

            // Register recurring background jobs (Wave 10)
            // Skip in Testing environment - Hangfire is not configured
            if (!app.Environment.IsEnvironment("Testing"))
            {
                // These run when the API is running; in dev that's when your laptop is on
                var easternTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");
                
                // Daily price refresh at 11 PM ET (after market close)
                RecurringJob.AddOrUpdate<PFMP_API.Jobs.PriceRefreshJob>(
                    "daily-price-refresh",
                    job => job.RefreshAllHoldingPricesAsync(CancellationToken.None),
                    "0 23 * * *", // 11 PM daily
                    new RecurringJobOptions { TimeZone = easternTimeZone });

                // Daily symbol metrics refresh at 11:15 PM ET (after PriceRefreshJob populates PriceHistory)
                RecurringJob.AddOrUpdate<PFMP_API.Jobs.SymbolMetricsRefreshJob>(
                    "daily-symbol-metrics-refresh",
                    job => job.RefreshAllAsync(CancellationToken.None),
                    "15 23 * * *", // 11:15 PM daily
                    new RecurringJobOptions { TimeZone = easternTimeZone });

                // Daily net worth snapshot at 11:30 PM ET (after price refresh)
                RecurringJob.AddOrUpdate<PFMP_API.Jobs.NetWorthSnapshotJob>(
                    "daily-networth-snapshot",
                    job => job.CaptureAllUserSnapshotsAsync(CancellationToken.None),
                    "30 23 * * *", // 11:30 PM daily
                    new RecurringJobOptions { TimeZone = easternTimeZone });

                // Daily TSP price refresh at 10 PM ET (before general price refresh)
                RecurringJob.AddOrUpdate<PFMP_API.Jobs.TspPriceRefreshJob>(
                    "daily-tsp-refresh",
                    job => job.RefreshTspPricesAsync(CancellationToken.None),
                    "0 22 * * *", // 10 PM daily
                    new RecurringJobOptions { TimeZone = easternTimeZone });

                // Daily Plaid bank account balance sync at 10 PM ET (Wave 11)
                RecurringJob.AddOrUpdate<PFMP_API.Jobs.PlaidSyncJob>(
                    "daily-plaid-sync",
                    job => job.SyncAllConnections(),
                    "0 22 * * *", // 10 PM daily
                    new RecurringJobOptions { TimeZone = easternTimeZone });

                // Daily benchmark index refresh at 10:30 PM ET (SPY, QQQ, IWM, VTI, AGG, VEU)
                RecurringJob.AddOrUpdate<PFMP_API.Jobs.BenchmarkRefreshJob>(
                    "daily-benchmark-refresh",
                    job => job.RefreshBenchmarkDataAsync(CancellationToken.None),
                    "30 22 * * *", // 10:30 PM daily
                    new RecurringJobOptions { TimeZone = easternTimeZone });

                // Monthly property valuation refresh — 1st of each month at 3 AM ET (Wave 15)
                RecurringJob.AddOrUpdate<PFMP_API.Jobs.PropertyValuationRefreshJob>(
                    "monthly-property-valuation",
                    job => job.RefreshAllPropertyValuationsAsync(CancellationToken.None),
                    "0 3 1 * *", // 3 AM ET on the 1st of every month
                    new RecurringJobOptions { TimeZone = easternTimeZone });

                // Daily crypto exchange sync at 11:45 PM ET (Wave 13)
                RecurringJob.AddOrUpdate<PFMP_API.Jobs.CryptoSyncJob>(
                    "daily-crypto-sync",
                    job => job.SyncAllConnectionsAsync(CancellationToken.None),
                    "45 23 * * *", // 11:45 PM daily
                    new RecurringJobOptions { TimeZone = easternTimeZone });

                // Daily spending rollup at 10:15 PM ET — chained after PlaidSyncJob (Wave 14 P1)
                RecurringJob.AddOrUpdate<PFMP_API.Jobs.SpendingRollupJob>(
                    "daily-spending-rollup",
                    job => job.RecomputeForAllUsersAsync(CancellationToken.None),
                    "15 22 * * *",
                    new RecurringJobOptions { TimeZone = easternTimeZone });
            }

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
