namespace AngularApiTemplate.Api.IntegrationTests;

public sealed class CorsTests
{
    [Theory]
    [InlineData("http://localhost:4200", true)]
    [InlineData("http://localhost:5200", false)]
    [InlineData("https://untrusted.example", false)]
    public async Task Preflight_allows_only_configured_portal_origin(string origin, bool allowed)
    {
        await using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder => builder.UseEnvironment("Development")
                .UseSetting("ConnectionStrings:ApplicationDatabase",
                    "Server=localhost;Database=CorsTests;Integrated Security=True"));
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Options, "/tasks");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "POST");
        request.Headers.Add("Access-Control-Request-Headers", "content-type");
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(allowed, response.Headers.Contains("Access-Control-Allow-Origin"));
        if (allowed)
        {
            Assert.Equal(origin, Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
        }
    }
}
