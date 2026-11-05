namespace AngularApiTemplate.Api.IntegrationTests.Tasks;

[Collection("Tasks SQL Server")]
public sealed class TasksHttpTests(TasksSqlFixture fixture)
{
    [Fact]
    public async Task Crud_lifecycle_has_explicit_contracts_location_and_persisted_replacements()
    {
        using var client = fixture.Factory.CreateClient();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        using var created = await client.PostAsJsonAsync("/tasks", new
        {
            title = "  First task  ",
            description = "Initial description"
        }, timeout.Token);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var item = (await created.Content.ReadFromJsonAsync<TaskResponse>(timeout.Token))!;
        Assert.Equal("First task", item.Title);
        Assert.False(item.IsCompleted);
        Assert.NotEqual(Guid.Empty, item.Id);
        Assert.Equal($"/tasks/{item.Id}", created.Headers.Location!.AbsolutePath);
        using var json = JsonDocument.Parse(await created.Content.ReadAsStringAsync(timeout.Token));
        Assert.Equal(new[] { "description", "id", "isCompleted", "title" },
            json.RootElement.EnumerateObject().Select(property => property.Name).Order().ToArray());

        using var fetched = await client.GetAsync(created.Headers.Location, timeout.Token);
        Assert.Equal(HttpStatusCode.OK, fetched.StatusCode);
        AssertTaskFields(item, await fetched.Content.ReadFromJsonAsync<TaskResponse>(timeout.Token));
        await using (var context = fixture.CreateContext())
        {
            Assert.Equal("First task", (await context.Tasks.AsNoTracking()
                .SingleAsync(task => task.Id == item.Id, timeout.Token)).Title);
        }

        using var replaced = await client.PutAsJsonAsync($"/tasks/{item.Id}", new
        {
            title = "  Replaced  ",
            description = (string?)null,
            isCompleted = true
        }, timeout.Token);
        Assert.Equal(HttpStatusCode.OK, replaced.StatusCode);
        var updated = (await replaced.Content.ReadFromJsonAsync<TaskResponse>(timeout.Token))!;
        Assert.Equal(item.Id, updated.Id);
        Assert.Equal("Replaced", updated.Title);
        Assert.Null(updated.Description);
        Assert.True(updated.IsCompleted);
        AssertTaskFields(updated, await client.GetFromJsonAsync<TaskResponse>($"/tasks/{item.Id}", timeout.Token));
        await using (var context = fixture.CreateContext())
        {
            var persisted = await context.Tasks.AsNoTracking().SingleAsync(task => task.Id == item.Id, timeout.Token);
            Assert.Equal("Replaced", persisted.Title);
            Assert.Null(persisted.Description);
            Assert.True(persisted.IsCompleted);
        }

        using var deleted = await client.DeleteAsync($"/tasks/{item.Id}", timeout.Token);
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Empty(await deleted.Content.ReadAsByteArrayAsync(timeout.Token));
        using var afterDelete = await client.GetAsync($"/tasks/{item.Id}", timeout.Token);
        Assert.Equal(HttpStatusCode.NotFound, afterDelete.StatusCode);
        await using var finalContext = fixture.CreateContext();
        Assert.False(await finalContext.Tasks.AnyAsync(task => task.Id == item.Id, timeout.Token));
    }

    [Fact]
    public async Task Missing_records_return_not_found_for_get_put_and_delete()
    {
        using var client = fixture.Factory.CreateClient();
        var route = $"/tasks/{Guid.NewGuid()}";
        using var get = await client.GetAsync(route);
        using var put = await client.PutAsJsonAsync(route, new
        {
            title = "Missing",
            description = (string?)null,
            isCompleted = false
        });
        using var delete = await client.DeleteAsync(route);
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, put.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
    }

    public static IEnumerable<object[]> InvalidRequests()
    {
        yield return ["POST", "{}"];
        yield return ["POST", "{\"title\":null}"];
        yield return ["POST", "{\"title\":\"   \"}"];
        yield return ["POST", JsonSerializer.Serialize(new { title = new string('t', 201) })];
        yield return ["POST", JsonSerializer.Serialize(new { title = "Valid", description = new string('d', 2001) })];
        yield return ["PUT", "{\"title\":\"Valid\",\"description\":null}"];
        yield return ["PUT", "{\"title\":\"Valid\",\"isCompleted\":false}"];
        yield return ["PUT", "{\"description\":null,\"isCompleted\":false}"];
        yield return ["PUT", "{\"title\":\"Valid\",\"description\":null,\"isCompleted\":null}"];
        yield return ["PUT", JsonSerializer.Serialize(new { title = new string('t', 201), description = "", isCompleted = false })];
        yield return ["PUT", JsonSerializer.Serialize(new { title = "Valid", description = new string('d', 2001), isCompleted = false })];
    }

    [Theory]
    [MemberData(nameof(InvalidRequests))]
    public async Task Invalid_input_returns_validation_problem_details_without_writes(string method, string json)
    {
        using var client = fixture.Factory.CreateClient();
        using var existing = await client.PostAsJsonAsync("/tasks", new { title = "Unchanged", description = "Keep" });
        var item = (await existing.Content.ReadFromJsonAsync<TaskResponse>())!;
        await using var context = fixture.CreateContext();
        var before = await context.Tasks.CountAsync();
        using var request = new HttpRequestMessage(new HttpMethod(method), method == "POST" ? "/tasks" : $"/tasks/{item.Id}")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(400, problem.RootElement.GetProperty("status").GetInt32());
        Assert.NotEmpty(problem.RootElement.GetProperty("errors").EnumerateObject());
        Assert.Equal(before, await context.Tasks.CountAsync());
        AssertTaskFields(item, await client.GetFromJsonAsync<TaskResponse>($"/tasks/{item.Id}"));
    }

    [Fact]
    public async Task Boundary_lengths_are_accepted_and_post_description_can_be_omitted()
    {
        using var client = fixture.Factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/tasks", new
        {
            title = " " + new string('t', 200) + " ",
            description = new string('d', 2000)
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = (await response.Content.ReadFromJsonAsync<TaskResponse>())!;
        Assert.Equal(200, item.Title.Length);
        Assert.Equal(2000, item.Description!.Length);
        using var minimal = await client.PostAsJsonAsync("/tasks", new { title = "Minimal" });
        Assert.Equal(HttpStatusCode.Created, minimal.StatusCode);
        Assert.Null((await minimal.Content.ReadFromJsonAsync<TaskResponse>())!.Description);
    }

    [Theory]
    [InlineData("GET")]
    [InlineData("PUT")]
    [InlineData("DELETE")]
    public async Task Malformed_route_ids_return_validation_problem_details(string method)
    {
        using var client = fixture.Factory.CreateClient();
        using var request = new HttpRequestMessage(new HttpMethod(method), "/tasks/not-a-guid");
        if (method == "PUT")
        {
            request.Content = JsonContent.Create(new { title = "Valid", description = (string?)null, isCompleted = false });
        }

        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task Collection_get_returns_an_array_of_explicit_task_responses()
    {
        using var client = fixture.Factory.CreateClient();
        using var created = await client.PostAsJsonAsync("/tasks", new { title = "Listed task", description = "Visible in collection" });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var expected = (await created.Content.ReadFromJsonAsync<TaskResponse>())!;
        using var response = await client.GetAsync("/tasks");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var tasks = (await response.Content.ReadFromJsonAsync<TaskResponse[]>())!;
        AssertTaskFields(expected, Assert.Single(tasks, task => task.Id == expected.Id));
        Assert.All(tasks, task => Assert.NotEqual(Guid.Empty, task.Id));
        using var deleted = await client.DeleteAsync($"/tasks/{expected.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        var afterDelete = (await client.GetFromJsonAsync<TaskResponse[]>("/tasks"))!;
        Assert.DoesNotContain(afterDelete, task => task.Id == expected.Id);
    }
    private static void AssertTaskFields(TaskResponse expected, TaskResponse? actual)
    {
        Assert.NotNull(actual);
        Assert.Equal(expected.Id, actual.Id);
        Assert.Equal(expected.Title, actual.Title);
        Assert.Equal(expected.Description, actual.Description);
        Assert.Equal(expected.IsCompleted, actual.IsCompleted);
    }
}
