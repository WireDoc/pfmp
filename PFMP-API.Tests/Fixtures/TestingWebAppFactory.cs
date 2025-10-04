using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace PFMP_API.Tests.Fixtures;

public class TestingWebAppFactory : WebApplicationFactory<PFMP_API.Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.UseEnvironment("Testing");
}
