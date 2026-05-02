using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Options;
using PFMP_API.Services.Crypto;

namespace PFMP_API.Tests.Fixtures;

public class TestingWebAppFactory : WebApplicationFactory<PFMP_API.Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // Belt-and-suspenders: blank every external-API key/credential the app reads, and explicitly
        // disable feature flags that gate outbound calls. This protects against any provider that
        // checks "if key configured, call out" before reaching the HttpClient layer.
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
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
