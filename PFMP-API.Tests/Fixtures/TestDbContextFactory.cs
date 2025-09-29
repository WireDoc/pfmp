using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API.Tests.Fixtures;

public static class TestDbContextFactory
{
    public static ApplicationDbContext Create()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"pfmp_test_{Guid.NewGuid():N}")
            .EnableSensitiveDataLogging()
            .Options;
        var ctx = new ApplicationDbContext(options);
        return ctx;
    }
}
