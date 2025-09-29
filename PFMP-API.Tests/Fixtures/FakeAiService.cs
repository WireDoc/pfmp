using PFMP_API.Services;
using PFMP_API.Models;

namespace PFMP_API.Tests.Fixtures;

/// <summary>
/// Deterministic test double for IAIService. Returns predictable data for unit tests.
/// Only the methods actually used by current tests need semantic meaning; others return minimal placeholders.
/// </summary>
public class FakeAiService : IAIService
{
    private readonly string _text;
    public FakeAiService(string text = "Test AI Analysis") => _text = text;

    public Task<List<CreateTaskRequest>> GenerateTaskRecommendationsAsync(int userId)
        => Task.FromResult(new List<CreateTaskRequest>());

    public Task<TaskPriority> RecommendTaskPriorityAsync(CreateTaskRequest task)
        => Task.FromResult(TaskPriority.Medium);

    public Task<TaskType> CategorizeTaskAsync(string title, string description)
        => Task.FromResult(TaskType.Rebalancing);

    public Task<string> AnalyzePortfolioAsync(int userId)
        => Task.FromResult(_text + $" for user {userId}");

    public Task<List<Alert>> GenerateMarketAlertsAsync(int userId)
        => Task.FromResult(new List<Alert>());

    public Task<string> ExplainRecommendationAsync(string recommendation)
        => Task.FromResult("Explanation: " + recommendation);
}
