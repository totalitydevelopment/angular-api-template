namespace AngularApiTemplate.Api.IntegrationTests;

public sealed class HealthTests
{
    [Fact]
    public async Task Health_endpoint_returns_only_a_liveness_status()
    {
        await using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder => builder.UseEnvironment("Testing")
                .UseSetting("ConnectionStrings:ApplicationDatabase",
                    "Server=localhost;Database=HealthTests;Integrated Security=True"));
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        using var response = await client.GetAsync("/health", timeout.Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync(timeout.Token));
    }
}
