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
        var aiIntelligence = new FakeAIIntelligenceService();
        var validator = new AdviceValidator();
        return new AdviceService(db, ai, aiIntelligence, validator, new NullLogger<AdviceService>());
    }

    [Fact]
    public async Task GenerateBasicAdvice_Creates_Proposed_Record()
    {
        var svc = CreateService(out var db);
        var advice = await svc.GenerateBasicAdviceAsync(1);
        Assert.Equal("Proposed", advice.Status);
        Assert.Contains("cash recommendation", advice.ConsensusText);
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
    public async Task DismissAdvice_From_Proposed_Sets_Dismissed()
    {
        var svc = CreateService(out var db);
        var advice = await svc.GenerateBasicAdviceAsync(1);
        var dismissed = await svc.DismissAdviceAsync(advice.AdviceId);
        Assert.NotNull(dismissed);
        Assert.Equal("Dismissed", dismissed!.Status);
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
    public async Task DismissAdvice_Idempotent_When_Already_Dismissed()
    {
        var svc = CreateService(out var db);
        var advice = await svc.GenerateBasicAdviceAsync(1);
        var first = await svc.DismissAdviceAsync(advice.AdviceId);
        var second = await svc.DismissAdviceAsync(advice.AdviceId);
        Assert.Equal("Dismissed", first!.Status);
        Assert.Equal("Dismissed", second!.Status);
    }

    [Fact]
    public async Task Accept_After_Dismissed_Overwrites_Dismissed()
    {
        var svc = CreateService(out var db);
        var advice = await svc.GenerateBasicAdviceAsync(1);
        await svc.DismissAdviceAsync(advice.AdviceId);
        var accepted = await svc.AcceptAdviceAsync(advice.AdviceId);
        Assert.Equal("Accepted", accepted!.Status);
        Assert.Null(accepted.DismissedAt);
    }

    [Fact]
    public async Task Dismiss_After_Accepted_Throws()
    {
        var svc = CreateService(out var db);
        var advice = await svc.GenerateBasicAdviceAsync(1);
        await svc.AcceptAdviceAsync(advice.AdviceId);
        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.DismissAdviceAsync(advice.AdviceId)!);
    }

    [Fact]
    public async Task Accept_Creates_Task_With_Provenance()
    {
        var svc = CreateService(out var db);
        var advice = await svc.GenerateBasicAdviceAsync(1);
        var accepted = await svc.AcceptAdviceAsync(advice.AdviceId);
        Assert.Equal("Accepted", accepted!.Status);
        Assert.NotNull(accepted.LinkedTaskId);
        var task = await db.Tasks.FirstOrDefaultAsync(t => t.TaskId == accepted.LinkedTaskId);
        Assert.NotNull(task);
        Assert.Equal(advice.AdviceId, task!.SourceAdviceId);
        Assert.Equal("Advice", task.SourceType);
    }
}
