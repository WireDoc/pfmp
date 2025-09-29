using Microsoft.Extensions.Logging.Abstractions;
using PFMP_API.Models;
using PFMP_API.Services;
using PFMP_API.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace PFMP_API.Tests.Services;

public class AdviceServiceSmokeTests
{
    private AdviceService CreateService(out ApplicationDbContext db, int userId = 1)
    {
        db = TestDbContextFactory.Create();
        db.Users.Add(new User { UserId = userId, FirstName = "Test", LastName = "User", Email = "test@example.com", EmergencyFundTarget = 1000 });
        db.SaveChanges();
        var ai = new FakeAiService("AI Text");
        var validator = new AdviceValidator();
        return new AdviceService(db, ai, validator, new NullLogger<AdviceService>());
    }

    [Fact]
    public async Task GenerateBasicAdvice_Creates_Proposed_Record()
    {
        var svc = CreateService(out var db);
        var advice = await svc.GenerateBasicAdviceAsync(1);
        Assert.Equal("Proposed", advice.Status);
        Assert.Contains("AI Text", advice.ConsensusText);
        Assert.False(string.IsNullOrWhiteSpace(advice.ValidatorJson));
    }

    [Fact]
    public async Task AcceptAdvice_From_Proposed_Sets_Accepted()
    {
        var svc = CreateService(out var db);
        var advice = await svc.GenerateBasicAdviceAsync(1);
        var accepted = await svc.AcceptAdviceAsync(advice.AdviceId);
        Assert.NotNull(accepted);
        Assert.Equal("Accepted", accepted!.Status);
    }

    [Fact]
    public async Task RejectAdvice_From_Proposed_Sets_Rejected()
    {
        var svc = CreateService(out var db);
        var advice = await svc.GenerateBasicAdviceAsync(1);
        var rejected = await svc.RejectAdviceAsync(advice.AdviceId);
        Assert.NotNull(rejected);
        Assert.Equal("Rejected", rejected!.Status);
    }

    [Fact]
    public async Task AcceptAdvice_Idempotent_When_Already_Accepted()
    {
        var svc = CreateService(out var db);
        var advice = await svc.GenerateBasicAdviceAsync(1);
        var first = await svc.AcceptAdviceAsync(advice.AdviceId);
        var second = await svc.AcceptAdviceAsync(advice.AdviceId);
        Assert.Equal("Accepted", first!.Status);
        Assert.Equal("Accepted", second!.Status);
    }

    [Fact]
    public async Task RejectAdvice_Idempotent_When_Already_Rejected()
    {
        var svc = CreateService(out var db);
        var advice = await svc.GenerateBasicAdviceAsync(1);
        var first = await svc.RejectAdviceAsync(advice.AdviceId);
        var second = await svc.RejectAdviceAsync(advice.AdviceId);
        Assert.Equal("Rejected", first!.Status);
        Assert.Equal("Rejected", second!.Status);
    }

    [Fact]
    public async Task Accept_After_Rejected_Throws()
    {
        var svc = CreateService(out var db);
        var advice = await svc.GenerateBasicAdviceAsync(1);
        await svc.RejectAdviceAsync(advice.AdviceId);
        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.AcceptAdviceAsync(advice.AdviceId)!);
    }

    [Fact]
    public async Task Reject_After_Accepted_Throws()
    {
        var svc = CreateService(out var db);
        var advice = await svc.GenerateBasicAdviceAsync(1);
        await svc.AcceptAdviceAsync(advice.AdviceId);
        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.RejectAdviceAsync(advice.AdviceId)!);
    }
}
