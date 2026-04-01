using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PFMP_API.Services.AI;
using Xunit;

namespace PFMP_API.Tests.Services;

public class OpenRouterServiceTests
{
    private static OpenRouterOptions DefaultOptions => new()
    {
        ApiKey = "test-key-123",
        BaseUrl = "https://openrouter.ai/api/v1/chat/completions",
        PrimaryModel = "google/gemini-3.1-pro-preview",
        VerifierModel = "anthropic/claude-sonnet-4.6",
        ChatModel = "google/gemini-3.1-pro-preview",
        MaxTokens = 4000,
        Temperature = 0.3m,
        TimeoutSeconds = 120,
        MaxRetries = 2
    };

    private static IHttpClientFactory CreateMockFactory(HttpMessageHandler handler)
    {
        var factory = new TestHttpClientFactory(handler);
        return factory;
    }

    // ────────── Role & Model Resolution ──────────

    [Fact]
    public void PrimaryRole_ResolvesToPrimaryModel()
    {
        var svc = CreateService("Primary");
        Assert.Equal("Primary", svc.ServiceName);
        Assert.Equal("google/gemini-3.1-pro-preview", svc.ModelVersion);
    }

    [Fact]
    public void VerifierRole_ResolvesToVerifierModel()
    {
        var svc = CreateService("Verifier");
        Assert.Equal("Verifier", svc.ServiceName);
        Assert.Equal("anthropic/claude-sonnet-4.6", svc.ModelVersion);
    }

    [Fact]
    public void UnknownRole_FallsToPrimaryModel()
    {
        var svc = CreateService("Unknown");
        Assert.Equal("Unknown", svc.ServiceName);
        Assert.Equal("google/gemini-3.1-pro-preview", svc.ModelVersion);
    }

    // ────────── GetRecommendationAsync ──────────

    [Fact]
    public async Task GetRecommendation_SendsCorrectPayload()
    {
        string? capturedBody = null;
        var handler = new FakeHttpHandler((req, ct) =>
        {
            capturedBody = req.Content!.ReadAsStringAsync(ct).Result;
            return Task.FromResult(SuccessResponse("Test recommendation text", "google/gemini-3.1-pro-preview"));
        });

        var svc = CreateService("Primary", handler);
        var result = await svc.GetRecommendationAsync(new AIPromptRequest
        {
            SystemPrompt = "You are a financial advisor.",
            UserPrompt = "Analyze my portfolio",
            CacheableContext = "User has 3 accounts"
        });

        Assert.NotNull(capturedBody);
        Assert.Contains("google/gemini-3.1-pro-preview", capturedBody);
        Assert.Contains("You are a financial advisor.", capturedBody);
        Assert.Contains("Analyze my portfolio", capturedBody);
    }

    [Fact]
    public async Task GetRecommendation_ParsesResponseCorrectly()
    {
        var handler = new FakeHttpHandler((_, _) =>
            Task.FromResult(SuccessResponse("Rebalance your TSP to 60/20/20 C/S/I funds.", "google/gemini-3.1-pro-preview", 500, 150)));

        var svc = CreateService("Primary", handler);
        var result = await svc.GetRecommendationAsync(new AIPromptRequest
        {
            UserPrompt = "Analyze my TSP allocation"
        });

        Assert.Equal("Rebalance your TSP to 60/20/20 C/S/I funds.", result.RecommendationText);
        Assert.True(result.TokensUsed > 0);
    }

    [Fact]
    public async Task GetRecommendation_IncludesCacheableContextInUserMessage()
    {
        string? capturedBody = null;
        var handler = new FakeHttpHandler((req, ct) =>
        {
            capturedBody = req.Content!.ReadAsStringAsync(ct).Result;
            return Task.FromResult(SuccessResponse("OK", "google/gemini-3.1-pro-preview"));
        });

        var svc = CreateService("Primary", handler);
        await svc.GetRecommendationAsync(new AIPromptRequest
        {
            UserPrompt = "Question here",
            CacheableContext = "=== FINANCIAL PROFILE ===\nCash: $50,000"
        });

        Assert.NotNull(capturedBody);
        // The user message should contain both context and question
        Assert.Contains("FINANCIAL PROFILE", capturedBody);
        Assert.Contains("Question here", capturedBody);
    }

    [Fact]
    public async Task GetRecommendation_SetsAuthorizationHeader()
    {
        string? authHeader = null;
        var handler = new FakeHttpHandler((req, _) =>
        {
            authHeader = req.Headers.Authorization?.ToString();
            return Task.FromResult(SuccessResponse("OK", "test-model"));
        });

        var svc = CreateService("Primary", handler);
        await svc.GetRecommendationAsync(new AIPromptRequest { UserPrompt = "test" });

        Assert.Equal("Bearer test-key-123", authHeader);
    }

    // ────────── Error Handling ──────────

    [Fact]
    public async Task GetRecommendation_ThrowsOnApiError()
    {
        var handler = new FakeHttpHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError)
            {
                Content = new StringContent("{\"error\":{\"message\":\"Model overloaded\"}}")
            }));

        var options = DefaultOptions;
        options.MaxRetries = 1; // Minimize retries for test speed
        var svc = CreateService("Primary", handler, options);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.GetRecommendationAsync(new AIPromptRequest { UserPrompt = "test" }));
    }

    // ────────── Config Binding ──────────

    [Fact]
    public void OpenRouterOptions_DefaultValues_AreReasonable()
    {
        var opts = new OpenRouterOptions();
        Assert.Equal(4000, opts.MaxTokens);
        Assert.Equal(0.3m, opts.Temperature);
        Assert.Equal(120, opts.TimeoutSeconds);
        Assert.Equal(3, opts.MaxRetries);
        Assert.Equal("PFMP", opts.SiteName);
    }

    // ────────── Helpers ──────────

    private static OpenRouterService CreateService(string role, HttpMessageHandler? handler = null, OpenRouterOptions? options = null)
    {
        var opts = options ?? DefaultOptions;
        handler ??= new FakeHttpHandler((_, _) => Task.FromResult(SuccessResponse("Default", "test-model")));
        var factory = CreateMockFactory(handler);
        return new OpenRouterService(factory, Options.Create(opts), NullLogger<OpenRouterService>.Instance, role);
    }

    private static HttpResponseMessage SuccessResponse(string content, string model, int promptTokens = 200, int completionTokens = 100)
    {
        var body = JsonSerializer.Serialize(new
        {
            id = "gen-test-123",
            model,
            choices = new[]
            {
                new { message = new { role = "assistant", content }, finish_reason = "stop" }
            },
            usage = new
            {
                prompt_tokens = promptTokens,
                completion_tokens = completionTokens,
                total_tokens = promptTokens + completionTokens
            }
        });

        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
    }
}

/// <summary>
/// Minimal IHttpClientFactory for tests (returns HttpClient backed by the given handler).
/// </summary>
file class TestHttpClientFactory : IHttpClientFactory
{
    private readonly HttpMessageHandler _handler;
    public TestHttpClientFactory(HttpMessageHandler handler) => _handler = handler;

    public HttpClient CreateClient(string name)
    {
        var client = new HttpClient(_handler, disposeHandler: false);
        client.BaseAddress = new Uri("https://openrouter.ai/api/v1/");
        return client;
    }
}

/// <summary>
/// Programmable HttpMessageHandler for intercepting/mocking HTTP calls.
/// </summary>
file class FakeHttpHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _handler;
    public FakeHttpHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handler) => _handler = handler;

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        => _handler(request, cancellationToken);
}
