namespace AngularApiTemplate.Infrastructure.IntegrationTests;

public sealed class ConfigurationTests
{
    [Theory]
    [InlineData("")]
    [InlineData("ab")]
    [InlineData("https://example.vault.azure.net/")]
    [InlineData("invalid--name")]
    [InlineData("invalid-name-")]
    public void Invalid_vault_name_fails_without_echoing_its_value(string name)
    {
        var builder = CreateBuilder("Development");
        builder.Configuration["KeyVault:Name"] = name;
        var exception = Assert.Throws<InvalidOperationException>(() => builder.AddTemplateConfiguration([]));
        Assert.StartsWith("KeyVault:Name must be a valid Azure Key Vault name", exception.Message);
        Assert.Null(exception.InnerException);
    }

    [Fact]
    public async Task Missing_required_options_fail_when_the_host_starts()
    {
        var builder = CreateBuilder("Development");
        builder.Configuration["ConnectionStrings:ApplicationDatabase"] =
            "Server=localhost;Database=ConfigurationTests;Integrated Security=True";
        builder.Services.AddInfrastructure(builder.Configuration);
        using var host = builder.Build();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));

        var exception = await Assert.ThrowsAsync<OptionsValidationException>(
            () => host.StartAsync(timeout.Token));
        Assert.Contains("Foundation:ServiceName is required.", exception.Failures);
    }

    [Fact]
    public async Task Local_host_starts_with_valid_settings_and_no_vault()
    {
        var builder = CreateBuilder("Development");
        builder.Configuration["Foundation:ServiceName"] = "ConfigurationTests";
        builder.Configuration["ConnectionStrings:ApplicationDatabase"] =
            "Server=localhost;Database=ConfigurationTests;Integrated Security=True";
        builder.Services.AddInfrastructure(builder.Configuration);
        using var host = builder.Build();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        await host.StartAsync(timeout.Token);
        await host.StopAsync(timeout.Token);
    }

    private static HostApplicationBuilder CreateBuilder(string environment) => new(new HostApplicationBuilderSettings
    {
        DisableDefaults = true,
        EnvironmentName = environment
    });
}
