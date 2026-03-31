using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class PropertiesControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public PropertiesControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    private record CreatePropertyRequest(
        int UserId,
        string PropertyName,
        string? PropertyType = "primary",
        string? Occupancy = "owner",
        decimal EstimatedValue = 500000m,
        decimal? MortgageBalance = null,
        decimal? MonthlyMortgagePayment = null,
        decimal? MonthlyRentalIncome = null,
        decimal? MonthlyExpenses = null,
        bool HasHeloc = false,
        decimal? InterestRate = null,
        int? MortgageTerm = null,
        string? Lienholder = null,
        decimal? MonthlyPropertyTax = null,
        decimal? MonthlyInsurance = null,
        string? Purpose = null,
        string? Street = null,
        string? City = null,
        string? State = null,
        string? PostalCode = null
    );

    private record UpdatePropertyRequest(
        string? PropertyName = null,
        string? PropertyType = null,
        decimal? EstimatedValue = null,
        decimal? MortgageBalance = null,
        decimal? InterestRate = null,
        int? MortgageTerm = null,
        string? Lienholder = null,
        decimal? MonthlyPropertyTax = null,
        decimal? MonthlyInsurance = null,
        string? Purpose = null,
        string? Street = null,
        string? City = null,
        string? State = null,
        string? PostalCode = null
    );

    private record PropertyDto(
        Guid PropertyId,
        string PropertyName,
        string PropertyType,
        decimal EstimatedValue,
        decimal? MortgageBalance,
        decimal Equity,
        string? Address,
        string Source,
        bool IsPlaidLinked,
        string? ValuationSource,
        bool AutoValuationEnabled,
        bool AddressValidated
    );

    private record PropertyDetailDto(
        Guid PropertyId,
        string PropertyName,
        string PropertyType,
        decimal EstimatedValue,
        decimal? MortgageBalance,
        decimal Equity,
        string? Street,
        string? City,
        string? State,
        string? PostalCode,
        decimal? InterestRate,
        int? MortgageTerm,
        string? Lienholder,
        decimal? MonthlyPropertyTax,
        decimal? MonthlyInsurance,
        string? Purpose,
        string? ValuationSource,
        decimal? ValuationConfidence,
        decimal? ValuationLow,
        decimal? ValuationHigh,
        bool AutoValuationEnabled,
        bool AddressValidated
    );

    private record AddressValidationRequest(
        string Street,
        string City,
        string State,
        string Zip
    );

    private record AddressValidationResponse(
        bool IsValid,
        string Street,
        string City,
        string State,
        string Zip,
        string? Zip4,
        string? Message
    );

    [Fact]
    public async Task ListProperties_ReturnsOk()
    {
        var client = _factory.CreateClient();
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var resp = await client.GetAsync($"/api/properties?userId={user!.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var properties = await resp.Content.ReadFromJsonAsync<List<PropertyDto>>();
        Assert.NotNull(properties);
    }

    [Fact]
    public async Task CreateProperty_ReturnsCreated()
    {
        var client = _factory.CreateClient();
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var newProperty = new CreatePropertyRequest(
            UserId: user!.UserId,
            PropertyName: "Test Home",
            EstimatedValue: 450000m,
            MortgageBalance: 200000m,
            Street: "123 Test St",
            City: "Springfield",
            State: "VA",
            PostalCode: "22150"
        );

        var resp = await client.PostAsJsonAsync("/api/properties", newProperty);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);

        var created = await resp.Content.ReadFromJsonAsync<PropertyDto>();
        Assert.NotNull(created);
        Assert.Equal("Test Home", created!.PropertyName);
        Assert.Equal(450000m, created.EstimatedValue);
        Assert.Equal(250000m, created.Equity);
    }

    [Fact]
    public async Task GetProperty_ReturnsDetail()
    {
        var client = _factory.CreateClient();
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newProperty = new CreatePropertyRequest(
            UserId: user!.UserId,
            PropertyName: "Detail Test",
            EstimatedValue: 300000m,
            Street: "456 Oak Ave",
            City: "Arlington",
            State: "VA",
            PostalCode: "22201"
        );

        var createResp = await client.PostAsJsonAsync("/api/properties", newProperty);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<PropertyDto>();

        var getResp = await client.GetAsync($"/api/properties/{created!.PropertyId}");
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);

        var detail = await getResp.Content.ReadFromJsonAsync<PropertyDetailDto>();
        Assert.NotNull(detail);
        Assert.Equal("Detail Test", detail!.PropertyName);
        Assert.Equal("456 Oak Ave", detail.Street);
        Assert.Equal("Arlington", detail.City);
    }

    [Fact]
    public async Task UpdateProperty_ReturnsOk()
    {
        var client = _factory.CreateClient();
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newProperty = new CreatePropertyRequest(
            UserId: user!.UserId,
            PropertyName: "Update Test",
            EstimatedValue: 400000m
        );

        var createResp = await client.PostAsJsonAsync("/api/properties", newProperty);
        var created = await createResp.Content.ReadFromJsonAsync<PropertyDto>();

        var updateResp = await client.PutAsJsonAsync(
            $"/api/properties/{created!.PropertyId}",
            new UpdatePropertyRequest(PropertyName: "Updated Name", EstimatedValue: 425000m)
        );
        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);

        var updated = await updateResp.Content.ReadFromJsonAsync<PropertyDto>();
        Assert.NotNull(updated);
        Assert.Equal("Updated Name", updated!.PropertyName);
        Assert.Equal(425000m, updated.EstimatedValue);
    }

    [Fact]
    public async Task DeleteProperty_ReturnsNoContent()
    {
        var client = _factory.CreateClient();
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newProperty = new CreatePropertyRequest(
            UserId: user!.UserId,
            PropertyName: "Delete Test",
            EstimatedValue: 350000m
        );

        var createResp = await client.PostAsJsonAsync("/api/properties", newProperty);
        var created = await createResp.Content.ReadFromJsonAsync<PropertyDto>();

        var deleteResp = await client.DeleteAsync($"/api/properties/{created!.PropertyId}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);

        // Verify gone
        var getResp = await client.GetAsync($"/api/properties/{created.PropertyId}");
        Assert.Equal(HttpStatusCode.NotFound, getResp.StatusCode);
    }

    [Fact]
    public async Task GetProperty_NotFound_Returns404()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/properties/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task ValidateAddress_ReturnsResult()
    {
        var client = _factory.CreateClient();

        var request = new AddressValidationRequest(
            Street: "1600 Pennsylvania Ave NW",
            City: "Washington",
            State: "DC",
            Zip: "20500"
        );

        var resp = await client.PostAsJsonAsync("/api/properties/validate-address", request);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var result = await resp.Content.ReadFromJsonAsync<AddressValidationResponse>();
        Assert.NotNull(result);
        // With no USPS key configured, pass-through returns the address as valid
        Assert.True(result!.IsValid);
    }

    [Fact]
    public async Task RefreshValuation_NotFound_Returns404()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsync($"/api/properties/{Guid.NewGuid()}/refresh-valuation", null);
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task GetPropertyHistory_ReturnsEmpty()
    {
        var client = _factory.CreateClient();
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newProperty = new CreatePropertyRequest(
            UserId: user!.UserId,
            PropertyName: "History Test",
            EstimatedValue: 500000m
        );

        var createResp = await client.PostAsJsonAsync("/api/properties", newProperty);
        var created = await createResp.Content.ReadFromJsonAsync<PropertyDto>();

        var historyResp = await client.GetAsync($"/api/properties/{created!.PropertyId}/history");
        Assert.Equal(HttpStatusCode.OK, historyResp.StatusCode);
    }

    [Fact]
    public async Task CreateProperty_IncludesValuationFields()
    {
        var client = _factory.CreateClient();
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newProperty = new CreatePropertyRequest(
            UserId: user!.UserId,
            PropertyName: "Valuation Fields Test",
            EstimatedValue: 600000m,
            Street: "789 Elm Rd",
            City: "Fairfax",
            State: "VA",
            PostalCode: "22030"
        );

        var createResp = await client.PostAsJsonAsync("/api/properties", newProperty);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);

        var created = await createResp.Content.ReadFromJsonAsync<PropertyDto>();
        Assert.NotNull(created);
        Assert.True(created!.AutoValuationEnabled);
        Assert.Null(created.ValuationSource);
    }

    [Fact]
    public async Task CreateProperty_WithMortgageDetails_Persists()
    {
        var client = _factory.CreateClient();
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newProperty = new CreatePropertyRequest(
            UserId: user!.UserId,
            PropertyName: "Mortgage Details Test",
            EstimatedValue: 550000m,
            MortgageBalance: 400000m,
            MonthlyMortgagePayment: 2200m,
            InterestRate: 6.875m,
            MortgageTerm: 30,
            Lienholder: "Wells Fargo",
            MonthlyPropertyTax: 350m,
            MonthlyInsurance: 150m,
            Purpose: "Primary home, plan to refinance when rates drop",
            Street: "100 Finance Way",
            City: "Arlington",
            State: "VA",
            PostalCode: "22201"
        );

        var createResp = await client.PostAsJsonAsync("/api/properties", newProperty);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);

        var created = await createResp.Content.ReadFromJsonAsync<PropertyDto>();
        Assert.NotNull(created);

        // Retrieve detail to verify new fields persisted
        var getResp = await client.GetAsync($"/api/properties/{created!.PropertyId}");
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);

        var detail = await getResp.Content.ReadFromJsonAsync<PropertyDetailDto>();
        Assert.NotNull(detail);
        Assert.Equal(6.875m, detail!.InterestRate);
        Assert.Equal(30, detail.MortgageTerm);
        Assert.Equal("Wells Fargo", detail.Lienholder);
        Assert.Equal(350m, detail.MonthlyPropertyTax);
        Assert.Equal(150m, detail.MonthlyInsurance);
        Assert.Equal("Primary home, plan to refinance when rates drop", detail.Purpose);
    }
}
