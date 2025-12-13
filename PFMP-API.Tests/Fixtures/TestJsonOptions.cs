using System.Text.Json;
using System.Text.Json.Serialization;

namespace PFMP_API.Tests.Fixtures;

/// <summary>
/// Shared JSON serializer options matching the API configuration
/// </summary>
public static class TestJsonOptions
{
    /// <summary>
    /// JSON options that match the API's configuration (enums as strings)
    /// </summary>
    public static JsonSerializerOptions Default { get; } = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };
}
