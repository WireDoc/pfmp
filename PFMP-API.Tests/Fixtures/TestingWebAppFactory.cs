using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Options;
using PFMP_API.Services.Crypto;

namespace PFMP_API.Tests.Fixtures;

public class TestingWebAppFactory : WebApplicationFactory<PFMP_API.Program>
{
    // Unique per-factory DB name keeps test classes isolated from each other.
    private readonly string _inMemoryDbName = $"pfmp_test_{Guid.NewGuid():N}";

    // Dedicated internal EF service provider that contains ONLY the InMemory provider. This
    // sidesteps the "Services for database providers ... have been registered" error that EF
    // throws when both Npgsql and InMemory live in the same root service provider (Program.cs
    // still registers Npgsql via AddDbContext<ApplicationDbContext>(UseNpgsql), and we re-add
    // InMemory below — without an internal provider, EF can't pick which to use).
    private static readonly IServiceProvider _inMemoryEfServiceProvider = new ServiceCollection()
        .AddEntityFrameworkInMemoryDatabase()
        .BuildServiceProvider();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // Belt-and-suspenders: blank every external-API key/credential the app reads, and explicitly
        // disable feature flags that gate outbound calls. This protects against any provider that
        // checks "if key configured, call out" before reaching the HttpClient layer.
        // CRITICAL: Also blank ConnectionStrings:DefaultConnection so that any code path which
        // bypasses the DI-registered DbContext and constructs its own Npgsql connection cannot
        // reach the real pfmp_dev database. Test runs must NEVER write to a real database.
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=invalid-test-host-do-not-resolve;Database=blocked;Username=blocked;Password=blocked",
                ["PropertyValuation:RentCastApiKey"] = "",
                ["PropertyValuation:RentCastEnabled"] = "false",
                ["PropertyValuation:UspsUserId"] = "",
                ["PropertyValuation:EstatedApiToken"] = "",
                ["PropertyValuation:MaxMonthlyValuationCalls"] = "0",
                ["AI:OpenRouter:ApiKey"] = "",
                ["FMP:ApiKey"] = "",
                ["MarketData:FinancialModelingPrep:ApiKey"] = "",
                ["Plaid:ClientId"] = "",
                ["Plaid:Secret"] = "",
            });
        });

        builder.ConfigureServices(services =>
        {
            // CRITICAL ISOLATION: Replace the Postgres-backed ApplicationDbContext with an isolated
            // EF Core InMemory database. This guarantees that no test ever creates rows in the real
            // pfmp_dev database. Without this, every WebApplicationFactory test booted Program.cs's
            // Npgsql registration and silently wrote test fixtures (users, accounts, properties,
            // exchange connections, etc.) into pfmp_dev — which then drove recurring background
            // jobs (RentCast valuations, CryptoSync) to make real outbound API calls and burn paid
            // quota. Do NOT remove this without a replacement isolation strategy.
            var dbContextDescriptors = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>)
                         || d.ServiceType == typeof(ApplicationDbContext)
                         || d.ServiceType == typeof(DbContextOptions))
                .ToList();
            foreach (var descriptor in dbContextDescriptors)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<ApplicationDbContext>(options =>
            {
                options.UseInMemoryDatabase(_inMemoryDbName);
                options.UseInternalServiceProvider(_inMemoryEfServiceProvider);
                // InMemory provider doesn't enforce transactions; suppress the warning so existing
                // service code that calls SaveChangesAsync within a using-transaction block works.
                options.ConfigureWarnings(w => w.Ignore(
                    Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning));
            });

            // Force the BlockingHttpMessageHandler as the primary handler for every HttpClient
            // produced by IHttpClientFactory (named or typed). Any service that tries to make an
            // outbound request during a test will throw InvalidOperationException with a clear
            // diagnostic, so accidental external calls cannot drain real-world API quotas.
            services.RemoveAll<IHttpMessageHandlerBuilderFilter>();
            services.AddSingleton<IHttpMessageHandlerBuilderFilter, BlockExternalHttpFilter>();

            // Replace ICoinGeckoPriceService (which would otherwise call api.coingecko.com) with a
            // canned in-memory fake. Individual tests can override again via WithWebHostBuilder.
            services.RemoveAll<ICoinGeckoPriceService>();
            services.AddSingleton<ICoinGeckoPriceService, FakeCoinGeckoPriceService>();
        });
    }

    private sealed class BlockExternalHttpFilter : IHttpMessageHandlerBuilderFilter
    {
        public Action<HttpMessageHandlerBuilder> Configure(Action<HttpMessageHandlerBuilder> next) =>
            builder =>
            {
                next(builder);
                builder.PrimaryHandler = new BlockingHttpMessageHandler();
            };
    }
}
