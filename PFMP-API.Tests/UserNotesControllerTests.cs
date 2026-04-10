using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class UserNotesControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public UserNotesControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    private record NoteDto(
        int UserNoteId,
        string EntityType,
        string EntityId,
        string Content,
        bool IsPinned,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    private record CreateNoteRequest(
        int UserId,
        string EntityType,
        string EntityId,
        string Content,
        bool IsPinned
    );

    private record UpdateNoteRequest(
        string? Content,
        bool? IsPinned
    );

    [Fact]
    public async Task CreateNote_ReturnsCreated()
    {
        var client = _factory.CreateClient();
        var userResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var request = new CreateNoteRequest(user!.UserId, "account", "42", "Remember to check fees", false);
        var resp = await client.PostAsJsonAsync("/api/UserNotes", request, TestJsonOptions.Default);

        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        var note = await resp.Content.ReadFromJsonAsync<NoteDto>(TestJsonOptions.Default);
        Assert.NotNull(note);
        Assert.Equal("Remember to check fees", note!.Content);
        Assert.Equal("account", note.EntityType);
        Assert.Equal("42", note.EntityId);
        Assert.False(note.IsPinned);
    }

    [Fact]
    public async Task GetNotesForEntity_ReturnsOnlyMatchingNotes()
    {
        var client = _factory.CreateClient();
        var userResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        // Create notes on two different entities
        await client.PostAsJsonAsync("/api/UserNotes",
            new CreateNoteRequest(user!.UserId, "account", "1", "Note on account 1", false), TestJsonOptions.Default);
        await client.PostAsJsonAsync("/api/UserNotes",
            new CreateNoteRequest(user.UserId, "account", "2", "Note on account 2", false), TestJsonOptions.Default);
        await client.PostAsJsonAsync("/api/UserNotes",
            new CreateNoteRequest(user.UserId, "goal", "1", "Note on goal", false), TestJsonOptions.Default);

        var resp = await client.GetAsync($"/api/UserNotes/entity/account/1?userId={user.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var notes = await resp.Content.ReadFromJsonAsync<NoteDto[]>(TestJsonOptions.Default);
        Assert.NotNull(notes);
        Assert.Single(notes!);
        Assert.Equal("Note on account 1", notes[0].Content);
    }

    [Fact]
    public async Task GetAllUserNotes_ReturnsAllNotes()
    {
        var client = _factory.CreateClient();
        var userResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        await client.PostAsJsonAsync("/api/UserNotes",
            new CreateNoteRequest(user!.UserId, "account", "1", "First note", false), TestJsonOptions.Default);
        await client.PostAsJsonAsync("/api/UserNotes",
            new CreateNoteRequest(user.UserId, "goal", "5", "Second note", true), TestJsonOptions.Default);

        var resp = await client.GetAsync($"/api/UserNotes/user/{user.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var notes = await resp.Content.ReadFromJsonAsync<NoteDto[]>(TestJsonOptions.Default);
        Assert.NotNull(notes);
        Assert.Equal(2, notes!.Length);
        // Pinned note should come first
        Assert.True(notes[0].IsPinned);
    }

    [Fact]
    public async Task UpdateNote_UpdatesContentAndPin()
    {
        var client = _factory.CreateClient();
        var userResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var createResp = await client.PostAsJsonAsync("/api/UserNotes",
            new CreateNoteRequest(user!.UserId, "property", "7", "Original content", false), TestJsonOptions.Default);
        var created = await createResp.Content.ReadFromJsonAsync<NoteDto>(TestJsonOptions.Default);
        Assert.NotNull(created);

        var updateResp = await client.PutAsJsonAsync($"/api/UserNotes/{created!.UserNoteId}",
            new UpdateNoteRequest("Updated content", true), TestJsonOptions.Default);
        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);
        var updated = await updateResp.Content.ReadFromJsonAsync<NoteDto>(TestJsonOptions.Default);
        Assert.NotNull(updated);
        Assert.Equal("Updated content", updated!.Content);
        Assert.True(updated.IsPinned);
    }

    [Fact]
    public async Task DeleteNote_ReturnsNoContent()
    {
        var client = _factory.CreateClient();
        var userResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var createResp = await client.PostAsJsonAsync("/api/UserNotes",
            new CreateNoteRequest(user!.UserId, "liability", "3", "To delete", false), TestJsonOptions.Default);
        var created = await createResp.Content.ReadFromJsonAsync<NoteDto>(TestJsonOptions.Default);
        Assert.NotNull(created);

        var deleteResp = await client.DeleteAsync($"/api/UserNotes/{created!.UserNoteId}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);

        // Verify it's gone
        var getResp = await client.GetAsync($"/api/UserNotes/entity/liability/3?userId={user.UserId}");
        var notes = await getResp.Content.ReadFromJsonAsync<NoteDto[]>(TestJsonOptions.Default);
        Assert.NotNull(notes);
        Assert.Empty(notes!);
    }

    [Fact]
    public async Task CreateNote_InvalidUser_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        var request = new CreateNoteRequest(99999, "account", "1", "Should fail", false);
        var resp = await client.PostAsJsonAsync("/api/UserNotes", request, TestJsonOptions.Default);
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task CreateNote_EmptyContent_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        var userResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var request = new CreateNoteRequest(user!.UserId, "account", "1", "   ", false);
        var resp = await client.PostAsJsonAsync("/api/UserNotes", request, TestJsonOptions.Default);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task UpdateNote_NotFound_Returns404()
    {
        var client = _factory.CreateClient();
        var resp = await client.PutAsJsonAsync("/api/UserNotes/99999",
            new UpdateNoteRequest("Should fail", null), TestJsonOptions.Default);
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task DeleteNote_NotFound_Returns404()
    {
        var client = _factory.CreateClient();
        var resp = await client.DeleteAsync("/api/UserNotes/99999");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }
}
