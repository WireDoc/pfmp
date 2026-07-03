
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

            // Wave 22 Phase C — DB-backed per-slot model + sampling resolver.
            // Reads AISettings; falls back to AI:OpenRouter defaults; caches ~30s.
            // Registered BEFORE the advisor factories so they can resolve it.
            builder.Services.AddScoped<PFMP_API.Services.AI.IAIModelResolver, PFMP_API.Services.AI.AIModelResolver>();

            // Wave 22 Phase C — OpenRouter model catalog cache (singleton so the cached
            // list survives across requests; 24h TTL, manual-refresh only per user request).
            builder.Services.AddSingleton<PFMP_API.Services.AI.IOpenRouterModelCatalog, PFMP_API.Services.AI.OpenRouterModelCatalog>();

            // Register two OpenRouterService instances with different roles (Primary + Verifier)
            builder.Services.AddScoped<PFMP_API.Services.AI.IAIFinancialAdvisor>(sp =>
                new PFMP_API.Services.AI.OpenRouterService(
                    sp.GetRequiredService<IHttpClientFactory>(),
                    sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<PFMP_API.Services.AI.OpenRouterOptions>>(),
                    sp.GetRequiredService<PFMP_API.Services.AI.IAIModelResolver>(),
                    sp.GetRequiredService<ILogger<PFMP_API.Services.AI.OpenRouterService>>(),
                    "Primary"));
            builder.Services.AddScoped<PFMP_API.Services.AI.IAIFinancialAdvisor>(sp =>
                new PFMP_API.Services.AI.OpenRouterService(
                    sp.GetRequiredService<IHttpClientFactory>(),
                    sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<PFMP_API.Services.AI.OpenRouterOptions>>(),
                    sp.GetRequiredService<PFMP_API.Services.AI.IAIModelResolver>(),
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
                    sp.GetRequiredService<PFMP_API.Services.AI.IAIModelResolver>(),
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

            // Property Valuation & Address Services (Wave 15; multi-provider Wave 25 follow-on)
            // All IPropertyValuationProvider registrations are injected as IEnumerable into
            // PropertyValuationService, which resolves the active one per property
            // (Properties.PreferredValuationProvider → PropertyValuation:DefaultProvider).
            builder.Services.AddScoped<PFMP_API.Services.Properties.IAddressValidationService, PFMP_API.Services.Properties.UspsAddressValidationService>();
            builder.Services.AddScoped<PFMP_API.Services.Properties.IPropertyValuationProvider, PFMP_API.Services.Properties.RentCastValuationProvider>();
            builder.Services.AddScoped<PFMP_API.Services.Properties.IPropertyValuationProvider, PFMP_API.Services.Properties.FhfaHpiValuationProvider>();
            builder.Services.AddHttpClient("Fhfa");
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
                    options.Queues = new[] { "default", "price-refresh", "snapshots", "news" };
                });
            }

            // Background Job Classes (Wave 10)
            builder.Services.AddScoped<PFMP_API.Jobs.PriceRefreshJob>();
            builder.Services.AddScoped<PFMP_API.Jobs.NetWorthSnapshotJob>();
            builder.Services.AddScoped<PFMP_API.Jobs.TspPriceRefreshJob>();

            // News Aggregator (Wave 23)
            builder.Services.AddHttpClient("News");
            builder.Services.AddScoped<PFMP_API.Services.News.IRssNewsClient, PFMP_API.Services.News.RssNewsClient>();
            builder.Services.AddSingleton<PFMP_API.Services.News.INewsCategorizer, PFMP_API.Services.News.NewsCategorizer>();
            builder.Services.AddSingleton<PFMP_API.Services.News.INewsPromptBuilder, PFMP_API.Services.News.NewsPromptBuilder>();
            builder.Services.AddScoped<PFMP_API.Services.News.INewsIngestionService, PFMP_API.Services.News.NewsIngestionService>();
            builder.Services.AddScoped<PFMP_API.Services.News.INewsDigestService, PFMP_API.Services.News.NewsDigestService>();
            builder.Services.AddScoped<PFMP_API.Jobs.NewsIngestionJob>();

            // Chatbot with Memory (Wave 24) — streaming chat backed by daily context snapshot
            builder.Services.AddScoped<PFMP_API.Services.AI.Chat.IUserContextSnapshotService, PFMP_API.Services.AI.Chat.UserContextSnapshotService>();
            builder.Services.AddScoped<PFMP_API.Services.AI.Chat.IChatService, PFMP_API.Services.AI.Chat.ChatService>();

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

            // Wave 25 — strongly-typed Entra config + provisioning service.
            builder.Services.Configure<PFMP_API.Services.Auth.AzureAdOptions>(
                builder.Configuration.GetSection(PFMP_API.Services.Auth.AzureAdOptions.SectionName));
            builder.Services.AddScoped<PFMP_API.Services.Auth.IUserProvisioningService,
                                       PFMP_API.Services.Auth.UserProvisioningService>();

            // Authentication: two JWT bearer schemes behind a forwarding policy scheme.
            //   - "DevJwt"   : symmetric-key tokens minted by /api/auth/dev-login. Used when
            //                  the frontend is in simulated-auth mode and during integration tests.
            //   - "EntraJwt" : tokens from Microsoft Entra ID issued for the api://{ClientId}
            //                  audience. Used when MSAL is wired up (Wave 25 Phase C+).
            //   - Default "Bearer" is a policy scheme that inspects the token's issuer and
            //     forwards to the right scheme. Controllers can use plain [Authorize] —
            //     no need to specify which scheme is in play.
            var entraConfig = builder.Configuration
                .GetSection(PFMP_API.Services.Auth.AzureAdOptions.SectionName)
                .Get<PFMP_API.Services.Auth.AzureAdOptions>() ?? new PFMP_API.Services.Auth.AzureAdOptions();

            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddPolicyScheme(JwtBearerDefaults.AuthenticationScheme, "Bearer (Dev or Entra)", options =>
                {
                    options.ForwardDefaultSelector = ctx =>
                    {
                        var auth = ctx.Request.Headers.Authorization.ToString();
                        if (!auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                            return "DevJwt";
                        var token = auth["Bearer ".Length..].Trim();
                        try
                        {
                            var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                            if (!handler.CanReadToken(token)) return "DevJwt";
                            var jwt = handler.ReadJwtToken(token);
                            return jwt.Issuer.Contains("login.microsoftonline.com", StringComparison.OrdinalIgnoreCase)
                                || jwt.Issuer.Contains("sts.windows.net", StringComparison.OrdinalIgnoreCase)
                                ? PFMP_API.Services.Auth.AzureAdOptions.Scheme
                                : "DevJwt";
                        }
                        catch
                        {
                            return "DevJwt";
                        }
                    };
                })
                .AddJwtBearer("DevJwt", options =>
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
                })
                .AddJwtBearer(PFMP_API.Services.Auth.AzureAdOptions.Scheme, options =>
                {
                    if (!entraConfig.IsConfigured)
                    {
                        // Registered but mis-configured (still in placeholder state). Leave validation
                        // permissive so the policy scheme never crashes at startup; any Entra-shaped
                        // token will simply fail signature validation and the request gets 401.
                        options.TokenValidationParameters = new TokenValidationParameters { ValidateLifetime = false };
                        return;
                    }
                    options.Authority = entraConfig.AuthorityV2;
                    options.Audience = entraConfig.Audience;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuers = new[]
                        {
                            $"https://login.microsoftonline.com/{entraConfig.TenantId}/v2.0",
                            $"https://sts.windows.net/{entraConfig.TenantId}/"
                        },
                        ValidateAudience = true,
                        ValidAudiences = new[] { entraConfig.Audience, entraConfig.ClientId },
                        ValidateLifetime = true,
                        ClockSkew = TimeSpan.FromMinutes(2)
                    };
                });

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
                // These run when the API is running; in dev that's when your laptop is on.
                //
                // Eastern Time zone resolution: prefer the IANA id (cross-platform; the canonical
                // name everywhere except old Windows builds) and fall back to the Windows id only
                // if IANA isn't registered. Both represent the full Eastern zone *including* the
                // DST transitions — the misleading Windows name "Eastern Standard Time" means
                // "the Eastern zone, which observes EST in winter and EDT in summer," NOT "fixed
                // at UTC-5." So with this zone, `"0 4 * * *"` fires at 4 AM EDT in summer
                // (= 08:00 UTC) and 4 AM EST in winter (= 09:00 UTC).
                TimeZoneInfo easternTimeZone;
                try
                {
                    easternTimeZone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
                }
                catch (TimeZoneNotFoundException)
                {
                    easternTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");
                }

                // Central time for jobs anchored to the user's local day rather than market hours.
                TimeZoneInfo centralTimeZone;
                try
                {
                    centralTimeZone = TimeZoneInfo.FindSystemTimeZoneById("America/Chicago");
                }
                catch (TimeZoneNotFoundException)
                {
                    centralTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Central Standard Time");
                }

                // Misfire policy: if the API was offline when a cron tick was due, skip the missed
                // run entirely rather than firing late. Critical for NetWorthSnapshotJob — a delayed
                // run hours after the cron time would capture intraday-volatile asset prices into
                // the daily snapshot. Better to wait for tomorrow's clean cron tick.
                var ignoreMissed = new RecurringJobOptions
                {
                    TimeZone = easternTimeZone,
                    MisfireHandling = Hangfire.MisfireHandlingMode.Ignorable,
                };

                var ignoreMissedCentral = new RecurringJobOptions
                {
                    TimeZone = centralTimeZone,
                    MisfireHandling = Hangfire.MisfireHandlingMode.Ignorable,
                };
                
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

                // Daily net worth snapshot at 5 AM ET — runs AFTER TspPriceRefreshJob (4 AM ET)
                // so today's TSP positions are repriced from today's DailyTSP cache before the
                // snapshot computes RetirementTotal. Previous 11:30 PM ET schedule ran ~12 hours
                // before DailyTSP posted the day's EOD prices (~3 AM ET arrival), so every
                // snapshot used stale (yesterday's) TSP prices and disagreed with the dashboard.
                RecurringJob.AddOrUpdate<PFMP_API.Jobs.NetWorthSnapshotJob>(
                    "daily-networth-snapshot",
                    job => job.CaptureAllUserSnapshotsAsync(CancellationToken.None),
                    "0 5 * * *", // 5 AM ET daily
                    ignoreMissed);

                // Daily TSP price refresh at 4 AM ET — DailyTSP_API reliably has the previous
                // trading day's EOD prices by ~3 AM ET. We run 1 hour after that to absorb any
                // variance in their posting time. Must complete before NetWorthSnapshotJob runs
                // at 5 AM ET so positions are repriced before the snapshot reads them.
                RecurringJob.AddOrUpdate<PFMP_API.Jobs.TspPriceRefreshJob>(
                    "daily-tsp-refresh",
                    job => job.RefreshTspPricesAsync(CancellationToken.None),
                    "0 4 * * *", // 4 AM ET daily
                    ignoreMissed);

                // Wave 23 — News ingestion 4×/day in user's local (Central) time:
                // 7:30 AM (morning brief), 11:30 AM (pre-lunch update), 3:30 PM
                // (afternoon), 7:30 PM (evening wrap). News has no market-hour anchor
                // like TSP/net-worth jobs do, so it runs on the user's calendar instead
                // of ET. MisfireHandling.Ignorable so a sleeping laptop doesn't trigger
                // a late catch-up run.
                RecurringJob.AddOrUpdate<PFMP_API.Jobs.NewsIngestionJob>(
                    "daily-news-ingestion",
                    job => job.RunAsync(CancellationToken.None),
                    "30 7,11,15,19 * * *", // 7:30 AM, 11:30 AM, 3:30 PM, 7:30 PM CT
                    ignoreMissedCentral);

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
